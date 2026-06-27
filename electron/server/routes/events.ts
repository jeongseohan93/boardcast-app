import { Router } from 'express'
import Store from 'electron-store'
import { getDB } from '../db/index'
import {
  clearRawDonationEvents,
  clearRawSessionEvents,
  getRawDonationEvents,
  getRawSessionEvents,
} from '../services/rawEventDebugService'
import { clearChzzkWebhookEvents, getChzzkWebhookEvents } from '../services/chzzkWebhookDebugService'

const router = Router()
const store = new Store()

const DB_EXPORT_VERSION = 1
const EXPORT_TABLES = {
  donations: ['id', 'channel_id', 'user_id', 'nickname', 'amount', 'type', 'message', 'created_at'],
  subscriptions: ['id', 'channel_id', 'user_id', 'nickname', 'month', 'message', 'created_at'],
  follows: ['id', 'channel_id', 'event_type', 'target_channel_id', 'nickname', 'follower_count', 'created_at'],
  follower_list: ['channel_id', 'follower_channel_id', 'nickname', 'followed_at'],
} as const

type ExportTable = keyof typeof EXPORT_TABLES
type ImportPayload = {
  version?: number
  exportedAt?: string
  tables?: Partial<Record<ExportTable, Record<string, unknown>[]>>
}

function insertRows(table: ExportTable, rows: Record<string, unknown>[] = []) {
  if (!rows.length) return 0
  const db = getDB()
  const columns = EXPORT_TABLES[table]
  const placeholders = columns.map(() => '?').join(', ')
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
  for (const row of rows) {
    stmt.run(...columns.map((column) => row[column] ?? null))
  }
  return rows.length
}

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
  const startDate = req.query.startDate as string | undefined
  const endDate = req.query.endDate as string | undefined
  const eventType = req.query.eventType as string | undefined

  let query = 'SELECT * FROM follows'
  const params: unknown[] = []
  const conditions: string[] = []

  if (startDate) { conditions.push('created_at >= ?'); params.push(startDate) }
  if (endDate) { conditions.push('created_at <= ?'); params.push(endDate + 'T23:59:59') }
  if (eventType === 'FOLLOW' || eventType === 'UNFOLLOW') {
    conditions.push('event_type = ?')
    params.push(eventType)
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(query).all(...params)
  const total = (db.prepare(
    'SELECT COUNT(*) as cnt FROM follows' + (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '')
  ).get(...params.slice(0, -2)) as { cnt: number }).cnt

  res.json({ data: rows, total, limit, offset })
})

// 요약 통계
router.get('/follower-list', (req, res) => {
  const db = getDB()
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const search = (req.query.search as string | undefined)?.trim()
  const channelId = (req.query.channelId as string | undefined) || (store.get('channelId') as string | undefined)

  let query = 'SELECT * FROM follower_list'
  const params: unknown[] = []
  const conditions: string[] = []

  if (channelId) {
    conditions.push('channel_id = ?')
    params.push(channelId)
  }

  if (search) {
    conditions.push('(nickname LIKE ? OR follower_channel_id LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY followed_at DESC, nickname ASC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(query).all(...params)
  const total = (db.prepare(
    'SELECT COUNT(*) as cnt FROM follower_list' + (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '')
  ).get(...params.slice(0, -2)) as { cnt: number }).cnt

  res.json({ data: rows, total, limit, offset })
})

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
    "SELECT COUNT(*) as cnt FROM follows WHERE event_type = 'FOLLOW' AND created_at >= ?"
  ).get(todayStr) as { cnt: number }).cnt

  const todayUnfollowCount = (db.prepare(
    "SELECT COUNT(*) as cnt FROM follows WHERE event_type = 'UNFOLLOW' AND created_at >= ?"
  ).get(todayStr) as { cnt: number }).cnt

  const recentDonations = db.prepare(
    "SELECT * FROM donations ORDER BY created_at DESC LIMIT 5"
  ).all()

  const recentSubs = db.prepare(
    "SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 3"
  ).all()

  const recentFollows = db.prepare(
    "SELECT * FROM follows ORDER BY created_at DESC LIMIT 5"
  ).all()

  res.json({
    today: {
      donationSum: todayDonationSum,
      subscriptionCount: todaySubCount,
      followCount: todayFollowCount,
      unfollowCount: todayUnfollowCount,
      netFollowCount: todayFollowCount - todayUnfollowCount,
    },
    month: {
      donationSum: monthDonationSum,
    },
    recentEvents: [
      ...recentDonations.map((d: unknown) => ({ ...(d as Record<string, unknown>), eventType: 'donation' })),
      ...recentSubs.map((s: unknown) => ({ ...(s as Record<string, unknown>), eventType: 'subscription' })),
      ...recentFollows.map((f: unknown) => {
        const row = f as Record<string, unknown>
        return { ...row, eventType: (row.event_type as string ?? 'FOLLOW').toLowerCase() }
      }),
    ].sort((a, b) => {
      const aDate = String((a as Record<string, unknown>).created_at ?? '')
      const bDate = String((b as Record<string, unknown>).created_at ?? '')
      return bDate.localeCompare(aDate)
    }).slice(0, 10),
  })
})

