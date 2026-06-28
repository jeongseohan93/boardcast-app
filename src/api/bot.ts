/**
 * [봇 명령어 / 자동 공지 API]
 *
 * 채팅봇 명령어(trigger→response)와 일정 간격으로 전송되는 자동 공지를 관리한다.
 *
 * 봇 명령어 엔드포인트:
 *   GET    /api/bot         — 명령어 전체 목록
 *   POST   /api/bot         — 명령어 추가
 *   PUT    /api/bot/:id     — 명령어 수정 (활성화/비활성화 포함)
 *   DELETE /api/bot/:id     — 명령어 삭제
 *
 * 자동 공지 엔드포인트:
 *   GET    /api/auto-notice       — 자동 공지 전체 목록
 *   POST   /api/auto-notice       — 자동 공지 추가
 *   PUT    /api/auto-notice/:id   — 자동 공지 수정 (enabled 토글 포함)
 *   DELETE /api/auto-notice/:id   — 자동 공지 삭제
 */

import { api } from './base'

export const botApi = {
  /** 봇 명령어 전체 목록 조회 */
  list: () => api.get('/api/bot'),

  /**
   * 봇 명령어 추가.
   * @param data trigger, response, cooldown, permission, enabled
   */
  create: (data: object) => api.post('/api/bot', data),

  /**
   * 봇 명령어 수정.
   * @param id   수정할 명령어 ID
   * @param data 변경할 필드
   */
  update: (id: string, data: object) => api.put(`/api/bot/${id}`, data),

  /**
   * 봇 명령어 삭제.
   * @param id 삭제할 명령어 ID
   */
  delete: (id: string) => api.delete(`/api/bot/${id}`),
}

export const autoNoticeApi = {
  /** 자동 공지 전체 목록 조회 */
  list: () => api.get('/api/auto-notice'),

  /**
   * 자동 공지 추가.
   * @param data message, intervalMinutes, enabled
   */
  create: (data: object) => api.post('/api/auto-notice', data),

  /**
   * 자동 공지 수정.
   * @param id   수정할 공지 ID
   * @param data 변경할 필드 (enabled 토글에도 사용)
   */
  update: (id: string, data: object) => api.put(`/api/auto-notice/${id}`, data),

  /**
   * 자동 공지 삭제.
   * @param id 삭제할 공지 ID
   */
  delete: (id: string) => api.delete(`/api/auto-notice/${id}`),
}
