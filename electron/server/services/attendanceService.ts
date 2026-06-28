/**
 * [출석 체크 서비스]
 *
 * 채팅 키워드 기반 출석 체크 기능의 핵심 로직.
 *
 * ── processAttendance 흐름 ────────────────────────────────────────────────
 *   1. (channel_id, nickname) 으로 기존 레코드 조회
 *   2. 없으면 → INSERT (total_count=1, isNew=true)
 *   3. last_attended_date === 오늘 → alreadyChecked=true (카운트 변경 없음)
 *   4. last_attended_date !== 오늘 → UPDATE (total_count+1, 날짜 갱신)
 *
 * ── 닉네임 기반 식별 ─────────────────────────────────────────────────────
 *   Chzzk senderChannelId(user_id)가 항상 안정적이지 않을 수 있어
 *   닉네임을 (channel_id, nickname) UNIQUE 키로 사용한다.
 *   닉네임이 변경되면 새 출석 기록이 시작된다.
 *   user_id는 표시/검색 보조용으로만 저장한다.
 *
 * ── 설정 (electron-store) ────────────────────────────────────────────────
 *   keyword       → 출석을 트리거하는 채팅 키워드 (예: "제하", "안녕")
 *   replyTemplate → 봇 응답 템플릿. {nickname}, {count} 플레이스홀더 지원
 *   enabled       → 기능 활성화 여부
 *
 * ── matchesAttendanceKeyword (유연한 키워드 매칭) ─────────────────────────
 *   한국 인터넷 문화에서 키워드를 창의적으로 변형해 입력하는 패턴을 처리한다.
 *
 *   지원하는 변형:
 *   1. 정확히 일치  : "제하"
 *   2. to the 삽입  : "제 to the 하"  (글자 사이에 " to the " 삽입)
 *      - 대소문자 무시: "제 TO THE 하", "제 To The 하" 모두 인식
 *      - 공백 수 무관: "제  to  the  하" (공백 여러 개도 인식)
 *
 *   구현 방식: 키워드의 각 글자 사이에 `(?:\s+to\s+the\s+)?` 패턴을 삽입한 정규식 생성.
 *   키워드가 "제하"이면 → `^제(?:\s+to\s+the\s+)?하$` 정규식으로 매칭.
 *   `i` 플래그로 대소문자 무시.
 *   정규식 특수문자(`.`, `*` 등)는 escape 처리해 안전하게 패턴에 포함한다.
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

/**
 * 메시지가 출석 키워드와 일치하는지 확인한다.
 * 정확히 일치하거나 "제 to the 하" 형태의 변형도 인식한다.
 */
export function matchesAttendanceKeyword(message: string, keyword: string): boolean {
  const kw = keyword.trim()
  if (!kw) return false

  const text = message.trim()

  // 정확히 일치하면 바로 반환 (regex 생성 비용 절감)
  if (text === kw) return true

  // 키워드 각 글자 사이에 "to the" 변형 패턴을 허용하는 정규식 생성
  // 예) "제하" → /^제(?:\s+to\s+the\s+)?하$/i
  const escaped = [...kw].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = escaped.join('(?:\\s+to\\s+the\\s+)?')
  return new RegExp(`^${pattern}$`, 'i').test(text)
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
