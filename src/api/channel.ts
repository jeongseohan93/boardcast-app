/**
 * [채널 관리 API]
 *
 * 스트리밍 역할, 팔로워/구독자 목록, 활동 제한(차단) 관리를 담당한다.
 *
 * 엔드포인트 목록:
 *   GET    /api/channel/streaming-roles         — 스트리밍 역할 목록
 *   GET    /api/channel/followers               — 팔로워 목록
 *   GET    /api/channel/subscribers             — 구독자 목록
 *   GET    /api/channel/restrictions            — 활동 제한 목록
 *   POST   /api/channel/restrictions            — 활동 제한 추가 (영구)
 *   DELETE /api/channel/restrictions/:id        — 활동 제한 해제
 *   POST   /api/channel/temporary-restrictions  — 임시 제한 추가
 *   DELETE /api/channel/temporary-restrictions/:id — 임시 제한 해제
 */

import { api } from './base'

export const channelApi = {
  /** 스트리밍 역할 목록 조회. */
  getStreamingRoles: () => api.get('/api/channel/streaming-roles'),

  /**
   * 팔로워 목록 조회.
   * @param params.page 0부터 시작하는 페이지 번호
   * @param params.size 한 페이지 당 항목 수
   */
  getFollowers: (params?: { page?: number; size?: number }) =>
    api.get('/api/channel/followers', { params }),

  /**
   * 구독자 목록 조회.
   * @param params.sort 정렬 기준 (기본값: 최신순)
   */
  getSubscribers: (params?: { page?: number; size?: number; sort?: string }) =>
    api.get('/api/channel/subscribers', { params }),

  /** 활동 제한(영구 차단) 목록. 커서 기반 페이지네이션. */
  getRestrictions: (params?: { size?: number; next?: string }) =>
    api.get('/api/channel/restrictions', { params }),

  /**
   * 특정 채널에 영구 활동 제한 추가.
   * @param targetChannelId 제한할 시청자의 채널 ID
   */
  addRestriction: (targetChannelId: string) =>
    api.post('/api/channel/restrictions', { targetChannelId }),

  /**
   * 영구 활동 제한 해제.
   * @param targetChannelId 제한을 해제할 시청자의 채널 ID
   */
  removeRestriction: (targetChannelId: string) =>
    api.delete(`/api/channel/restrictions/${encodeURIComponent(targetChannelId)}`),

  /**
   * 임시 채팅 제한 추가. 현재 방송의 채팅 채널 ID가 필요하다.
   * @param data.targetChannelId 제한할 시청자 채널 ID
   * @param data.chatChannelId   현재 방송의 채팅 채널 ID
   */
  addTemporaryRestriction: (data: { targetChannelId: string; chatChannelId: string }) =>
    api.post('/api/channel/temporary-restrictions', data),

  /**
   * 임시 제한 해제.
   * @param targetChannelId 해제할 시청자 채널 ID
   * @param chatChannelId   현재 방송의 채팅 채널 ID
   */
  removeTemporaryRestriction: (targetChannelId: string, chatChannelId: string) =>
    api.delete(
      `/api/channel/temporary-restrictions/${encodeURIComponent(targetChannelId)}`,
      { params: { chatChannelId } }
    ),
}
