import { Router } from 'express'
import { io } from '../index'
import { startPoll, stopPoll, clearPoll, getVoteState } from '../services/votingService'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getVoteState())
})

router.post('/start', (req, res) => {
  const { title, options } = req.body as { title: string; options: string[] }
  if (!title?.trim() || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: '제목과 2개 이상의 항목이 필요합니다' })
  }
  const filtered = options.map((s) => s.trim()).filter(Boolean)
  if (filtered.length < 2) return res.status(400).json({ error: '항목을 2개 이상 입력하세요' })

  const state = startPoll(title.trim(), filtered)
  io.emit('pollUpdate', state)
  res.json(state)
})

router.post('/stop', (_req, res) => {
  const state = stopPoll()
  io.emit('pollUpdate', state)
  res.json(state)
})

router.post('/clear', (_req, res) => {
  clearPoll()
  const state = getVoteState()
  io.emit('pollUpdate', state)
  res.json(state)
})

export default router
