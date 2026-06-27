/**
 * [알림 히스토리 공유 타입·상수·유틸]
 *
 * AlertHistoryPage와 하위 테이블 컴포넌트가 공유하는
 * 인터페이스, 상수, 헬퍼 함수를 한 파일에 모은다.
 */

export type Tab = 'all' | 'donation' | 'subscription' | 'follow' | 'unfollow'
export type DateFilter = 'today' | 'week' | 'month' | 'all'

export interface Donation {
  id: number
  nickname: string
  amount: number
  type: string
  message?: string
  created_at: string
}

export interface Subscription {
  id: number
  nickname: string
  month?: number
  message?: string
  created_at: string
}

export interface FollowEvent {
  id: number
  event_type?: 'FOLLOW' | 'UNFOLLOW'
  target_channel_id?: string | null
  nickname?: string | null
  follower_count: number
  created_at: string
}

export interface RestrictionRow {
  restrictedChannelId?: string
}

/**
 * 전체 탭에서 시간 역순으로 합쳐 표시하기 위한
 * 공용 유니온 타입 — 이벤트 종류를 `kind` 필드로 구분한다.
 */
export type UnifiedEvent =
  | { kind: 'donation';     id: number; created_at: string; data: Donation }
  | { kind: 'subscription'; id: number; created_at: string; data: Subscription }
  | { kind: 'follow';       id: number; created_at: string; data: FollowEvent }
  | { kind: 'unfollow';     id: number; created_at: string; data: FollowEvent }

export const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: '오늘',     value: 'today' },
  { label: '이번 주', value: 'week' },
  { label: '이번 달', value: 'month' },
  { label: '전체',    value: 'all' },
]

/** 팔로워 수 마일스톤 — 해당 수치 도달 시 뱃지 표시 */
export const MILESTONES = [
  10, 25, 50, 100, 200, 300, 500, 750, 1000,
  1500, 2000, 3000, 5000, 7500, 10000, 20000, 50000, 100000,
]

/** 날짜 필터 값 → { startDate, endDate } 변환 */
export function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (filter === 'today') { const today = toISO(now); return { startDate: today, endDate: today } }
  if (filter === 'week')  { const s = new Date(now); s.setDate(s.getDate() - 6); return { startDate: toISO(s), endDate: toISO(now) } }
  if (filter === 'month') { return { startDate: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toISO(now) } }
  return {}
}

/** 채널 활동제한 목록 응답에서 채널 ID Set 추출 */
export function restrictionIdsFromResponse(data: unknown): Set<string> {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] })?.data)
      ? (data as { data: unknown[] }).data
      : []
  return new Set(
    rows
      .map((row) => (row as RestrictionRow).restrictedChannelId)
      .filter((id): id is string => !!id)
  )
}

/** ISO 날짜 → "6월 12일 (수)" 형식 */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
