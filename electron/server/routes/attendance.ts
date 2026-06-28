/**
 * [출석 체크 라우트]
 *
 * GET  /api/attendance          → 출석 목록 조회 (검색·페이지네이션·오늘만 필터)
 * GET  /api/attendance/stats    → 오늘/전체 출석 수 통계
 * GET  /api/attendance/settings → 키워드·응답 템플릿 설정 조회
 * POST /api/attendance/settings → 설정 저장
 * DELETE /api/attendance        → 전체 기록 초기화
 */

import { Router } from 'express'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import {
  listAttendance,
  getTodayStats,
  resetAttendance,
  getAttendanceSettings,
  saveAttendanceSettings,
} from '../services/attendanceService'

const router = Router()
const store = new Store()

function getChannelId(): string {
  return (store.get('channelId') as string | undefined) ?? ''
}

router.get('/', (req, res) => {
  const channelId = getChannelId()
  if (!channelId) return res.json({ rows: [], total: 0 })

  const search    = typeof req.query.search   === 'string' ? req.query.search   : undefined
  const todayOnly = req.query.todayOnly === 'true'
  const limit     = Number(req.query.limit  ?? 50)
  const offset    = Number(req.query.offset ?? 0)

  const result = listAttendance(channelId, { search, todayOnly, limit, offset })
  return res.json(result)
})

router.get('/stats', (_req, res) => {
  const channelId = getChannelId()
  if (!channelId) return res.json({ todayCount: 0, totalCount: 0 })
  return res.json(getTodayStats(channelId))
})

router.get('/settings', (_req, res) => {
  return res.json(getAttendanceSettings())
})

router.post('/settings', (req, res) => {
  const { enabled, keyword, replyTemplate } = req.body as {
    enabled?: boolean
    keyword?: string
    replyTemplate?: string
  }
  saveAttendanceSettings({ enabled, keyword, replyTemplate })
  return res.json(getAttendanceSettings())
})

router.delete('/', (_req, res) => {
  const channelId = getChannelId()
  if (channelId) resetAttendance(channelId)
  return res.json({ ok: true })
})

export default router
