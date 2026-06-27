/**
 * [앱 루트 컴포넌트]
 *
 * 앱 전체의 라우팅과 인증 분기를 담당한다.
 *
 * ── 렌더링 분기 흐름 ────────────────────────────────────────────────────────
 *
 *   앱 시작
 *     └─ useEffect → checkAuth() → GET /auth/status
 *           │
 *           ├─ isLoading = true  → 스피너 표시 (API 응답 대기 중)
 *           │
 *           └─ isLoading = false
 *                 │
 *                 ├─ !hasCredentials || !isAuthenticated
 *                 │     → OnboardingPage (인증 안 됨 / 자격증명 미등록)
 *                 │       단, /settings는 온보딩 중에도 접근 가능
 *                 │       (Client ID/Secret 재입력이 설정 페이지에 있기 때문)
 *                 │
 *                 └─ 인증 완료 → Layout + 라우트 트리 (메인 UI)
 *
 * ── HashRouter를 쓰는 이유 ──────────────────────────────────────────────────
 *
 *   Electron은 index.html을 file:// 프로토콜로 직접 연다.
 *   BrowserRouter가 의존하는 HTML5 History API는 서버 요청을 전제로 하므로,
 *   file:// 환경에서 /path로 이동하면 "파일을 찾을 수 없음" 오류가 난다.
 *   HashRouter는 URL 해시(#) 뒤의 경로만 변경하므로 서버 요청이 없어도 동작한다.
 *   예: file:///index.html#/dashboard
 *
 * ── 라우트 구조 ─────────────────────────────────────────────────────────────
 *
 *   /                  → /dashboard 리다이렉트
 *   /dashboard         → DashboardPage       (대시보드 + 리모콘 웹뷰)
 *   /broadcast         → BroadcastManagePage (공지/미션/투표/영도)
 *   /stream-settings   → StreamSettingsPage  (봇/후원/팔로워/이모티콘/룰렛/다마고치)
 *   /channel           → ChannelPage         (통계/활동제한)
 *   /overlay-hub       → OverlayHubPage      (오버레이 URL/설정)
 *   /pubg              → PubgStatsPage       (배그 전적)
 *   /debug-events      → RawEventDebugPage   (소켓 이벤트 디버그)
 *   /settings          → SettingsPage        (앱 환경설정)
 *
 *   [이전 URL 하위 호환 리다이렉트]
 *   사이드바 리팩터링 전에 사용하던 경로들을 그룹 허브 페이지로 302 리다이렉트.
 *   브라우저 히스토리나 localStorage에 저장된 경로가 있어도 404 없이 동작.
 *
 * ── TitleBar / ToastContainer 위치 ─────────────────────────────────────────
 *
 *   TitleBar : 앱 최상단 고정 (HashRouter 밖에 배치하면 라우팅 영향 없음)
 *   ToastContainer : 라우터 외부에서 전역 포지션 fixed로 띄움.
 *                    어느 페이지에 있어도 toast가 동일 위치에 표시됨.
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

/**
 * 인증 분기 + 라우트 트리를 담당하는 내부 컴포넌트.
 *
 * App에서 분리한 이유:
 *   HashRouter 컨텍스트 안에서만 useNavigate/NavLink 등의 React Router 훅을 쓸 수 있다.
 *   useSocket도 내부에서 호출하므로, Socket.IO 초기화가 라우터 마운트 이후에 이루어진다.
 */
