/**
 * [카테고리 API]
 *
 * 치지직 방송 카테고리(게임·콘텐츠 분류)를 검색한다.
 * DashboardPage의 '방송 설정' 카드에서 카테고리 검색 시 사용.
 *
 * 엔드포인트:
 *   GET /api/categories?query=xxx — 카테고리명으로 검색
 */

import { api } from './base'

export const categoryApi = {
  /**
   * 카테고리 검색.
   * @param query 검색할 게임/카테고리 이름 (예: "배틀그라운드")
   * @returns 매칭되는 카테고리 목록 (id, type, value, 포스터 이미지 URL)
   */
  search: (query: string) => api.get('/api/categories', { params: { query } }),
}
