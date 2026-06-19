/**
 * [인증 라우터 — /auth]
 *
 * CHZZK OAuth 2.0 인증 코드 흐름(Authorization Code Flow):
 *
 *   1. 렌더러: electronAPI.openOAuthWindow(authUrl) 호출
 *   2. 팝업 창에서 CHZZK 로그인 완료
 *   3. CHZZK → localhost:3001/auth/callback 으로 리디렉션 (code, state 포함)
 *   4. Electron 메인이 code를 감지 → 렌더러로 전달
 *   5. 렌더러: POST /auth/token 으로 code 교환 요청
 *   6. 이 라우터: CHZZK 토큰 서버에 code → accessToken 교환
 *   7. accessToken을 safeStorage로 암호화 저장
 *   8. CHZZK WebSocket 세션 + 폴링 서비스 시작
 *
 * 보안:
 *   - clientId, clientSecret은 safeStorage(OS 암호화) 사용
 *   - accessToken, refreshToken도 동일하게 암호화 저장
 *   - GET /credentials 응답에 clientSecret 미포함
 */

import { Router } from 'express'
import axios from 'axios'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { getMyChannel, getChannelInfo } from '../services/chzzkApi'
import { initChzzkSession, stopChzzkSession, initPollService, stopPollService } from '../index'

const router = Router()
const store = new Store()

const CHZZK_TOKEN_URL = 'https://chzzk.naver.com/auth/v1/token'

// ─── safeStorage 헬퍼 ──────────────────────────────────────────────────────────
// 메인 프로세스와 서버 모두에서 동일한 키로 저장/조회하기 위해 함수로 통일

function secureSet(key: string, value: string) {
  try {
    const enc = safeStorage.encryptString(value)
    store.set(`secure_${key}`, enc.toString('base64'))
  } catch {
    // safeStorage 미지원 환경 폴백
    store.set(`secure_${key}_plain`, value)
  }
}

