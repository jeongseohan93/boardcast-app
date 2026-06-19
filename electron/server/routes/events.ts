import { Router } from 'express'
import { getDB } from '../db/index'

const router = Router()

// 후원 목록
router.get('/donations', (req, res) => {
  const db = getDB()
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const startDate = req.query.startDate as string | undefined
  const endDate = req.query.endDate as string | undefined

  let query = 'SELECT * FROM donations'
  const params: unknown[] = []
  const conditions: string[] = []

  if (startDate) { conditions.push('created_at >= ?'); params.push(startDate) }
  if (endDate) { conditions.push('created_at <= ?'); params.push(endDate + 'T23:59:59') }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(query).all(...params)
  const total = (db.prepare(
    'SELECT COUNT(*) as cnt FROM donations' + (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '')
  ).get(...params.slice(0, -2)) as { cnt: number }).cnt

  res.json({ data: rows, total, limit, offset })
})

// 구독 목록
router.get('/subscriptions', (req, res) => {
  const db = getDB()
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  const rows = db.prepare(
    'SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset)
  const total = (db.prepare('SELECT COUNT(*) as cnt FROM subscriptions').get() as { cnt: number }).cnt

  res.json({ data: rows, total, limit, offset })
})

// 팔로우 목록
router.get('/follows', (req, res) => {
  const db = getDB()
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  const rows = db.prepare(
    'SELECT * FROM follows ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset)
  const total = (db.prepare('SELECT COUNT(*) as cnt FROM follows').get() as { cnt: number }).cnt

  res.json({ data: rows, total, limit, offset })
})

// 요약 통계
router.get('/summary', (req, res) => {
  const db = getDB()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthStr = monthStart.toISOString()

  const todayDonationSum = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE created_at >= ?"
  ).get(todayStr) as { total: number }).total

  const monthDonationSum = (db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE created_at >= ?"
  ).get(monthStr) as { total: number }).total

  const todaySubCount = (db.prepare(
    "SELECT COUNT(*) as cnt FROM subscriptions WHERE created_at >= ?"
  ).get(todayStr) as { cnt: number }).cnt

  const todayFollowCount = (db.prepare(
    "SELECT COUNT(*) as cnt FROM follows WHERE created_at >= ?"
  ).get(todayStr) as { cnt: number }).cnt

  const recentDonations = db.prepare(
    "SELECT * FROM donations ORDER BY created_at DESC LIMIT 5"
  ).all()

  const recentSubs = db.prepare(
    "SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 3"
  ).all()

  const recentFollows = db.prepare(
    "SELECT * FROM follows ORDER BY created_at DESC LIMIT 3"
  ).all()

  res.json({
    today: {
      donationSum: todayDonationSum,
      subscriptionCount: todaySubCount,
      followCount: todayFollowCount,
    },
    month: {
      donationSum: monthDonationSum,
    },
    recentEvents: [
      ...recentDonations.map((d: unknown) => ({ ...(d as Record<string, unknown>), eventType: 'donation' })),
      ...recentSubs.map((s: unknown) => ({ ...(s as Record<string, unknown>), eventType: 'subscription' })),
      ...recentFollows.map((f: unknown) => ({ ...(f as Record<string, unknown>), eventType: 'follow' })),
    ].sort((a, b) => {
      const aDate = String((a as Record<string, unknown>).created_at ?? '')
      const bDate = String((b as Record<string, unknown>).created_at ?? '')
      return bDate.localeCompare(aDate)
    }).slice(0, 10),
  })
})

// 전체 이벤트 삭제
router.delete('/all', (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM donations').run()
  db.prepare('DELETE FROM subscriptions').run()
  db.prepare('DELETE FROM follows').run()
  res.json({ ok: true })
})

// 개별 이벤트 삭제
router.delete('/:table/:id', (req, res) => {
  const { table, id } = req.params
  const allowed = ['donations', 'subscriptions', 'follows']
  if (!allowed.includes(table)) {
    return res.status(400).json({ error: 'Invalid table' })
  }

  const db = getDB()
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
  return res.json({ ok: true })
})

export default router
