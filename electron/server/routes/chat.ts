import { Router } from 'express'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { sendChat, sendNotice, blindMessage, getChatSettings, updateChatSettings } from '../services/chzzkApi'
import { io, chzzkSession } from '../index'

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

// 현재 세션의 chatChannelId 조회 (임시제한 등에 필요)
router.get('/channel-id', (_req, res) => {
  const chatChannelId = chzzkSession?.getChatChannelId() ?? null
  return res.json({ chatChannelId })
})

// 채팅 전송 — body에 channelId 없음 (CHZZK API 기준)
router.post('/send', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const { message } = req.body as { message: string }
    if (!message?.trim()) return res.status(400).json({ error: 'message required' })
    const clientId = getSecure('clientId') ?? undefined
    const data = await sendChat(token, message, clientId)
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 공지 등록 — message 또는 messageId 중 하나
router.post('/notice', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const { message, messageId } = req.body as { message?: string; messageId?: string }
    if (!message?.trim() && !messageId?.trim()) {
      return res.status(400).json({ error: 'message or messageId required' })
    }
    const data = await sendNotice(token, { message, messageId })
    if (message?.trim()) {
      io?.emit('notice', { message: message.trim(), timestamp: new Date().toISOString() })
    }
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 채팅 메시지 숨기기
router.post('/blind-message', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const { chatChannelId, messageTime, senderChannelId } = req.body as {
      chatChannelId: string
      messageTime: number
      senderChannelId: string
    }
    if (!chatChannelId || !messageTime || !senderChannelId) {
      return res.status(400).json({ error: 'chatChannelId, messageTime, senderChannelId required' })
    }
    const data = await blindMessage(token, { chatChannelId, messageTime, senderChannelId })
    return res.json(data ?? { ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 채팅 설정 조회
router.get('/settings', async (_req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const data = await getChatSettings(token)
    return res.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// 채팅 설정 변경
router.put('/settings', async (req, res) => {
  const token = getSecure('accessToken')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const data = await updateChatSettings(token, req.body)
    return res.json(data ?? { ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

export default router
