/**
 * [알림 히스토리 페이지]
 *
 * 방송 중 발생한 후원·구독·팔로우·팔로우취소 이벤트를 조회하는 페이지.
 * 탭으로 이벤트 유형을 필터링하고, 날짜 범위로 추가 필터링한다.
 *
 * ── 구조 ────────────────────────────────────────────────────────────────
 *
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  헤더 (제목 + 현재 필터 기준 요약 통계 배지)                        │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │  탭 바 (전체 / 후원 / 구독 / 팔로우 / 팔로우취소)                  │
 *   │  날짜 필터 (오늘 / 이번 주 / 이번 달 / 전체)                       │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │  테이블 영역 (탭별로 해당 컴포넌트 렌더링)                          │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │  페이지네이션 (전체 탭 제외)                                        │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * ── 책임 분리 ─────────────────────────────────────────────────────────
 *
 *   이 파일(AlertHistoryPage):
 *     - tab, dateFilter, page 상태 관리
 *     - donations, subscriptions, followEvents, unfollowEvents 로드 및 상태
 *     - restrictedIds, busyIds 관리 (팔로우취소 탭의 활동제한 기능)
 *     - handleDelete, handleRestriction 핸들러
 *
 *   하위 컴포넌트로 위임:
 *     - DonationTable     → components/alert/DonationTable.tsx
 *     - SubscriptionTable → components/alert/SubscriptionTable.tsx
 *     - FollowTable       → components/alert/FollowTable.tsx
 *     - AllEventsTable    → components/alert/AllEventsTable.tsx
 */

import { useEffect, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Gift, Heart, HeartOff, History, Star,
} from 'lucide-react'
import { channelApi, eventsApi } from '../api/client'
import { useToastStore } from '../store/toastStore'
import DonationTable from '../components/alert/DonationTable'
import SubscriptionTable from '../components/alert/SubscriptionTable'
import FollowTable from '../components/alert/FollowTable'
import AllEventsTable from '../components/alert/AllEventsTable'
import type { Donation, FollowEvent, Subscription, Tab, DateFilter } from '../components/alert/types'
import { DATE_FILTERS, getDateRange, restrictionIdsFromResponse } from '../components/alert/types'
import { TABS } from '../components/alert/constants'

const LIMIT = 30

