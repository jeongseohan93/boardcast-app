import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import {
  getAutoNotices, saveAutoNotices, AutoNotice,
  applyAutoNotice, removeAutoNotice,
} from '../services/autoNoticeService'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getAutoNotices())
})

router.post('/', (req, res) => {
  const notices = getAutoNotices()
  const notice: AutoNotice = {
    id: uuidv4(),
    message: req.body.message,
    intervalMinutes: req.body.intervalMinutes ?? 10,
    enabled: req.body.enabled ?? true,
  }
  notices.push(notice)
  saveAutoNotices(notices)
  applyAutoNotice(notice)
  res.json(notice)
})

router.put('/:id', (req, res) => {
  const notices = getAutoNotices()
  const idx = notices.findIndex((n) => n.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  notices[idx] = { ...notices[idx], ...req.body, id: req.params.id }
  saveAutoNotices(notices)
  applyAutoNotice(notices[idx])
  return res.json(notices[idx])
})

router.delete('/:id', (req, res) => {
  const notices = getAutoNotices()
  saveAutoNotices(notices.filter((n) => n.id !== req.params.id))
  removeAutoNotice(req.params.id)
  res.json({ ok: true })
})

export default router
