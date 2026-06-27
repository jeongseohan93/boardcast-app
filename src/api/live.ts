/**
 * [방송 설정 API]
 *
 * 현재 방송의 제목, 카테고리, 태그를 조회·수정하고
 * 과거 방송 목록과 제목 히스토리를 불러온다.
 *
 * 엔드포인트 목록:
 *   GET   /api/live/setting       — 현재 방송 설정 (제목·카테고리·태그)
 *   PATCH /api/live/setting       — 방송 설정 부분 업데이트
 *   GET   /api/live/title-history — 최근 사용한 방송 제목 목록
 *   GET   /api/live/list          — 과거 방송 목록 (커서 기반 페이지네이션)
 */

import { api } from './base'

export const liveApi = {
  /** 현재 방송 설정 조회. DashboardPage의 '방송 설정' 카드에서 사용. */
  getSetting: () => api.get('/api/live/setting'),

  /**
   * 방송 설정 부분 업데이트. 변경된 필드만 포함해 전송.
   * @param data defaultLiveTitle·categoryType·categoryId·tags 중 변경된 것만 포함
   */
  updateSetting: (data: {
    defaultLiveTitle?: string
    categoryType?: string
    categoryId?: string
    tags?: string[]
  }) => api.patch('/api/live/setting', data),

  /** 최근 사용한 방송 제목 목록. 방송 설정 카드의 드롭다운 히스토리에 사용. */
  getTitleHistory: () => api.get('/api/live/title-history'),

  /**
   * 과거 방송 목록 조회. 커서 기반 페이지네이션.
   * @param params.size 한 번에 가져올 개수
   * @param params.next 다음 페이지 커서 (이전 응답의 next 값)
   */
  getList: (params?: { size?: number; next?: string }) =>
    api.get('/api/live/list', { params }),
}
