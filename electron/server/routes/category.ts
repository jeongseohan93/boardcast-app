import { Router } from 'express'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { searchCategories } from '../services/chzzkApi'

const router = Router()
const store = new Store()

function secureGet(key: string): string | null {
  try {
    const b64 = store.get(`secure_${key}`) as string | undefined
    if (!b64) return store.get(`${key}_plain`) as string | null ?? null
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

// 카테고리 검색 — Client 인증 사용 (Bearer 아님)
router.get('/', async (req, res) => {
  const clientId = secureGet('clientId')
  const clientSecret = secureGet('clientSecret')
  if (!clientId || !clientSecret) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const query = (req.query.query as string) || ''
    const data = await searchCategories(clientId, clientSecret, query)
    // 첫 번째 결과의 필드명을 로그로 확인 (카테고리 이미지 필드명 디버깅용)
    if (Array.isArray(data) && data.length > 0) {
      console.log('[Category] Fields in first result:', Object.keys(data[0] as object))
      console.log('[Category] First result:', JSON.stringify(data[0]).slice(0, 200))
    }
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

export default router
