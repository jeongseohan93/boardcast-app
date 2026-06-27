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
import BotPage from './pages/BotPage'
import NoticePage from './pages/NoticePage'
import VideoDonationPage from './pages/VideoDonationPage'
import AlertHistoryPage from './pages/AlertHistoryPage'
import FollowerListPage from './pages/FollowerListPage'
import RestrictionPage from './pages/RestrictionPage'
import RoulettePage from './pages/RoulettePage'
import TamagotchiPage from './pages/TamagotchiPage'
import EmotePartyPage from './pages/EmotePartyPage'
import OverlayPage from './pages/OverlayPage'
import OverlaySettingsPage from './pages/OverlaySettingsPage'
import VotePage from './pages/VotePage'
import SettingsPage from './pages/SettingsPage'
import StatisticsPage from './pages/StatisticsPage'
import PubgStatsPage from './pages/PubgStatsPage'
import MissionPage from './pages/MissionPage'
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bot"       element={<BotPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/video-donation" element={<VideoDonationPage />} />
        <Route path="/chat" element={<Navigate to="/dashboard" replace />} />
        <Route path="/live" element={<Navigate to="/dashboard" replace />} />
        <Route path="/history" element={<AlertHistoryPage />} />
        <Route path="/followers" element={<FollowerListPage />} />
        <Route path="/restrictions" element={<RestrictionPage />} />
        <Route path="/roulette" element={<RoulettePage />} />
        <Route path="/tamagotchi" element={<TamagotchiPage />} />
        <Route path="/emote-party" element={<EmotePartyPage />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/overlay-settings" element={<OverlaySettingsPage />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/pubg" element={<PubgStatsPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/debug-events" element={<RawEventDebugPage />} />
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
