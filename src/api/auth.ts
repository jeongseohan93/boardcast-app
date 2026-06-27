/**
 * [인증 API]
 *
 * Chzzk OAuth 토큰 발급·갱신·로그아웃 및 Client ID/Secret 저장을 담당한다.
 * Electron safeStorage에 토큰을 암호화 저장하는 로직은 서버(electron/main.ts)에 있다.
 *
 * 엔드포인트 목록:
 *   GET  /auth/status       — 현재 인증 상태 확인 (isAuthenticated, hasCredentials 등)
 *   POST /auth/token        — 인가 코드로 액세스 토큰 발급
 *   POST /auth/refresh      — 리프레시 토큰으로 액세스 토큰 갱신
 *   POST /auth/logout       — 토큰 폐기 및 로컬 삭제
 *   POST /auth/credentials  — Client ID / Client Secret 저장
 *   GET  /auth/credentials  — 저장된 Client ID 확인 (Secret은 반환하지 않음)
 */

import { api } from './base'

export const authApi = {
  /** 현재 인증 상태 확인. 앱 시작 시 1회 호출해 Zustand authStore를 초기화한다. */
  status: () => api.get('/auth/status'),

  /**
   * OAuth 인가 코드로 토큰 발급.
   * @param code  치지직 OAuth 콜백으로 받은 인가 코드
   * @param state CSRF 방지용 state 값
   */
  token: (code: string, state: string) =>
    api.post('/auth/token', { code, state }),

  /** 저장된 리프레시 토큰으로 액세스 토큰 갱신. 만료 전 자동 갱신에 사용. */
  refresh: () => api.post('/auth/refresh'),

  /** 토큰 폐기 + 로컬 저장 삭제. 로그아웃 버튼에서 호출. */
  logout: () => api.post('/auth/logout'),

  /**
   * Chzzk 개발자 센터에서 발급받은 Client ID/Secret 저장.
   * Electron safeStorage를 통해 OS 수준 암호화로 보관됨.
   * @param clientId     개발자 센터 앱의 Client ID
   * @param clientSecret 개발자 센터 앱의 Client Secret
   */
  saveCredentials: (clientId: string, clientSecret: string) =>
    api.post('/auth/credentials', { clientId, clientSecret }),

  /** 저장된 Client ID 조회. Secret은 보안상 응답에 포함되지 않는다. */
  getCredentials: () => api.get('/auth/credentials'),
}
