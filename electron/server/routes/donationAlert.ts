/**
 * [금액별 후원 알림 규칙 API]
 *
 * DonationAlertRule 목록을 일괄 조회·저장하는 CRUD 엔드포인트.
 * 규칙 순서와 내용은 프런트엔드가 전적으로 관리하며, 서버는 저장만 담당한다.
 */
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
