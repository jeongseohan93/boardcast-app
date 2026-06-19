import { Router } from 'express'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { getLiveSetting, updateLiveSetting } from '../services/chzzkApi'

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
