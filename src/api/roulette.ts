/**
 * [룰렛 / 결과 리스트 API]
 *
 * 딜룰렛 설정(항목·가중치·테마·트리거 금액)과
 * 룰렛 결과가 누적되는 리스트 항목을 관리한다.
 *
 * 룰렛 엔드포인트:
 *   GET    /api/roulette            — 룰렛 전체 목록
 *   POST   /api/roulette            — 룰렛 추가
 *   PUT    /api/roulette/:id        — 룰렛 수정 (항목·테마·enabled 등)
 *   DELETE /api/roulette/:id        — 룰렛 삭제
 *   POST   /api/overlay/test/roulette — 테스트 스핀 (오버레이에 전송)
 *   GET    /api/roulette/test-list  — 테스트 시 리스트 반영 여부 조회
 *   POST   /api/roulette/test-list  — 테스트 시 리스트 반영 여부 설정
 *
 * 리스트 항목 엔드포인트:
 *   GET    /api/roulette-list       — 리스트 항목 전체 목록
 *   POST   /api/roulette-list       — 리스트 항목 추가
 *   PUT    /api/roulette-list/:id   — 리스트 항목 수정 (이름·타입·합계)
 *   POST   /api/roulette-list/:id/reset — 리스트 항목 합계 초기화
 *   DELETE /api/roulette-list/:id   — 리스트 항목 삭제
 */

import { api } from './base'

export const rouletteApi = {
  /** 룰렛 전체 목록 조회 */
  list: () => api.get('/api/roulette'),

  /**
   * 룰렛 추가.
   * @param data name·enabled·triggerAmounts·items·theme·mode 등
   */
  create: (data: object) => api.post('/api/roulette', data),

  /**
   * 룰렛 수정. ID는 URL 인코딩 처리됨.
   * @param id   수정할 룰렛 ID
   * @param data 변경할 필드
   */
  update: (id: string, data: object) =>
    api.put(`/api/roulette/${encodeURIComponent(id)}`, data),

  /**
   * 룰렛 삭제.
   * @param id 삭제할 룰렛 ID
   */
  delete: (id: string) =>
    api.delete(`/api/roulette/${encodeURIComponent(id)}`),

  /**
   * 테스트 스핀 — 오버레이 브라우저 소스에 임의 결과를 전송한다.
   * OBS에 오버레이가 열려 있어야 동작.
   * @param rouletteId 스핀할 룰렛 ID (미지정 시 활성 룰렛 중 첫 번째)
   */
  test: (rouletteId?: string) =>
    api.post('/api/overlay/test/roulette', { rouletteId }),

  /** 테스트 스핀이 리스트 항목에 실제로 반영되는지 여부 조회 */
  getTestList: () => api.get('/api/roulette/test-list'),

  /**
   * 테스트 스핀의 리스트 반영 여부 설정.
   * @param enabled true → 테스트 스핀 결과가 리스트 합계에 누적됨
   */
  setTestList: (enabled: boolean) =>
    api.post('/api/roulette/test-list', { enabled }),
}

export const rouletteListApi = {
  /** 리스트 항목 전체 목록 조회. Socket.IO 'rouletteList:update' 이벤트로도 실시간 업데이트됨. */
  list: () => api.get('/api/roulette-list'),

  /**
   * 리스트 항목 추가.
   * @param data.name 항목 이름 (예: '딜량', '방해 횟수')
   * @param data.type 'numeric' = 숫자 누적 / 'count' = 횟수 카운트
   */
  create: (data: { name: string; type: 'numeric' | 'count' }) =>
    api.post('/api/roulette-list', data),

  /**
   * 리스트 항목 이름·타입 수정.
   */
  update: (id: string, data: { name?: string; type?: 'numeric' | 'count' }) =>
    api.put(`/api/roulette-list/${encodeURIComponent(id)}`, data),

  /**
   * 리스트 항목 합계(total)를 직접 수정.
   * 룰렛 결과와 별개로 수동으로 숫자를 조정할 때 사용.
   * @param total 새로운 합계 값
   */
  setTotal: (id: string, total: number) =>
    api.put(`/api/roulette-list/${encodeURIComponent(id)}`, { total }),

  /**
   * 리스트 항목 합계를 0으로 초기화.
   * 새 방송 시작 전에 초기화할 때 사용.
   */
  reset: (id: string) =>
    api.post(`/api/roulette-list/${encodeURIComponent(id)}/reset`),

  /**
   * 리스트 항목 삭제. 연결된 룰렛의 listItemId도 함께 해제해야 함.
   */
  delete: (id: string) =>
    api.delete(`/api/roulette-list/${encodeURIComponent(id)}`),
}
