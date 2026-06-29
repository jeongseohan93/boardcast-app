/**
 * [대시보드 페이지]
 *
 * 방송 중 가장 자주 보는 메인 화면.
 * 통계 수치·방송 설정·최근 이벤트·실시간 채팅을 한 화면에 보여준다.
 *
 * ── 구조 ────────────────────────────────────────────────────────────────
 *
 *   ┌─────────────────────────────────────────────┬──────────────┐
 *   │  헤더 (채널정보 + CHZZK 연결상태 + 위치편집) │              │
 *   ├─────────────────────────────────────────────┤              │
 *   │  [통계 카드 × 4]                             │   채팅 패널  │
 *   ├───────────────────────┬─────────────────────┤  (ChatPanel) │
 *   │   방송 설정 카드       │  최근 이벤트 피드    │              │
 *   │  (LiveSettingCard)    │ (RecentEventsFeed)  │              │
 *   └───────────────────────┴─────────────────────┴──────────────┘
 *
 *   채팅 패널과 최근 이벤트의 위치는 layoutEditing 모드에서 좌우 이동 가능.
 *
 * ── 책임 분리 ────────────────────────────────────────────────────────────
 *
 *   이 파일(DashboardPage):
 *     - summary(집계) 데이터 로딩 및 소켓 이벤트 누적
 *     - CHZZK 세션 연결 상태 폴링 (5초 간격)
 *     - 레이아웃 편집 상태(chatSide, eventSide) 관리
 *     - 헤더 렌더링
 *
 *   하위 컴포넌트로 위임:
 *     - StatCards        → components/dashboard/StatCards.tsx
 *     - LiveSettingCard  → components/dashboard/LiveSettingCard.tsx (자체 데이터 로드)
 *     - RecentEventsFeed → components/dashboard/RecentEventsFeed.tsx
 *     - ChatPanel        → components/dashboard/ChatPanel.tsx (자체 상태 관리)
 */

import { useEffect, useRef, useState } from 'react'
import { Monitor, Radio, RefreshCw, WifiOff, LayoutGrid } from 'lucide-react'
import { eventsApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSocket } from '../hooks/useSocket'
import StatCards from '../components/dashboard/StatCards'
import LiveSettingCard from '../components/dashboard/LiveSettingCard'
import ChzzkRemotePanel from '../components/dashboard/ChzzkRemotePanel'
import RecentEventsFeed from '../components/dashboard/RecentEventsFeed'
import ChatPanel from '../components/dashboard/ChatPanel'
import type { Summary, RecentEvent } from '../components/dashboard/types'

