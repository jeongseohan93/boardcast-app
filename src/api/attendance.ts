/**
 * [출석 체크 API]
 *
 * 출석 목록 조회, 통계, 설정 변경, 기록 초기화 엔드포인트를 래핑한다.
 *
 * ── todayOnly 필터 ──────────────────────────────────────────────────────
 *   true 이면 오늘 날짜(YYYY-MM-DD)에 출석한 레코드만 반환한다.
 *   서버에서 last_attended_date 를 기준으로 필터링한다.
 */

import { api } from './base'

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

export const attendanceApi = {
  list: (params?: {
    search?: string
    todayOnly?: boolean
    limit?: number
    offset?: number
  }) => api.get<{ rows: AttendanceRow[]; total: number }>('/api/attendance', { params }),

  stats: () => api.get<{ todayCount: number; totalCount: number }>('/api/attendance/stats'),

  getSettings: () => api.get<AttendanceSettings>('/api/attendance/settings'),

  saveSettings: (settings: Partial<AttendanceSettings>) =>
    api.post<AttendanceSettings>('/api/attendance/settings', settings),

  reset: () => api.delete('/api/attendance'),
}
