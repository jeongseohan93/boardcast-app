/**
 * [다마고치 API]
 *
 * 채팅 참여형 다마고치 미니게임의 상태 조회, 초기화, 테마 변경을 담당한다.
 * 시청자가 채팅에 메시지를 보내면 다마고치의 체력·포만감이 올라간다.
 *
 * 엔드포인트:
 *   GET  /api/tamagotchi        — 다마고치 현재 상태 조회
 *   POST /api/tamagotchi/reset  — 다마고치 초기화 (새 방송용)
 *   POST /api/tamagotchi/theme  — 테마 변경
 *   POST /api/overlay/test/tamagotchi — 오버레이 테스트 (화면에 표시)
 */

import { api } from './base'

export const tamagotchiApi = {
  /** 다마고치 현재 상태 조회 (레벨, 체력, 포만감, 마지막 먹이 시간 등) */
  getState: () => api.get('/api/tamagotchi'),

  /**
   * 다마고치 상태 초기화. 새 방송 시작 전에 사용.
   * 레벨·포인트 전부 리셋된다.
   */
  reset: () => api.post('/api/tamagotchi/reset'),

  /**
   * 다마고치 오버레이 테마 변경.
   * @param theme 'classic' | 'pixel' | 'slime' | 'space'
   */
  setTheme: (theme: 'classic' | 'pixel' | 'slime' | 'space') =>
    api.post('/api/tamagotchi/theme', { theme }),

  /** 오버레이에 다마고치 테스트 애니메이션 전송 (OBS 브라우저 소스가 열려 있어야 함) */
  test: () => api.post('/api/overlay/test/tamagotchi'),
}
