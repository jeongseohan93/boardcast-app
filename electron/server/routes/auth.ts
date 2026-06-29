import { Router } from 'express'
import axios from 'axios'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { getMyChannel, getChannelInfo, revokeToken } from '../services/chzzkApi'
import { chzzkSession, initChzzkSession, stopChzzkSession, initPollService, stopPollService } from '../index'

const router = Router()
const store = new Store()

const CHZZK_TOKEN_URL = 'https://chzzk.naver.com/auth/v1/token'

type AxiosDetail = {
  status?: number
  data?: unknown
  message: string
}

function secureSet(key: string, value: string) {
  secureDel(key)
  try {
    const enc = safeStorage.encryptString(value)
    store.set(`secure_${key}`, enc.toString('base64'))
  } catch {
    store.set(`secure_${key}_plain`, value)
  }
}

function secureGet(key: string): string | null {
  try {
    const b64 = store.get(`secure_${key}`) as string | undefined
    if (!b64) return store.get(`secure_${key}_plain`) as string | null ?? null
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return store.get(`secure_${key}_plain`) as string | null ?? null
  }
}

function secureDel(key: string) {
  store.delete(`secure_${key}` as never)
  store.delete(`secure_${key}_plain` as never)
}

function axiosDetail(err: unknown): AxiosDetail {
  return axios.isAxiosError(err)
    ? { status: err.response?.status, data: err.response?.data, message: err.message }
    : { message: String(err) }
}

function responseStatus(detail: AxiosDetail) {
  return detail.status && detail.status >= 400 && detail.status < 600 ? detail.status : 500
}

function mask(value: string | null) {
  if (!value) return 'missing'
  if (value.length <= 8) return `${value.slice(0, 2)}***`
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

router.get('/callback', (_req, res) => {
  res.send('<script>window.close()</script>')
})

router.post('/token', async (req, res) => {
  const { code, state } = req.body as { code: string; state: string }
  const clientId = secureGet('clientId')
  const clientSecret = secureGet('clientSecret')

  if (!code || !state) {
    return res.status(400).json({ error: { message: 'code/state required' } })
  }

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId/clientSecret not set' })
  }

  try {
    console.log('[Auth] Token request params:', {
      hasCode: true,
      hasState: true,
      clientId: mask(clientId),
    })

    const tokenRes = await axios.post(CHZZK_TOKEN_URL, {
      grantType: 'authorization_code',
      clientId,
      clientSecret,
      code,
      state,
    }, { headers: { 'Content-Type': 'application/json' } })

    console.log('[Auth] Token raw response:', JSON.stringify(tokenRes.data))
    const d = tokenRes.data.content ?? tokenRes.data
    const accessToken = d.access_token ?? d.accessToken
    const refreshToken = d.refresh_token ?? d.refreshToken
    const expiresIn = d.expires_in ?? d.expiresIn ?? 3600

    if (!accessToken) {
      console.error('[Auth] access_token not found. Full response:', tokenRes.data)
      return res.status(500).json({ error: 'access_token not found in CHZZK response' })
    }

    // getMyChannel 성공 확인 후 저장 — 실패 시 반쪽 인증 상태 방지
    const user = await getMyChannel(accessToken)
    console.log('[Auth] User info:', JSON.stringify(user))

    secureSet('accessToken', accessToken)
    if (refreshToken) secureSet('refreshToken', refreshToken)
    store.set('tokenExpiresAt', Date.now() + expiresIn * 1000)
    store.set('channelId', user.channelId)
    store.set('channelName', user.channelName)

    try {
      const ch = await getChannelInfo(clientId, clientSecret, user.channelId)
      store.set('channelImageUrl', ch?.channelImageUrl || '')
      store.set('followerCount', ch?.followerCount ?? 0)
    } catch (err) {
      console.warn('[Auth] Channel detail fetch failed:', axiosDetail(err))
    }

    initChzzkSession(accessToken, user.channelId, clientId, clientSecret)
    initPollService(accessToken, user.channelId, clientId, clientSecret)

    return res.json({ ok: true, channelId: user.channelId, channelName: user.channelName })
  } catch (err: unknown) {
    const detail = axiosDetail(err)
    console.error('[Auth] Token exchange failed:', detail)
    return res.status(responseStatus(detail)).json({ error: detail })
  }
})

