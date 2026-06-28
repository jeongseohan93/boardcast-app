/**
 * 채팅 키워드 기반 출석 체크 서비스.
 * (channel_id, nickname) UNIQUE 키 사용 — 닉네임 변경 시 새 기록 시작.
 */

import Store from 'electron-store'
import { getDB } from '../db/index'

export interface AttendanceSettings {
  enabled: boolean
  keyword: string
  replyTemplate: string
}

export interface AttendanceRow {
  id: number
  channel_id: string
  nickname: string
  user_id: string
  total_count: number
  last_attended_date: string
  first_attended_at: string
  last_attended_at: string
}

export interface AttendanceResult {
  alreadyChecked: boolean
  count: number
  isNew: boolean
}

const DEFAULT_SETTINGS: AttendanceSettings = {
  enabled: false,
  keyword: '',
  replyTemplate: '{nickname} 출석 완료! ({count}번째)',
}

export function getAttendanceSettings(): AttendanceSettings {
  const store = new Store()
  const saved = store.get('attendanceSettings') as Partial<AttendanceSettings> | undefined
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) }
}

export function saveAttendanceSettings(settings: Partial<AttendanceSettings>) {
  const store = new Store()
  store.set('attendanceSettings', { ...getAttendanceSettings(), ...settings })
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export function processAttendance(
  channelId: string,
  nickname: string,
  userId: string,
): AttendanceResult {
  const db = getDB()
  const today = getToday()

  const existing = db
    .prepare('SELECT * FROM attendance WHERE channel_id = ? AND nickname = ?')
    .get(channelId, nickname) as AttendanceRow | undefined

  if (!existing) {
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO attendance (channel_id, nickname, user_id, total_count, last_attended_date, first_attended_at, last_attended_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run(channelId, nickname, userId, today, now, now)
    return { alreadyChecked: false, count: 1, isNew: true }
  }

  if (existing.last_attended_date === today) {
    return { alreadyChecked: true, count: existing.total_count, isNew: false }
  }

  const newCount = existing.total_count + 1
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE attendance
    SET total_count = ?, last_attended_date = ?, last_attended_at = ?, user_id = ?
    WHERE channel_id = ? AND nickname = ?
  `).run(newCount, today, now, userId || existing.user_id, channelId, nickname)

  return { alreadyChecked: false, count: newCount, isNew: false }
}

// "제 to the 하", "제~하ㅋㅋ" 등 변형을 핵심 문자 추출로 매칭.
// 한글 음절·영문자만 남기고 나머지(자모, 공백, 이모지, 특수문자) 제거 후 비교.
export function matchesAttendanceKeyword(message: string, keyword: string): boolean {
  const kw = keyword.trim()
  if (!kw) return false
  const text = message.trim()
  if (text === kw) return true
  const extractCore = (s: string) =>
    s.replace(/\s+to\s+the\s+/gi, '').replace(/[^a-zA-Z가-힣]/g, '')
  return extractCore(text) === extractCore(kw)
}

export function buildReply(template: string, nickname: string, count: number): string {
  return template
    .replace(/\{nickname\}/g, nickname)
    .replace(/\{count\}/g, String(count))
}

export function getTodayStats(channelId: string): { todayCount: number; totalCount: number } {
  const db = getDB()
  const today = getToday()
  const todayRow = db
    .prepare('SELECT COUNT(*) as cnt FROM attendance WHERE channel_id = ? AND last_attended_date = ?')
    .get(channelId, today) as { cnt: number }
  const totalRow = db
    .prepare('SELECT COUNT(*) as cnt FROM attendance WHERE channel_id = ?')
    .get(channelId) as { cnt: number }
  return { todayCount: todayRow.cnt, totalCount: totalRow.cnt }
}

export function listAttendance(
  channelId: string,
  opts: { search?: string; limit?: number; offset?: number; todayOnly?: boolean },
): { rows: AttendanceRow[]; total: number } {
  const db = getDB()
  const today = getToday()
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  const conditions: string[] = ['channel_id = ?']
  const params: unknown[] = [channelId]

  if (opts.todayOnly) {
    conditions.push('last_attended_date = ?')
    params.push(today)
  }

  if (opts.search) {
    conditions.push('nickname LIKE ?')
    params.push(`%${opts.search}%`)
  }

  const where = conditions.join(' AND ')
  const totalRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM attendance WHERE ${where}`)
    .get(...params) as { cnt: number }

  const rows = db
    .prepare(`SELECT * FROM attendance WHERE ${where} ORDER BY last_attended_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as AttendanceRow[]

  return { rows, total: totalRow.cnt }
}

export function resetAttendance(channelId: string) {
  const db = getDB()
  db.prepare('DELETE FROM attendance WHERE channel_id = ?').run(channelId)
}
