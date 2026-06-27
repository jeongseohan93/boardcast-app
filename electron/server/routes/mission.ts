import { Router } from 'express'
import { getDB } from '../db/index'
import { io } from '../index'
import { missionSuccessFromStatus, normalizeMissionStatus } from '../services/missionStatus'

const router = Router()

function toFrontend(row: Record<string, unknown>) {
  return {
    id:                  row.id,
    channelId:           row.channel_id,
    missionDonationId:   row.mission_donation_id,
    missionText:         row.mission_text,
    status:              row.status,
    success:             Boolean(row.success),
    payAmount:           row.pay_amount,
    donatorNickname:     row.donator_nickname,
    donatorChannelId:    row.donator_channel_id,
    durationTime:        row.duration_time,
    missionCreatedTime:  row.mission_created_time,
    missionEndTime:      row.mission_end_time,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  }
}

// 목록 조회
router.get('/', (req, res) => {
  const db = getDB()
  const limit  = Math.min(parseInt(req.query.limit  as string) || 100, 500)
  const offset = parseInt(req.query.offset as string) || 0
  const rows = db.prepare(
    'SELECT * FROM missions ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as Record<string, unknown>[]
  res.json(rows.map(toFrontend))
})

// 수동 상태 업데이트 (성공/실패 버튼)
router.post('/update', (req, res) => {
  const {
    missionDonationId, status, success,
    missionText, payAmount, donatorNickname, donatorChannelId,
    durationTime, missionCreatedTime, missionEndTime,
  } = req.body as Record<string, unknown>

  if (!missionDonationId) return res.status(400).json({ error: 'missing missionDonationId' })

  const db = getDB()
  const now = new Date().toISOString()
  const normalizedStatus = normalizeMissionStatus(status)
  const normalizedSuccess = missionSuccessFromStatus(normalizedStatus, success)

  const result = db.prepare(`
    UPDATE missions
    SET status = ?, success = ?, updated_at = ?
    WHERE mission_donation_id = ?
  `).run(normalizedStatus, normalizedSuccess ? 1 : 0, now, missionDonationId)

  if (!result.changes) return res.status(404).json({ error: 'mission not found' })

  const row = db.prepare('SELECT * FROM missions WHERE mission_donation_id = ?').get(missionDonationId) as Record<string, unknown> | undefined
  const mission = row
    ? toFrontend(row)
    : {
        missionDonationId,
        status: normalizedStatus,
        success: normalizedSuccess,
        missionText,
        payAmount,
        donatorNickname,
        donatorChannelId,
        durationTime,
        missionCreatedTime,
        missionEndTime,
      }

  io.emit('mission', mission)

  res.json({ ok: true })
})

export function saveMissionToDB(channelId: string, mission: {
  missionDonationId: string
  missionText: string
  status: string
  success: boolean
  payAmount: number
  donatorNickname: string
  donatorChannelId?: string
  durationTime?: number
  missionCreatedTime?: string
  missionEndTime?: string
}) {
  const db = getDB()
  const now = new Date().toISOString()
  const status = normalizeMissionStatus(mission.status)
  const success = missionSuccessFromStatus(status, mission.success)
  db.prepare(`
    INSERT INTO missions
      (channel_id, mission_donation_id, mission_text, status, success, pay_amount,
       donator_nickname, donator_channel_id, duration_time, mission_created_time,
       mission_end_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mission_donation_id) DO UPDATE SET
      mission_text = CASE
        WHEN excluded.mission_text != '' THEN excluded.mission_text
        ELSE missions.mission_text
      END,
      status = excluded.status,
      success = excluded.success,
      pay_amount = CASE
        WHEN excluded.pay_amount > 0 THEN excluded.pay_amount
        ELSE missions.pay_amount
      END,
      donator_nickname = CASE
        WHEN excluded.donator_nickname != '' THEN excluded.donator_nickname
        ELSE missions.donator_nickname
      END,
      donator_channel_id = CASE
        WHEN excluded.donator_channel_id != '' THEN excluded.donator_channel_id
        ELSE missions.donator_channel_id
      END,
      duration_time = COALESCE(excluded.duration_time, missions.duration_time),
      mission_created_time = COALESCE(excluded.mission_created_time, missions.mission_created_time),
      mission_end_time = COALESCE(excluded.mission_end_time, missions.mission_end_time),
      updated_at = excluded.updated_at
  `).run(
    channelId,
    mission.missionDonationId,
    mission.missionText,
    status,
    success ? 1 : 0,
    mission.payAmount,
    mission.donatorNickname,
    mission.donatorChannelId ?? '',
    mission.durationTime ?? null,
    mission.missionCreatedTime ?? null,
    mission.missionEndTime ?? null,
    now,
    now,
  )
}

export default router
