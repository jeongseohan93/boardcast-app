/**
 * [채팅 API]
 *
 * 채팅 전송, 공지 등록, 메시지 숨김, 채팅 설정 조회/변경을 담당한다.
 *
 * 엔드포인트 목록:
 *   GET  /api/chat/channel-id   — 현재 방송의 채팅 채널 ID 조회
 *   POST /api/chat/send         — 채팅 메시지 전송 (스트리머 계정으로)
 *   POST /api/chat/notice       — 채팅 공지 등록
 *   POST /api/chat/blind-message— 특정 메시지 숨김 (블라인드)
 *   GET  /api/chat/settings     — 채팅 설정 조회 (속도 제한·필터 등)
 *   PUT  /api/chat/settings     — 채팅 설정 업데이트
 */

import { api } from './base'

export const chatApi = {
  /**
   * 현재 방송의 채팅 채널 ID 조회.
   * 임시 제한·메시지 숨김 등 채팅 채널 ID가 필요한 API에서 사용.
   */
  getChatChannelId: () =>
    api.get<{ chatChannelId: string | null }>('/api/chat/channel-id'),

  /**
   * 채팅 메시지 전송. 스트리머 계정으로 전송된다.
   * @param message 전송할 채팅 텍스트
   */
  send: (message: string) => api.post('/api/chat/send', { message }),

  /**
   * 채팅 공지 등록. 이미 전송된 메시지를 공지로 올리거나, 새 메시지를 공지로 전송.
   * @param body.message   새 공지 텍스트 (선택)
   * @param body.messageId 기존 메시지 ID로 공지 등록 (선택)
   */
  notice: (body: { message?: string; messageId?: string }) =>
    api.post('/api/chat/notice', body),

  /**
   * 특정 채팅 메시지를 시청자에게 숨김 처리 (블라인드).
   * 실시간 메시지에만 적용 가능하며, chatChannelId와 messageTime이 필요하다.
   * @param data.chatChannelId   채팅 채널 ID
   * @param data.messageTime     메시지 전송 타임스탬프 (ms)
   * @param data.senderChannelId 메시지 발신자의 채널 ID
   */
  blindMessage: (data: { chatChannelId: string; messageTime: number; senderChannelId: string }) =>
    api.post('/api/chat/blind-message', data),

  /** 현재 채팅 설정 조회. 팔로우 전용 모드, 이모티콘 모드 등 포함. */
  getSettings: () => api.get('/api/chat/settings'),

  /**
   * 채팅 설정 업데이트. 변경할 필드만 포함하면 된다.
   */
  updateSettings: (data: {
    chatAvailableCondition?: string
    chatAvailableGroup?: string
    minFollowerMinute?: number
    allowSubscriberInFollowerMode?: boolean
    chatSlowModeSec?: number
    chatEmojiMode?: boolean
  }) => api.put('/api/chat/settings', data),
}
