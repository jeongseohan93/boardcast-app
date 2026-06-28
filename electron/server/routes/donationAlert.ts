import { Router } from 'express'
import {
  getDonationAlertRules,
  saveDonationAlertRules,
  DonationAlertRule,
} from '../services/donationAlertService'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getDonationAlertRules())
})

router.post('/', (req, res) => {
  const rules = req.body as DonationAlertRule[]
  if (!Array.isArray(rules)) {
    res.status(400).json({ error: 'rules must be an array' })
    return
  }
  saveDonationAlertRules(rules)
  res.json({ ok: true })
})

export default router
