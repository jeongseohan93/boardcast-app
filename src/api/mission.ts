/**
 * [미션 API]
 *
 * 치지직 공식 미션(시청자가 후원과 함께 요청하는 미션)의 목록 조회 및 상태 업데이트.
 *
 * 엔드포인트:
 *   GET  /api/mission        — 미션 목록 조회 (페이지네이션)
 *   POST /api/mission/update — 미션 상태 업데이트 (수락·거절·성공·실패)
 *
 * 미션 상태 흐름:
 *   PENDING → APPROVED(수락) or REJECTED(거절)
 *   APPROVED → SUCCESS(성공) or FAILED(실패)
 *
 * 실시간 업데이트:
 *   Socket.IO 'mission' 이벤트를 통해 새 미션 도착과 상태 변화를 실시간으로 받는다.
 *   (missionStore.addOrUpdate 참고)
 */

import { api } from './base'

export const missionApi = {
  /**
   * 미션 목록 조회.
   * @param params.limit  한 번에 가져올 개수
   * @param params.offset 건너뛸 개수
   */
  list: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/mission', { params }),

  /**
   * 미션 상태 업데이트. 수락·거절·성공·실패 처리에 사용.
   * @param data.missionDonationId  미션 고유 ID
   * @param data.status             새로운 상태값
   * @param data.success            성공 여부 (APPROVED 상태에서 완료 처리 시)
   * @param data.missionText        미션 내용 (선택)
   * @param data.payAmount          후원 금액 (선택)
   * @param data.donatorNickname    후원자 닉네임 (선택)
   * @param data.donatorChannelId   후원자 채널 ID (선택)
   * @param data.durationTime       미션 진행 시간 (선택)
   * @param data.missionCreatedTime 미션 생성 시각 ISO 문자열 (선택)
   * @param data.missionEndTime     미션 종료 시각 ISO 문자열 (선택)
   */
  update: (data: {
    missionDonationId: string
    status: string
    success: boolean
    missionText?: string
    payAmount?: number
    donatorNickname?: string
    donatorChannelId?: string
    durationTime?: number
    missionCreatedTime?: string
    missionEndTime?: string
  }) => api.post('/api/mission/update', data),
}
