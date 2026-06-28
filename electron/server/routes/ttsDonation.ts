import { Router } from 'express'
import { getTtsDonationSettings, saveTtsDonationSettings, TtsDonationSettings } from '../services/ttsDonationService'

const router = Router()

router.get('/settings', (_req, res) => {
  res.json(getTtsDonationSettings())
})

router.post('/settings', (req, res) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'settings must be an object' })
    return
  }
  saveTtsDonationSettings(body as Partial<TtsDonationSettings>)
  res.json({ ok: true })
})

export default router
