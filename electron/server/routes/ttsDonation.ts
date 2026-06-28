/**
 * [후원 TTS 설정 API]
 *
 * TTS 설정을 조회·저장한다.
 * GET  /api/tts-donation/settings
 * POST /api/tts-donation/settings
 */
import { Router } from 'express'
import { getTtsDonationSettings, saveTtsDonationSettings, TtsDonationSettings } from '../services/ttsDonationService'

const router = Router()

router.get('/settings', (_req, res) => {
  res.json(getTtsDonationSettings())
})

router.post('/settings', (req, res) => {
  const body = req.body as Partial<TtsDonationSettings>
  saveTtsDonationSettings(body)
  res.json({ ok: true })
})

export default router