function AppInner() {
  const { isAuthenticated, hasCredentials, isLoading } = useAuthStore()

  /**
   * Socket.IO 연결 — 인증 여부와 무관하게 항상 연결 유지.
   *
   * 서버(Express + Socket.IO)는 앱 시작 시 항상 로컬에서 실행 중이므로
   * 인증 전에도 연결이 가능하다. 인증 완료 후 이벤트를 받기 위해 미리 연결.
   */
  useSocket()

  /* 첫 로드 시 /auth/status API 응답을 기다리는 동안 스피너 표시 */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-outer">
        <div className="text-text-secondary text-sm animate-pulse">로딩 중...</div>
      </div>
    )
  }

  /**
   * 미인증 분기:
   *   hasCredentials = false : Client ID/Secret 미등록 (최초 실행 또는 재설치)
   *   isAuthenticated = false : 토큰 없음 / 만료 (재로그인 필요)
   *
   *   /settings 예외: SettingsPage에서 자격증명을 입력·재발급할 수 있으므로
   *   온보딩 중에도 접근을 허용한다. 그 외 모든 경로는 OnboardingPage로 보냄.
   */
  if (!hasCredentials || !isAuthenticated) {
    return (
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    )
  }

  /* 인증 완료: Layout(사이드바 + 헤더) 안에서 메인 라우트 렌더링 */
  return (
    <Layout>
      <Routes>
        {/* 기본 진입점: 대시보드로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── 메인 페이지 ─────────────────────────────────────── */}
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/broadcast"       element={<BroadcastManagePage />} />
        <Route path="/stream-settings" element={<StreamSettingsPage />} />
        <Route path="/channel"         element={<ChannelPage />} />
        <Route path="/overlay-hub"     element={<OverlayHubPage />} />
        <Route path="/pubg"            element={<PubgStatsPage />} />
        <Route path="/debug-events"    element={<RawEventDebugPage />} />
        <Route path="/settings"        element={<SettingsPage />} />

        {/* ── 이전 URL 하위 호환 리다이렉트 ──────────────────── */}
        {/* 방송 설정 → /stream-settings 탭 허브로 이동 */}
        <Route path="/bot"             element={<Navigate to="/stream-settings" replace />} />
        <Route path="/history"         element={<Navigate to="/stream-settings" replace />} />
        <Route path="/roulette"        element={<Navigate to="/stream-settings" replace />} />
        <Route path="/followers"       element={<Navigate to="/stream-settings" replace />} />
        <Route path="/emote-party"     element={<Navigate to="/stream-settings" replace />} />
        <Route path="/tamagotchi"      element={<Navigate to="/stream-settings" replace />} />

        {/* 방송 관리 → /broadcast 탭 허브로 이동 */}
        <Route path="/notice"          element={<Navigate to="/broadcast" replace />} />
        <Route path="/mission"         element={<Navigate to="/broadcast" replace />} />
        <Route path="/vote"            element={<Navigate to="/broadcast" replace />} />
        <Route path="/video-donation"  element={<Navigate to="/broadcast" replace />} />

        {/* 채널 분석 → /channel 탭 허브로 이동 */}
        <Route path="/statistics"      element={<Navigate to="/channel" replace />} />
        <Route path="/restrictions"    element={<Navigate to="/channel" replace />} />

        {/* 오버레이 → /overlay-hub 탭 허브로 이동 */}
        <Route path="/overlay"         element={<Navigate to="/overlay-hub" replace />} />
        <Route path="/overlay-settings" element={<Navigate to="/overlay-hub" replace />} />

        {/* 알 수 없는 경로: 대시보드로 폴백 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

/**
 * 앱 루트 컴포넌트.
 *
 * 역할:
 *   1. 앱 시작 시 테마 적용 (applyAppTheme) — 깜빡임 없이 즉시 적용
 *   2. 인증 상태 확인 (checkAuth) — GET /auth/status → Zustand store 업데이트
 *   3. HashRouter, TitleBar, AppInner, ToastContainer 조합
 *
 * v7_startTransition / v7_relativeSplatPath:
 *   React Router v7 준비를 위한 future 플래그. 현재 v6를 쓰지만
 *   마이그레이션 경고를 없애고 나중 업그레이드를 쉽게 하기 위해 미리 켠다.
 */
export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    /* 저장된 테마를 즉시 적용해 흰 화면 깜빡임(FOUC) 방지 */
    applyAppTheme(getStoredAppTheme())

    /* 앱 시작 시 1회만 인증 상태 확인 */
    checkAuth()
  }, [checkAuth])

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* 전체 화면을 세로 방향 flex로 채움 */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* 커스텀 타이틀바 — Electron frame: false 설정 때문에 직접 구현 */}
        <TitleBar />

        {/* 타이틀바 아래 나머지 공간 전부를 AppInner가 차지 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AppInner />
        </div>
      </div>

      {/* 토스트 알림 — position: fixed 이므로 라우트 밖에서도 항상 최상위에 표시 */}
      <ToastContainer />
    </HashRouter>
  )
}
