import { Router } from 'express'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import {
  addRestriction,
  addTemporaryRestriction,
  getRestrictions,
  getStreamingRoles,
  getChannelFollowers,
  getChannelSubscribers,
  removeTemporaryRestriction,
  removeRestriction,
} from '../services/chzzkApi'

const router = Router()
const store = new Store()

function getSecure(key: string): string | null {
  try {
    const b64 = store.get(`secure_${key}`) as string | undefined
    if (!b64) return store.get(`secure_${key}_plain`) as string | null ?? null
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

// 채널 관리자 조회
router.get('/streaming-roles', async (_req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const data = await getStreamingRoles(token)
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 채널 팔로워 목록 조회
router.get('/followers', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const page = req.query.page !== undefined ? Number(req.query.page) : undefined
    const size = req.query.size !== undefined ? Number(req.query.size) : undefined
    const data = await getChannelFollowers(token, { page, size })
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 채널 구독자 목록 조회
router.get('/subscribers', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const page = req.query.page !== undefined ? Number(req.query.page) : undefined
    const size = req.query.size !== undefined ? Number(req.query.size) : undefined
    const sort = req.query.sort as string | undefined
    const data = await getChannelSubscribers(token, { page, size, sort })
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

router.get('/restrictions', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const size = req.query.size !== undefined ? Number(req.query.size) : undefined
    const next = req.query.next as string | undefined
    const data = await getRestrictions(token, { size, next })
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

router.post('/restrictions', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  const targetChannelId = String(req.body?.targetChannelId ?? '').trim()
  if (!targetChannelId) return res.status(400).json({ error: 'targetChannelId required' })

  try {
    const data = await addRestriction(token, targetChannelId)
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

router.delete('/restrictions/:targetChannelId', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  const targetChannelId = String(req.params.targetChannelId ?? '').trim()
  if (!targetChannelId) return res.status(400).json({ error: 'targetChannelId required' })

  try {
    const data = await removeRestriction(token, targetChannelId)
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

router.post('/temporary-restrictions', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  const targetChannelId = String(req.body?.targetChannelId ?? '').trim()
  const chatChannelId = String(req.body?.chatChannelId ?? '').trim()
  if (!targetChannelId || !chatChannelId) {
    return res.status(400).json({ error: 'targetChannelId, chatChannelId required' })
  }

  try {
    const data = await addTemporaryRestriction(token, { targetChannelId, chatChannelId })
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

router.delete('/temporary-restrictions/:targetChannelId', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  const targetChannelId = String(req.params.targetChannelId ?? '').trim()
  const chatChannelId = String(req.query.chatChannelId ?? '').trim()
  if (!targetChannelId || !chatChannelId) {
    return res.status(400).json({ error: 'targetChannelId, chatChannelId required' })
  }

  try {
    const data = await removeTemporaryRestriction(token, { targetChannelId, chatChannelId })
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

export default router
