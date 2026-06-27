/**
 * [PUBG 전적/딜 추적 API]
 *
 * PUBG API 키 설정, 플레이어 검색, 딜 추적(자동 리스트 차감) 기능을 담당한다.
 *
 * 딜 추적 흐름:
 *   1. PUBG API 키 저장 → 플레이어 닉네임·플랫폼 설정 → 차감할 rouletteListItem 선택
 *   2. 추적 활성화 → 서버가 5분 주기로 PUBG API를 폴링
 *   3. 경기 종료 감지 시 딜량을 연결된 리스트 항목에서 차감
 *
 * 엔드포인트:
 *   GET  /api/pubg/settings          — PUBG API 키 설정 조회
 *   POST /api/pubg/settings          — PUBG API 키 저장
 *   GET  /api/pubg/player            — 닉네임으로 플레이어 검색
 *   GET  /api/pubg/tracking          — 딜 추적 설정 + 마지막 결과 조회
 *   POST /api/pubg/tracking          — 딜 추적 설정 업데이트
 *   POST /api/pubg/tracking/poll     — 지금 즉시 폴링 (수동 확인)
 */

import { api } from './base'

export const pubgApi = {
  /** PUBG API 키 저장 여부 및 설정 조회 */
  getSettings: () => api.get('/api/pubg/settings'),

  /**
   * PUBG API 키 저장.
   * @param apiKey PUBG 공식 API 키 (developer.pubg.com에서 발급)
   */
  saveApiKey: (apiKey: string) => api.post('/api/pubg/settings', { apiKey }),

  /**
   * 닉네임으로 PUBG 플레이어 검색.
   * @param params.platform 'steam' | 'kakao' | 'psn' | 'xbox'
   * @param params.name     검색할 닉네임
   */
  searchPlayer: (params: { platform: string; name: string }) =>
    api.get('/api/pubg/player', { params }),

  /**
   * 딜 추적 현재 설정 + 마지막 적용 결과 조회.
   * 응답에는 lastApplied (마지막 차감 딜량·시간), lastPolledAt, lastError 포함.
   */
  getTracking: () => api.get('/api/pubg/tracking'),

  /**
   * 딜 추적 설정 업데이트.
   * @param data.name              추적할 플레이어 닉네임
   * @param data.platform          플랫폼
   * @param data.listItemId        딜량을 차감할 rouletteListItem ID
   * @param data.enabled           추적 활성/비활성
   * @param data.includeTeamDamage 팀원 딜량 합산 여부
   */
  setTracking: (data: {
    name?: string
    platform?: string
    listItemId?: string
    enabled?: boolean
    includeTeamDamage?: boolean
  }) => api.post('/api/pubg/tracking', data),

  /**
   * 지금 즉시 폴링 수행 (서버의 5분 주기를 기다리지 않고 수동으로 확인).
   * 경기가 끝났으면 딜량을 즉시 차감한다.
   */
  pollNow: () => api.post('/api/pubg/tracking/poll'),
}