export default function DashboardPage() {
  const { channelName, followerCount } = useAuthStore()
  const socket = useSocket()

  /* 오늘/이달 집계 + 최근 이벤트 */
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  /* 소켓 이벤트로 누적되는 실시간 증분값 */
  const [rtDonation, setRtDonation] = useState(0)
  const [rtSub,      setRtSub]      = useState(0)
  const [rtFollow,   setRtFollow]   = useState(0)

  /* CHZZK 세션 연결 상태 (null = 아직 확인 전) */
  const [chzzkConnected, setChzzkConnected] = useState<boolean | null>(null)
  const [reconnecting,   setReconnecting]   = useState(false)

  /* 레이아웃 편집 상태 */
  const [layoutEditing, setLayoutEditing] = useState(false)
  const [chatSide,  setChatSide]  = useState<'left' | 'right'>(() =>
    (localStorage.getItem('dashChatSide') as 'left' | 'right') || 'right'
  )
  const [eventSide, setEventSide] = useState<'left' | 'right'>(() =>
    (localStorage.getItem('dashEventSide') as 'left' | 'right') || 'right'
  )
  const [mainPanel, setMainPanel] = useState<'settings' | 'remote'>(() =>
    (localStorage.getItem('dashMainPanel') as 'settings' | 'remote') || 'settings'
  )

  const socketInit = useRef(false)

  /* ── 집계 데이터 로드 ───────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true)
    setRtDonation(0); setRtSub(0); setRtFollow(0)
    try {
      const res = await eventsApi.summary()
      setSummary(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  /* ── CHZZK 세션 연결 상태 폴링 (5초 간격) ─────────────────────────── */
  useEffect(() => {
    const check = () => {
      fetch('http://localhost:3001/api/session-status')
        .then((r) => r.json())
        .then((d) => setChzzkConnected(d.connected))
        .catch(() => setChzzkConnected(false))
    }
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])

  const handleReconnect = async () => {
    setReconnecting(true)
    try {
      await fetch('http://localhost:3001/api/session-reconnect', { method: 'POST' })
      /* 재연결 요청 후 2초 뒤 상태 재확인 */
      setTimeout(() => {
        fetch('http://localhost:3001/api/session-status')
          .then((r) => r.json())
          .then((d) => setChzzkConnected(d.connected))
      }, 2000)
    } catch {}
    setReconnecting(false)
  }

  /* ── 소켓 이벤트 → 실시간 증분 누적 + 최근 이벤트 피드 업데이트 ─── */
  useEffect(() => {
    if (!socket || socketInit.current) return
    socketInit.current = true

    const pushEvent = (e: RecentEvent) =>
      setSummary((prev) =>
        prev ? { ...prev, recentEvents: [e, ...prev.recentEvents].slice(0, 20) } : prev
      )

    socket.on('donation', (data: { amount: number; nickname: string }) => {
      setRtDonation((p) => p + (data.amount || 0))
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'donation', nickname: data.nickname, amount: data.amount, created_at: new Date().toISOString() }
        return { ...prev, today: { ...prev.today, donationSum: prev.today.donationSum + (data.amount || 0) }, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    })

    socket.on('subscription', (data: { nickname: string; month?: number }) => {
      setRtSub((p) => p + 1)
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'subscription', nickname: data.nickname, month: data.month, created_at: new Date().toISOString() }
        return { ...prev, today: { ...prev.today, subscriptionCount: prev.today.subscriptionCount + 1 }, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    })

    socket.on('follow', (data: { followerCount: number; nickname?: string; removedUnfollowCount?: number }) => {
      setRtFollow((p) => p + 1 + (data.removedUnfollowCount ?? 0))
      pushEvent({ id: Date.now(), eventType: 'follow', nickname: data.nickname, follower_count: data.followerCount, created_at: new Date().toISOString() })
    })

    socket.on('unfollow', (data: { followerCount: number; nickname?: string }) => {
      setRtFollow((p) => p - 1)
      pushEvent({ id: Date.now(), eventType: 'unfollow', nickname: data.nickname, follower_count: data.followerCount, created_at: new Date().toISOString() })
    })

    return () => {
      socket.off('donation')
      socket.off('subscription')
      socket.off('follow')
      socket.off('unfollow')
      socketInit.current = false
    }
  }, [socket])

  /* ── 레이아웃 토글 핸들러 ─────────────────────────────────────────── */
  const toggleChatSide = () => {
    const next = chatSide === 'right' ? 'left' : 'right'
    setChatSide(next)
    localStorage.setItem('dashChatSide', next)
  }
  const toggleEventSide = () => {
    const next = eventSide === 'right' ? 'left' : 'right'
    setEventSide(next)
    localStorage.setItem('dashEventSide', next)
  }
  const selectMainPanel = (next: 'settings' | 'remote') => {
    setMainPanel(next)
    localStorage.setItem('dashMainPanel', next)
  }

  /* ── 통계 수치 계산 ─────────────────────────────────────────────────── */
  const todayDonation     = (summary?.today.donationSum ?? 0) + rtDonation
  const todaySubscription = (summary?.today.subscriptionCount ?? 0) + rtSub
  const todayFollow       =
    (summary?.today.netFollowCount ??
      ((summary?.today.followCount ?? 0) - (summary?.today.unfollowCount ?? 0))) + rtFollow

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* ── 헤더 ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-card shrink-0">
        {/* 채널 아바타 + 이름 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-mint to-teal-400 flex items-center justify-center text-bg-outer font-bold text-base shrink-0 shadow-md">
            {channelName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-tight">{channelName || '채널'}</p>
            <p className="text-xs text-text-muted leading-tight">치지직 방송 도우미</p>
          </div>
        </div>

        {/* CHZZK 연결 상태 + 위치 편집 + 새로고침 */}
        <div className="flex items-center gap-3">
          {chzzkConnected === false ? (
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <WifiOff size={12} />
              {reconnecting ? '연결 중...' : '연결 안됨 · 클릭하여 재연결'}
            </button>
          ) : chzzkConnected === true ? (
            <span className="flex items-center gap-1.5 text-xs text-accent-mint bg-accent-mint/10 border border-accent-mint/20 rounded-lg px-2.5 py-1.5">
              <img src="/chzzklogo_kor(Green).png" alt="CHZZK" className="h-3.5 w-auto object-contain shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse shrink-0" />
              CHZZK 연결됨
            </span>
          ) : null}

          <div className="flex items-center overflow-hidden rounded-lg border border-border bg-bg-outer">
            <button
              type="button"
              onClick={() => selectMainPanel('settings')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                mainPanel === 'settings'
                  ? 'bg-accent-mint text-bg-outer'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <Radio size={12} />
              방송 설정
            </button>
            <button
              type="button"
              onClick={() => selectMainPanel('remote')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                mainPanel === 'remote'
                  ? 'bg-accent-mint text-bg-outer'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <Monitor size={12} />
              리모콘
            </button>
          </div>

          <button
            onClick={() => setLayoutEditing((v) => !v)}
            className={`flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 transition-colors ${
              layoutEditing
                ? 'border-accent-mint text-accent-mint bg-accent-mint/10'
                : 'border-border text-text-secondary hover:text-text-primary hover:border-accent-mint/40'
            }`}
          >
            <LayoutGrid size={12} />
            {layoutEditing ? '완료' : '위치 편집'}
          </button>

          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 바디 ──────────────────────────────────────────────────────── */}
      <div className={`flex flex-1 min-h-0 overflow-hidden gap-3 p-3 ${mainPanel === 'settings' && chatSide === 'left' ? 'flex-row-reverse' : ''}`}>

        {/* 왼쪽 영역: 통계 + (방송설정 | 최근이벤트) */}
        <div className="flex-1 flex flex-col gap-3">

          <StatCards
            followerCount={followerCount}
            todayDonation={todayDonation}
            todaySubscription={todaySubscription}
            todayFollow={todayFollow}
          />

          <div className={`flex-1 flex min-h-0 gap-3 ${mainPanel === 'settings' && eventSide === 'left' ? 'flex-row-reverse' : ''}`}>
            {mainPanel === 'settings' ? (
              <>
                <LiveSettingCard />

                <RecentEventsFeed
                  summary={summary}
                  layoutEditing={layoutEditing}
                  eventSide={eventSide}
                  onToggleEventSide={toggleEventSide}
                />
              </>
            ) : (
              <ChzzkRemotePanel />
            )}
          </div>
        </div>

        {/* 채팅 패널 */}
        {mainPanel === 'settings' && (
          <ChatPanel
            layoutEditing={layoutEditing}
            chatSide={chatSide}
            onToggleChatSide={toggleChatSide}
          />
        )}

      </div>
    </div>
  )
}