router.post('/refresh', async (_req, res) => {
  const refreshToken = secureGet('refreshToken')
  const clientId = secureGet('clientId')
  const clientSecret = secureGet('clientSecret')

  if (!refreshToken || !clientId || !clientSecret) {
    return res.status(401).json({ error: 'refresh token or credentials missing' })
  }

  try {
    const tokenRes = await axios.post(CHZZK_TOKEN_URL, {
      grantType: 'refresh_token',
      refreshToken,
      clientId,
      clientSecret,
    }, { headers: { 'Content-Type': 'application/json' } })

    const d = tokenRes.data.content ?? tokenRes.data
    const accessToken = d.access_token ?? d.accessToken
    const newRefreshToken = d.refresh_token ?? d.refreshToken
    const expiresIn = d.expires_in ?? d.expiresIn ?? 3600

    if (!accessToken) return res.status(500).json({ error: 'access_token not found', raw: tokenRes.data })

    secureSet('accessToken', accessToken)
    if (newRefreshToken) secureSet('refreshToken', newRefreshToken)
    store.set('tokenExpiresAt', Date.now() + expiresIn * 1000)

    const channelId = store.get('channelId') as string | undefined
    if (channelId) {
      initChzzkSession(accessToken, channelId, clientId, clientSecret)
      initPollService(accessToken, channelId, clientId, clientSecret)
    }

    return res.json({ ok: true })
  } catch (err: unknown) {
    const detail = axiosDetail(err)
    console.error('[Auth] Refresh failed:', detail)
    return res.status(responseStatus(detail)).json({ error: detail })
  }
})

router.get('/status', async (_req, res) => {
  const accessToken = secureGet('accessToken')
  const channelId = store.get('channelId') as string | undefined
  const channelName = store.get('channelName') as string | undefined
  const clientId = secureGet('clientId')
  const clientSecret = secureGet('clientSecret')

  let channelImageUrl = store.get('channelImageUrl') as string | undefined
  let followerCount = store.get('followerCount') as number | undefined

  if (accessToken && channelId && clientId && clientSecret) {
    try {
      const ch = await getChannelInfo(clientId, clientSecret, channelId)
      channelImageUrl = ch?.channelImageUrl || channelImageUrl || ''
      followerCount = ch?.followerCount ?? followerCount ?? 0
      store.set('channelImageUrl', channelImageUrl)
      store.set('followerCount', followerCount)
    } catch {
      // Keep cached values if the API is temporarily unavailable.
    }
  }

  return res.json({
    isAuthenticated: !!accessToken && !!channelId,
    hasCredentials: !!clientId && !!clientSecret,
    channelId: channelId || null,
    channelName: channelName || null,
    channelImageUrl: channelImageUrl || '',
    followerCount: followerCount ?? 0,
  })
})

router.post('/logout', async (_req, res) => {
  const accessToken = secureGet('accessToken')
  const clientId = secureGet('clientId')
  const clientSecret = secureGet('clientSecret')

  stopChzzkSession()
  stopPollService()

  if (accessToken && clientId && clientSecret) {
    try {
      await revokeToken(clientId, clientSecret, accessToken, 'access_token')
    } catch (err) {
      console.warn('[Auth] Token revoke failed (continuing logout):', axiosDetail(err))
    }
  }

  secureDel('accessToken')
  secureDel('refreshToken')
  store.delete('tokenExpiresAt' as never)
  store.delete('channelId' as never)
  store.delete('channelName' as never)
  store.delete('channelImageUrl' as never)
  store.delete('followerCount' as never)
  res.json({ ok: true })
})

router.post('/credentials', (req, res) => {
  const { clientId, clientSecret } = req.body as { clientId: string; clientSecret: string }
  if (!clientId?.trim() || !clientSecret?.trim()) {
    return res.status(400).json({ error: 'clientId/clientSecret required' })
  }

  stopChzzkSession()
  stopPollService()
  secureDel('accessToken')
  secureDel('refreshToken')
  store.delete('tokenExpiresAt' as never)
  store.delete('channelId' as never)
  store.delete('channelName' as never)
  store.delete('channelImageUrl' as never)
  store.delete('followerCount' as never)
  secureSet('clientId', clientId.trim())
  secureSet('clientSecret', clientSecret.trim())
  store.set('credentialsUpdatedAt', Date.now())
  console.log('[Auth] Credentials saved:', { clientId: mask(clientId.trim()) })
  return res.json({ ok: true })
})

router.get('/credentials', (_req, res) => {
  const clientId = secureGet('clientId')
  const credentialsUpdatedAt = store.get('credentialsUpdatedAt') as number | undefined
  res.json({ clientId: clientId || '', credentialsUpdatedAt: credentialsUpdatedAt || null })
})

export default router
