/**
 * [이벤트 히스토리 API]
 *
 * 후원·구독·팔로우·언팔로우 이벤트를 SQLite DB에서 조회하고 관리한다.
 * DB 가져오기/내보내기, 디버그용 원시 데이터 조회도 포함.
 *
 * 엔드포인트 목록:
 *   GET    /api/events/donations               — 후원 이력
 *   GET    /api/events/subscriptions           — 구독 이력
 *   GET    /api/events/follows                 — 팔로우/언팔로우 이력
 *   GET    /api/events/follower-list           — 팔로워 목록 (검색 가능)
 *   GET    /api/events/summary                 — 오늘·이번 달 집계 + 최근 이벤트 20개
 *   DELETE /api/events/:table/:id              — 특정 이벤트 삭제
 *   DELETE /api/events/all                     — 전체 이벤트 삭제
 *   GET    /api/events/export                  — DB 전체 내보내기 (JSON)
 *   POST   /api/events/import                  — DB 가져오기 (JSON)
 *   POST   /api/events/cleanup/reconciled-unfollows — 언팔로우 정리
 *   GET    /api/events/debug/donations         — 웹훅 원시 후원 데이터 (디버그)
 *   DELETE /api/events/debug/donations         — 웹훅 원시 데이터 초기화
 *   GET    /api/events/debug/session           — 세션 원시 이벤트 (디버그)
 *   DELETE /api/events/debug/session           — 세션 원시 데이터 초기화
 *   GET    /api/events/debug/webhooks          — 웹훅 원시 이벤트 (디버그)
 *   DELETE /api/events/debug/webhooks          — 웹훅 원시 데이터 초기화
 */

import { api } from './base'

export const eventsApi = {
  /**
   * 후원 이력 조회.
   * @param params.limit     한 번에 가져올 개수 (기본 30)
   * @param params.offset    건너뛸 개수 (페이지네이션)
   * @param params.startDate YYYY-MM-DD 형식 시작 날짜
   * @param params.endDate   YYYY-MM-DD 형식 종료 날짜
   */
  donations: (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string }) =>
    api.get('/api/events/donations', { params }),

  /** 구독 이력 조회. 날짜 필터 없이 전체 또는 페이지네이션. */
  subscriptions: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/events/subscriptions', { params }),

  /**
   * 팔로우/언팔로우 이력 조회.
   * @param params.eventType 'FOLLOW' | 'UNFOLLOW' — 지정 안 하면 전체
   */
  follows: (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string; eventType?: 'FOLLOW' | 'UNFOLLOW' }) =>
    api.get('/api/events/follows', { params }),

  /**
   * 팔로워 목록 조회 (DB에 저장된 팔로워).
   * @param params.search 닉네임 검색어
   */
  followerList: (params?: { limit?: number; offset?: number; search?: string }) =>
    api.get('/api/events/follower-list', { params }),

  /**
   * 오늘·이번 달 집계 + 최근 이벤트 20개 요약.
   * DashboardPage 헤더 통계 카드와 최근 이벤트 피드에서 사용.
   */
  summary: () => api.get('/api/events/summary'),

  // ── 디버그 전용 엔드포인트 (RawEventDebugPage에서 사용) ──────────────

  /** 웹훅으로 수신된 원시 후원 데이터 조회 */
  debugDonations: (params?: { limit?: number }) =>
    api.get('/api/events/debug/donations', { params }),
  clearDebugDonations: () => api.delete('/api/events/debug/donations'),

  /** 세션 방식으로 수신된 원시 이벤트 조회 */
  debugSession: (params?: { limit?: number }) =>
    api.get('/api/events/debug/session', { params }),
  clearDebugSession: () => api.delete('/api/events/debug/session'),

  /** 웹훅 원시 이벤트 조회 */
  debugWebhooks: (params?: { limit?: number }) =>
    api.get('/api/events/debug/webhooks', { params }),
  clearDebugWebhooks: () => api.delete('/api/events/debug/webhooks'),

  // ── DB 관리 ────────────────────────────────────────────────────────────

  /** SQLite DB 전체를 JSON으로 내보내기 */
  exportDb: () => api.get('/api/events/export'),

  /** JSON 데이터를 SQLite DB로 가져오기 */
  importDb: (data: unknown) => api.post('/api/events/import', data),

  /** 언팔로우 기록 중 다시 팔로우한 항목 정리 */
  cleanupReconciledUnfollows: () =>
    api.post('/api/events/cleanup/reconciled-unfollows'),

  /**
   * 특정 이벤트 행 삭제.
   * @param table DB 테이블명 ('donations' | 'subscriptions' | 'follows')
   * @param id    삭제할 행의 PK
   */
  deleteEvent: (table: string, id: number) =>
    api.delete(`/api/events/${table}/${id}`),

  /** 전체 이벤트 데이터 삭제. 되돌릴 수 없으므로 주의. */
  deleteAll: () => api.delete('/api/events/all'),
}
