/**
 * [영상 도네이션(영도) API]
 *
 * 시청자가 YouTube URL과 함께 후원하면 오버레이에서 영상이 재생되는 기능을 관리한다.
 *
 * 엔드포인트:
 *   GET  /api/video-donation                    — 대기 중 + 재생된 영도 목록 및 설정 조회
 *   PUT  /api/video-donation/config             — 영도 설정 업데이트
 *   POST /api/video-donation/manual             — 수동으로 영도 추가
 *   POST /api/video-donation/:id/play           — 특정 영도 재생
 *   POST /api/video-donation/play-next          — 다음 영도 재생 (큐 순서대로)
 *   POST /api/video-donation/stop               — 현재 재생 중지
 *   POST /api/video-donation/:id/reject         — 특정 영도 거절
 *   POST /api/video-donation/clear-played       — 재생된 영도 기록 삭제
 */

import { api } from './base'

export const videoDonationApi = {
  /**
   * 영도 목록 + 설정 조회.
   * 응답에는 pending(대기), played(재생됨), config(설정) 포함.
   */
  get: () => api.get('/api/video-donation'),

  /**
   * 영도 설정 업데이트.
   * @param data.enabled    영도 기능 활성 여부
   * @param data.minAmount  최소 후원 금액 (치즈)
   * @param data.autoPlay   자동 재생 여부
   * @param data.maxSeconds 최대 재생 시간 (초)
   */
  updateConfig: (data: {
    enabled?: boolean
    minAmount?: number
    autoPlay?: boolean
    maxSeconds?: number
  }) => api.put('/api/video-donation/config', data),

  /**
   * 수동으로 영도 추가 (URL 직접 입력).
   * @param data.url     YouTube URL (필수)
   * @param data.nickname 후원자 닉네임 (선택)
   * @param data.amount   후원 금액 (선택)
   * @param data.message  메시지 (선택)
   */
  addManual: (data: { nickname?: string; amount?: number; url: string; message?: string }) =>
    api.post('/api/video-donation/manual', data),

  /**
   * 특정 영도 즉시 재생. 큐를 건너뛰고 바로 재생.
   * @param id 재생할 영도 항목 ID
   */
  play: (id: string) =>
    api.post(`/api/video-donation/${encodeURIComponent(id)}/play`),

  /** 큐의 다음 영도를 재생 */
  playNext: () => api.post('/api/video-donation/play-next'),

  /** 현재 재생 중인 영도 중지 */
  stop: () => api.post('/api/video-donation/stop'),

  /**
   * 특정 영도 거절. 큐에서 제거되고 거절 상태로 기록.
   * @param id 거절할 영도 항목 ID
   */
  reject: (id: string) =>
    api.post(`/api/video-donation/${encodeURIComponent(id)}/reject`),

  /** 이미 재생된 영도 기록 전체 삭제 */
  clearPlayed: () => api.post('/api/video-donation/clear-played'),
}