function secureGet(key: string): string | null {
  try {
    const b64 = store.get(`secure_${key}`) as string | undefined
    if (!b64) return store.get(`secure_${key}_plain`) as string | null ?? null
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

function secureDel(key: string) {
  store.delete(`secure_${key}` as never)
  store.delete(`secure_${key}_plain` as never)
}

// ─── 라우트 ────────────────────────────────────────────────────────────────────

// OAuth 콜백 엔드포인트 — 팝업 창을 닫는 스크립트만 반환
// 실제 code 처리는 Electron 메인의 will-redirect 이벤트가 담당
router.get('/callback', (_req, res) => {
  res.send('<script>window.close()</script>')
})

/**
 * POST /auth/token
 * Authorization Code → AccessToken 교환
 * OnboardingPage 또는 SettingsPage에서 OAuth 완료 후 호출
 */
router.post('/token', async (req, res) => {
  const { code, state } = req.body as { code: string; state: string }
  const clientId = secureGet('clientId')
  const clientSecret = secureGet('clientSecret')

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId/clientSecret not set' })
  }

  // ── 1단계: CHZZK 토큰 서버에서 access_token 획득 ──────────────────────────
  let access_token: string
  let refresh_token: string
  let expires_in: number

  try {
    console.log('[Auth] Token request params:', { code: code?.slice(0, 20) + '...', state, clientId: clientId?.slice(0, 8) + '...' })

    // CHZZK API 문서 기준: camelCase JSON, state 필수, redirectUri 불필요
    const tokenRes = await axios.post(CHZZK_TOKEN_URL, {
      grantType: 'authorization_code',
      clientId,
      clientSecret,
      code,
      state,
    }, {
      headers: { 'Content-Type': 'application/json' },
    })

    console.log('[Auth] Token raw response:', JSON.stringify(tokenRes.data))

    // CHZZK 응답이 { content: {...} } 래퍼로 오는 경우와 직접 오는 경우 모두 처리
    const d = tokenRes.data.content ?? tokenRes.data
    access_token = d.access_token ?? d.accessToken
    refresh_token = d.refresh_token ?? d.refreshToken
    expires_in = d.expires_in ?? d.expiresIn ?? 3600

    if (!access_token) {
      console.error('[Auth] access_token not found. Full response:', tokenRes.data)
      return res.status(500).json({ error: 'access_token not found in CHZZK response', raw: tokenRes.data })
    }
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err)
      ? `CHZZK token API ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
      : String(err)
    console.error('[Auth] Token exchange failed:', msg)
    return res.status(500).json({ error: msg })
  }

  // ── 2단계: 토큰 저장 ────────────────────────────────────────────────────────
  secureSet('accessToken', access_token)
  secureSet('refreshToken', refresh_token)
  store.set('tokenExpiresAt', Date.now() + expires_in * 1000)

  // ── 3단계: 유저 정보 조회 (channelId, channelName) ───────────────────────────
  try {
    // users/me 응답: channelId, channelName 만 반환
    const user = await getMyChannel(access_token)
    console.log('[Auth] User info:', JSON.stringify(user))

    store.set('channelId', user.channelId)
    store.set('channelName', user.channelName)

    // 채널 상세 정보(이미지, 팔로워)는 Client 인증으로 별도 조회
    try {
      const ch = await getChannelInfo(clientId, clientSecret, user.channelId)
      store.set('channelImageUrl', ch?.channelImageUrl || '')
      store.set('followerCount', ch?.followerCount || 0)
    } catch {
      store.set('channelImageUrl', '')
      store.set('followerCount', 0)
    }

    initChzzkSession(access_token, user.channelId, clientId, clientSecret)
    initPollService(access_token, user.channelId, clientId, clientSecret)

    return res.json({ ok: true, channelId: user.channelId, channelName: user.channelName })
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.error('[Auth] getMyChannel failed:', {
        code: err.code,
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
      })
    } else {
      console.error('[Auth] getMyChannel failed:', err)
    }
    return res.status(500).json({ error: axios.isAxiosError(err) ? `${err.code}: ${err.message}` : String(err) })
  }
})

/**
 * POST /auth/refresh
 * RefreshToken으로 AccessToken 갱신
 * 토큰 만료 감지 시 자동 호출 (TODO: 인터셉터 구현)
 */
router.post('/refresh', async (_req, res) => {
  try {
    const refreshToken = secureGet('refreshToken')
    const clientId = secureGet('clientId')
    const clientSecret = secureGet('clientSecret')

    if (!refreshToken || !clientId || !clientSecret) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const tokenRes = await axios.post(CHZZK_TOKEN_URL, {
      grantType: 'refresh_token',
      clientId,
      clientSecret,
      refreshToken,
    }, {
      headers: { 'Content-Type': 'application/json' },
    })

    const tokenData2 = tokenRes.data.content ?? tokenRes.data
    const access_token: string = tokenData2.access_token ?? tokenData2.accessToken
    const newRefresh: string | undefined = tokenData2.refresh_token ?? tokenData2.refreshToken
    const expires_in: number = tokenData2.expires_in ?? tokenData2.expiresIn ?? 3600

    secureSet('accessToken', access_token)
    if (newRefresh) secureSet('refreshToken', newRefresh)
    store.set('tokenExpiresAt', Date.now() + expires_in * 1000)

    // 새 토큰으로 세션 재시작
    const channelId = store.get('channelId') as string
    const cId = secureGet('clientId') || ''
    const cSec = secureGet('clientSecret') || ''
    initChzzkSession(access_token, channelId, cId, cSec)
    initPollService(access_token, channelId, cId, cSec)

    return res.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

/**
 * GET /auth/status
 * App.tsx 마운트 시 checkAuth()가 호출해 인증 상태 확인.
 * 인증된 상태면 getChannelInfo로 팔로워 수를 실시간 조회해 반환.
 */
router.get('/status', async (_req, res) => {
  const channelId = store.get('channelId') as string | undefined
  const channelName = store.get('channelName') as string | undefined
  const hasToken = !!secureGet('accessToken')
  const clientId = secureGet('clientId')
  const clientSecret = secureGet('clientSecret')

  // 기본값: 저장된 값 사용
  let channelImageUrl = store.get('channelImageUrl') as string | undefined
  let followerCount = store.get('followerCount') as number | undefined

  // 인증된 상태면 채널 정보 실시간 갱신
  if (hasToken && channelId && clientId && clientSecret) {
    try {
      const ch = await getChannelInfo(clientId, clientSecret, channelId)
      if (ch) {
        channelImageUrl = ch.channelImageUrl || channelImageUrl || ''
        followerCount = ch.followerCount ?? followerCount ?? 0
        store.set('channelImageUrl', channelImageUrl)
        store.set('followerCount', followerCount)
      }
    } catch {
      // API 실패 시 저장된 캐시 값 사용 (앱 동작 유지)
    }
  }

  res.json({
    isAuthenticated: hasToken && !!channelId,
    hasCredentials: !!clientId,
    channelId: channelId || null,
    channelName: channelName || null,
    channelImageUrl: channelImageUrl || null,
    followerCount: followerCount || 0,
  })
})

/**
 * POST /auth/logout
 * 토큰 삭제 + WebSocket/폴링 서비스 종료
 */
router.post('/logout', (_req, res) => {
  stopChzzkSession()
  stopPollService()
  secureDel('accessToken')
  secureDel('refreshToken')
  store.delete('channelId' as never)
  store.delete('channelName' as never)
  store.delete('tokenExpiresAt' as never)
  res.json({ ok: true })
})

/**
 * POST /auth/credentials
 * 온보딩 1단계: CHZZK 개발자 콘솔의 clientId/clientSecret 등록
 * 이후 OAuth 버튼이 활성화됨
 */
router.post('/credentials', (req, res) => {
  const { clientId, clientSecret } = req.body as { clientId: string; clientSecret: string }
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId and clientSecret required' })
  }
  secureSet('clientId', clientId)
  secureSet('clientSecret', clientSecret)
  return res.json({ ok: true })
})

// GET /auth/credentials — clientId만 반환 (clientSecret은 절대 노출하지 않음)
router.get('/credentials', (_req, res) => {
  const clientId = secureGet('clientId')
  res.json({ clientId: clientId || '' })
})

export default router