// 테스트용: 가짜 unfollow 이벤트 강제 발송
router.get('/debug/donations', (req, res) => {
  const limit = Math.max(1, Math.min(30, parseInt(req.query.limit as string) || 30))
  const allEvents = getRawDonationEvents()
  res.json({ data: allEvents.slice(0, limit), total: allEvents.length })
})

router.delete('/debug/donations', (_req, res) => {
  clearRawDonationEvents()
  res.json({ ok: true })
})

router.get('/debug/session', (req, res) => {
  const limit = Math.max(1, Math.min(80, parseInt(req.query.limit as string) || 80))
  const allEvents = getRawSessionEvents()
  res.json({ data: allEvents.slice(0, limit), total: allEvents.length })
})

router.delete('/debug/session', (_req, res) => {
  clearRawSessionEvents()
  res.json({ ok: true })
})

router.get('/debug/webhooks', (req, res) => {
  const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 50))
  const allEvents = getChzzkWebhookEvents()
  res.json({ data: allEvents.slice(0, limit), total: allEvents.length })
})

router.delete('/debug/webhooks', (_req, res) => {
  clearChzzkWebhookEvents()
  res.json({ ok: true })
})

router.post('/test-unfollow', (req, res) => {
  const { io } = require('../index')
  const event = {
    id: Date.now(),
    type: 'UNFOLLOW',
    nickname: '테스트유저',
    followerCount: 99,
    createdAt: new Date().toISOString(),
  }
  io.emit('unfollow', event)
  io.emit('event', event)
  console.log('[TEST] unfollow event emitted')
  res.json({ ok: true, event })
})

// 전체 이벤트 삭제
router.get('/export', (_req, res) => {
  const db = getDB()
  const tables = {
    donations: db.prepare('SELECT * FROM donations ORDER BY id ASC').all(),
    subscriptions: db.prepare('SELECT * FROM subscriptions ORDER BY id ASC').all(),
    follows: db.prepare('SELECT * FROM follows ORDER BY id ASC').all(),
    follower_list: db.prepare('SELECT * FROM follower_list ORDER BY channel_id ASC, followed_at DESC').all(),
  }

  res.json({
    kind: 'broadcast-assistant-db-export',
    version: DB_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    counts: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])),
  })
})

router.post('/import', (req, res) => {
  const payload = req.body as ImportPayload
  if (!payload?.tables || typeof payload.tables !== 'object') {
    return res.status(400).json({ error: 'Invalid export file' })
  }

  const db = getDB()
  const imported: Record<string, number> = {}

  db.transaction(() => {
    db.prepare('DELETE FROM donations').run()
    db.prepare('DELETE FROM subscriptions').run()
    db.prepare('DELETE FROM follows').run()
    db.prepare('DELETE FROM follower_list').run()

    for (const table of Object.keys(EXPORT_TABLES) as ExportTable[]) {
      imported[table] = insertRows(table, Array.isArray(payload.tables?.[table]) ? payload.tables[table] : [])
    }
  })()

  res.json({ ok: true, imported })
})

router.post('/cleanup/reconciled-unfollows', (_req, res) => {
  const db = getDB()
  const result = db.prepare(`
    DELETE FROM follows
    WHERE event_type = 'UNFOLLOW'
      AND target_channel_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM follows later
        WHERE later.channel_id = follows.channel_id
          AND later.target_channel_id = follows.target_channel_id
          AND later.event_type = 'FOLLOW'
          AND later.created_at > follows.created_at
      )
  `).run()

  res.json({ ok: true, deleted: result.changes })
})

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