export default function AlertHistoryPage() {
  const addToast = useToastStore((s) => s.addToast)

  const [tab,        setTab]        = useState<Tab>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [page,       setPage]       = useState(0)

  const [donations,      setDonations]      = useState<Donation[]>([])
  const [subscriptions,  setSubscriptions]  = useState<Subscription[]>([])
  const [followEvents,   setFollowEvents]   = useState<FollowEvent[]>([])
  const [unfollowEvents, setUnfollowEvents] = useState<FollowEvent[]>([])
  const [followTotal,    setFollowTotal]    = useState(0)
  const [unfollowTotal,  setUnfollowTotal]  = useState(0)
  const [donTotal,       setDonTotal]       = useState(0)

  /* 팔로우 취소 탭 전용 — 활동제한 채널 ID 집합 */
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set())
  const [busyIds,       setBusyIds]       = useState<Set<string>>(new Set())

  /* ── 데이터 로드 ────────────────────────────────────────────────── */
  const loadRestrictions = async () => {
    const res = await channelApi.getRestrictions({ size: 30 })
    setRestrictedIds(restrictionIdsFromResponse(res.data))
  }

  const load = async () => {
    const range  = getDateRange(dateFilter)
    const paging = { limit: LIMIT, offset: page * LIMIT }
    try {
      if (tab === 'all' || tab === 'donation') {
        const res = await eventsApi.donations({ ...paging, ...range })
        setDonations(res.data.data); setDonTotal(res.data.total)
      } else { setDonations([]) }

      if (tab === 'all' || tab === 'subscription') {
        const res = await eventsApi.subscriptions(paging)
        setSubscriptions(res.data.data)
      } else { setSubscriptions([]) }

      if (tab === 'all' || tab === 'follow') {
        const res = await eventsApi.follows({ ...paging, ...range, eventType: 'FOLLOW' })
        setFollowEvents(res.data.data); setFollowTotal(res.data.total)
      } else { setFollowEvents([]); setFollowTotal(0) }

      if (tab === 'all' || tab === 'unfollow') {
        const [res] = await Promise.all([
          eventsApi.follows({ ...paging, ...range, eventType: 'UNFOLLOW' }),
          loadRestrictions(),
        ])
        setUnfollowEvents(res.data.data); setUnfollowTotal(res.data.total)
      } else { setUnfollowEvents([]); setUnfollowTotal(0) }
    } catch {
      addToast({ type: 'error', title: '히스토리 로드 실패' })
    }
  }

  /* 탭·날짜 필터 변경 시 페이지 리셋 */
  useEffect(() => { setPage(0) }, [tab, dateFilter])
  useEffect(() => { void load() }, [tab, dateFilter, page])

  /* ── 핸들러 ──────────────────────────────────────────────────────── */
  const handleDelete = async (table: string, id: number) => {
    try { await eventsApi.deleteEvent(table, id); await load() }
    catch { addToast({ type: 'error', title: '삭제 실패' }) }
  }

  const setBusy = (channelId: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(channelId); else next.delete(channelId)
      return next
    })
  }

  const handleRestriction = async (row: FollowEvent) => {
    const targetId = row.target_channel_id
    if (!targetId) return
    const isRestricted = restrictedIds.has(targetId)
    setBusy(targetId, true)
    try {
      if (isRestricted) {
        await channelApi.removeRestriction(targetId)
        setRestrictedIds((prev) => { const next = new Set(prev); next.delete(targetId); return next })
        addToast({ type: 'info', title: `${row.nickname || '사용자'} 활동제한 해제` })
      } else {
        await channelApi.addRestriction(targetId)
        setRestrictedIds((prev) => new Set(prev).add(targetId))
        addToast({ type: 'info', title: `${row.nickname || '사용자'} 활동제한 추가` })
      }
    } catch {
      addToast({ type: 'error', title: '활동제한 처리 실패' })
    } finally {
      setBusy(targetId, false)
    }
  }

  /* ── 요약 통계 계산 ──────────────────────────────────────────────── */
  const donSum    = donations.reduce((s, d) => s + d.amount, 0)
  const netFollow = followTotal - unfollowTotal
  const hasEvents = donations.length > 0 || subscriptions.length > 0 || followEvents.length > 0 || unfollowEvents.length > 0

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* ── 헤더 ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <History size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">알림 히스토리</h1>

        {/* 현재 필터 기준 요약 통계 배지 */}
        {hasEvents && (
          <div className="ml-auto flex items-center gap-2">
            {donations.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                <Gift size={11} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">{donSum.toLocaleString()}</span>
                <span className="text-[10px] text-text-muted">치즈 · {donTotal}건</span>
              </div>
            )}
            {subscriptions.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-accent-purple/10 border border-accent-purple/20">
                <Star size={11} className="text-accent-purple" />
                <span className="text-xs font-bold text-accent-purple">{subscriptions.length}</span>
                <span className="text-[10px] text-text-muted">구독</span>
              </div>
            )}
            {followEvents.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pink-400/10 border border-pink-400/20">
                <Heart size={11} className="text-pink-400" />
                <span className="text-xs font-bold text-pink-400">+{followTotal}</span>
                <span className="text-[10px] text-text-muted">팔로우</span>
              </div>
            )}
            {unfollowEvents.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-400/10 border border-red-400/20">
                <HeartOff size={11} className="text-red-400" />
                <span className="text-xs font-bold text-red-400">-{unfollowTotal}</span>
                <span className="text-[10px] text-text-muted">언팔로우</span>
              </div>
            )}
            {(followTotal > 0 || unfollowTotal > 0) && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${netFollow >= 0 ? 'bg-pink-400/10 border-pink-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
                <Heart size={11} className={netFollow >= 0 ? 'text-pink-400' : 'text-red-400'} />
                <span className={`text-xs font-bold ${netFollow >= 0 ? 'text-pink-400' : 'text-red-400'}`}>{netFollow >= 0 ? '+' : ''}{netFollow}</span>
                <span className="text-[10px] text-text-muted">순 팔로우</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 탭 + 날짜 필터 ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-bg-card flex-wrap">
        <div className="flex gap-0.5 bg-bg-outer border border-border rounded-xl p-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                tab === item.value
                  ? 'bg-accent-mint text-bg-outer shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {DATE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                dateFilter === filter.value
                  ? 'border-accent-mint/50 text-accent-mint bg-accent-mint/10'
                  : 'border-border text-text-muted hover:text-text-secondary hover:border-border/80'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 테이블 영역 ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === 'all' && hasEvents && (
          <AllEventsTable
            donations={donations}
            subscriptions={subscriptions}
            followEvents={followEvents}
            unfollowEvents={unfollowEvents}
            onDelete={handleDelete}
          />
        )}
        {tab === 'donation' && donations.length > 0 && (
          <DonationTable rows={donations} onDelete={(id) => void handleDelete('donations', id)} />
        )}
        {tab === 'subscription' && subscriptions.length > 0 && (
          <SubscriptionTable rows={subscriptions} onDelete={(id) => void handleDelete('subscriptions', id)} />
        )}
        {tab === 'follow' && followEvents.length > 0 && (
          <FollowTable
            title="팔로우"
            icon={<Heart size={13} className="text-pink-400" />}
            rows={followEvents}
            tone="follow"
            onDelete={(id) => void handleDelete('follows', id)}
          />
        )}
        {tab === 'unfollow' && unfollowEvents.length > 0 && (
          <FollowTable
            title="팔로우 취소"
            icon={<HeartOff size={13} className="text-red-400" />}
            rows={unfollowEvents}
            tone="unfollow"
            restrictedIds={restrictedIds}
            busyIds={busyIds}
            onRestriction={(row) => void handleRestriction(row)}
            onDelete={(id) => void handleDelete('follows', id)}
          />
        )}

        {!hasEvents && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-3">
              <History size={24} className="text-border" />
            </div>
            <p className="text-sm font-medium text-text-muted">이벤트 기록이 없습니다</p>
            <p className="text-xs text-text-muted/60 mt-1">방송 중 발생한 후원, 구독, 팔로우 이벤트가 표시됩니다</p>
          </div>
        )}
      </div>

      {/* ── 페이지네이션 (전체 탭 제외) ──────────────────────────────── */}
      {tab !== 'all' && (
        <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border hover:border-accent-mint/40 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={12} /> 이전
          </button>
          <span className="text-xs text-text-muted px-2 py-1 bg-bg-card border border-border rounded-lg">{page + 1} 페이지</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border hover:border-accent-mint/40 rounded-lg transition-colors"
          >
            다음 <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
