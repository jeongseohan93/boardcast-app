/**
 * [앱 루트 컴포넌트]
 *
 * 앱 전체의 라우팅과 인증 분기를 담당한다.
 *
 * 렌더링 분기:
 *   isLoading  → 스피너 (앱 첫 로드 시 /auth/status API 응답 대기 중)
 *   !hasCredentials || !isAuthenticated → OnboardingPage (미인증)
 *   인증 완료   → Layout + 8개 페이지 라우트 (메인 UI)
 *
 * HashRouter를 쓰는 이유:
 *   Electron에서 file:// 프로토콜로 index.html을 열면 BrowserRouter의
 *   History API가 동작하지 않는다. Hash(#)는 서버 요청 없이 클라이언트에서만 처리됨.
 */

import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useSocket } from './hooks/useSocket'
import Layout from './components/Layout'
import TitleBar from './components/TitleBar'
import ToastContainer from './components/ToastContainer'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import BroadcastManagePage from './pages/BroadcastManagePage'
import StreamSettingsPage from './pages/StreamSettingsPage'
import ChannelPage from './pages/ChannelPage'
import OverlayHubPage from './pages/OverlayHubPage'
import PubgStatsPage from './pages/PubgStatsPage'
import SettingsPage from './pages/SettingsPage'
import RawEventDebugPage from './pages/RawEventDebugPage'
import { applyAppTheme, getStoredAppTheme } from './utils/appTheme'

function AppInner() {
  const { isAuthenticated, hasCredentials, isLoading } = useAuthStore()

  // Socket.IO 연결 — 인증 여부와 무관하게 항상 연결 유지
  // (인증 전에도 서버가 실행 중이므로 연결 가능)
  useSocket()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-outer">
        <div className="text-text-secondary text-sm animate-pulse">로딩 중...</div>
      </div>
    )
  }

  // 자격증명(clientId/Secret) 미등록 또는 토큰 없음 → 온보딩
  // 예외: /settings는 온보딩 중에도 접근 가능 (자격증명 재입력 등)
  if (!hasCredentials || !isAuthenticated) {
    return (
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/broadcast"       element={<BroadcastManagePage />} />
        <Route path="/stream-settings" element={<StreamSettingsPage />} />
        <Route path="/channel"         element={<ChannelPage />} />
        <Route path="/overlay-hub"     element={<OverlayHubPage />} />
        <Route path="/pubg"            element={<PubgStatsPage />} />
        <Route path="/debug-events"    element={<RawEventDebugPage />} />
        <Route path="/settings"        element={<SettingsPage />} />
        {/* 기존 URL 호환 */}
        <Route path="/bot"             element={<Navigate to="/stream-settings" replace />} />
        <Route path="/history"         element={<Navigate to="/stream-settings" replace />} />
        <Route path="/roulette"        element={<Navigate to="/stream-settings" replace />} />
        <Route path="/followers"       element={<Navigate to="/stream-settings" replace />} />
        <Route path="/emote-party"     element={<Navigate to="/stream-settings" replace />} />
        <Route path="/tamagotchi"      element={<Navigate to="/stream-settings" replace />} />
        <Route path="/notice"          element={<Navigate to="/broadcast" replace />} />
        <Route path="/mission"         element={<Navigate to="/broadcast" replace />} />
        <Route path="/vote"            element={<Navigate to="/broadcast" replace />} />
        <Route path="/video-donation"  element={<Navigate to="/broadcast" replace />} />
        <Route path="/statistics"      element={<Navigate to="/channel" replace />} />
        <Route path="/restrictions"    element={<Navigate to="/channel" replace />} />
        <Route path="/overlay"         element={<Navigate to="/overlay-hub" replace />} />
        <Route path="/overlay-settings" element={<Navigate to="/overlay-hub" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  // 앱 시작 시 1회 인증 상태 확인
  // GET /auth/status → isAuthenticated, hasCredentials, channelId 등 설정
  useEffect(() => {
    applyAppTheme(getStoredAppTheme())
    checkAuth()
  }, [checkAuth])

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col h-screen overflow-hidden">
        <TitleBar />
        <div className="flex-1 min-h-0 overflow-hidden">
          <AppInner />
        </div>
      </div>
      <ToastContainer />
    </HashRouter>
  )
}
