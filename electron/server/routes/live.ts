import { Router } from 'express'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { getLiveSetting, updateLiveSetting, getLiveList } from '../services/chzzkApi'

const router = Router()
const store = new Store()

function getAccessToken(): string | null {
  try {
    const b64 = store.get('secure_accessToken') as string | undefined
    if (!b64) return store.get('secure_accessToken_plain') as string | null ?? null
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

// 라이브 목록 조회 (Client 인증)
router.get('/list', async (req, res) => {
  const b64Id = store.get('secure_clientId') as string | undefined
  const b64Secret = store.get('secure_clientSecret') as string | undefined

  let clientId: string | null = null
  let clientSecret: string | null = null
  try {
    if (b64Id) clientId = safeStorage.decryptString(Buffer.from(b64Id, 'base64'))
    else clientId = store.get('secure_clientId_plain') as string | null ?? null
    if (b64Secret) clientSecret = safeStorage.decryptString(Buffer.from(b64Secret, 'base64'))
    else clientSecret = store.get('secure_clientSecret_plain') as string | null ?? null
  } catch {
    clientId = store.get('secure_clientId_plain') as string | null ?? null
    clientSecret = store.get('secure_clientSecret_plain') as string | null ?? null
  }

  if (!clientId || !clientSecret) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const size = req.query.size !== undefined ? Number(req.query.size) : undefined
    const next = req.query.next as string | undefined
    const data = await getLiveList(clientId, clientSecret, { size, next })
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 방송 설정 조회
router.get('/setting', async (_req, res) => {
  const token = getAccessToken()
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const data = await getLiveSetting(token)
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 방송 설정 변경 — PATCH (PUT 아님), categoryType + tags 포함
router.patch('/setting', async (req, res) => {
  const token = getAccessToken()
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const { defaultLiveTitle, categoryType, categoryId, tags } = req.body as {
      defaultLiveTitle?: string
      categoryType?: string
      categoryId?: string
      tags?: string[]
    }

    const data = await updateLiveSetting(token, { defaultLiveTitle, categoryType, categoryId, tags })

    // 제목 히스토리 저장 (electron-store)
    if (defaultLiveTitle) {
      const history = (store.get('titleHistory') as string[]) || []
      const updated = [defaultLiveTitle, ...history.filter((t) => t !== defaultLiveTitle)].slice(0, 10)
      store.set('titleHistory', updated)
    }

    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 제목 히스토리
router.get('/title-history', (_req, res) => {
  const history = (store.get('titleHistory') as string[]) || []
  res.json(history)
})

export default router
