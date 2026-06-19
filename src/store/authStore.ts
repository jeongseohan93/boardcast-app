/**
 * [인증 상태 스토어 — Zustand]
 *
 * 앱 전역의 인증 상태를 관리한다.
 * App.tsx가 마운트되면 checkAuth()를 호출해 서버 상태를 동기화한다.
 *
 * 상태 의미:
 *   isLoading      — 첫 checkAuth() 완료 전. true이면 스피너 표시
 *   hasCredentials — clientId/clientSecret 등록 여부 (온보딩 1단계)
 *   isAuthenticated — accessToken + channelId 보유 여부 (온보딩 2단계)
 *
 * 분기 로직 (App.tsx):
 *   !hasCredentials → 온보딩 (자격증명 입력 단계)
 *   hasCredentials && !isAuthenticated → 온보딩 (OAuth 로그인 단계)
 *   hasCredentials && isAuthenticated  → 메인 UI
 */

import { create } from 'zustand'
import { authApi } from '../api/client'

interface AuthState {
  isAuthenticated: boolean
  hasCredentials: boolean
  channelId: string | null
  channelName: string | null
  channelImageUrl: string | null
  followerCount: number
  isLoading: boolean
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
  setFollowerCount: (count: number) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hasCredentials: false,
  channelId: null,
  channelName: null,
  channelImageUrl: null,
  followerCount: 0,
  isLoading: true,
  setFollowerCount: (count: number) => set({ followerCount: count }),

  // GET /auth/status 응답으로 전체 상태 갱신
  checkAuth: async () => {
    try {
      const res = await authApi.status()
      const data = res.data
      set({
        isAuthenticated: data.isAuthenticated,
        hasCredentials: data.hasCredentials,
        channelId: data.channelId,
        channelName: data.channelName,
        channelImageUrl: data.channelImageUrl,
        followerCount: data.followerCount,
        isLoading: false,
      })
    } catch {
      // 서버 미응답(앱 시작 직후 타이밍 등) 시 로딩만 해제, 온보딩으로 이동
      set({ isLoading: false })
    }
  },

  // POST /auth/logout → 서버 토큰 삭제 + 로컬 상태 초기화
  logout: async () => {
    await authApi.logout()
    set({
      isAuthenticated: false,
      channelId: null,
      channelName: null,
      channelImageUrl: null,
      followerCount: 0,
    })
  },
}))
