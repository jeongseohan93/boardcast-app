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
import ToastContainer from './components/ToastContainer'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import BotPage from './pages/BotPage'
import AlertHistoryPage from './pages/AlertHistoryPage'
import RoulettePage from './pages/RoulettePage'
import OverlayPage from './pages/OverlayPage'
import SettingsPage from './pages/SettingsPage'

function AppInner() {
  const { isAuthenticated, hasCredentials, isLoading } = useAuthStore()

  // Socket.IO 연결 — 인증 여부와 무관하게 항상 연결 유지
  // (인증 전에도 서버가 실행 중이므로 연결 가능)
  useSocket()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-outer">
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bot"       element={<BotPage />} />
        <Route path="/chat" element={<Navigate to="/dashboard" replace />} />
        <Route path="/live" element={<Navigate to="/dashboard" replace />} />
        <Route path="/history" element={<AlertHistoryPage />} />
        <Route path="/roulette" element={<RoulettePage />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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
    checkAuth()
  }, [checkAuth])

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppInner />
      {/* ToastContainer: 도네이션/구독/팔로우 알림을 화면 우하단에 표시 */}
      <ToastContainer />
    </HashRouter>
  )
}
