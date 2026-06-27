import { useEffect, useState } from 'react'
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  History,
  Gift,
  Heart,
  Star,
  HeartOff,
  ShieldBan,
  ShieldCheck,
} from 'lucide-react'
import { channelApi, eventsApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

type Tab = 'all' | 'donation' | 'subscription' | 'follow' | 'unfollow'
type DateFilter = 'today' | 'week' | 'month' | 'all'

interface Donation {
  id: number
  nickname: string
  amount: number
  type: string
  message?: string
  created_at: string
}

interface Subscription {
  id: number
  nickname: string
  month?: number
  message?: string
  created_at: string
}

interface FollowEvent {
  id: number
  event_type?: 'FOLLOW' | 'UNFOLLOW'
  target_channel_id?: string | null
  nickname?: string | null
  follower_count: number
  created_at: string
}

interface RestrictionRow {
  restrictedChannelId?: string
}

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: '오늘', value: 'today' },
  { label: '이번 주', value: 'week' },
  { label: '이번 달', value: 'month' },
  { label: '전체', value: 'all' },
]

const TABS: { label: string; value: Tab; icon?: React.ReactNode }[] = [
  { label: '전체', value: 'all' },
  { label: '후원', value: 'donation', icon: <Gift size={11} /> },
  { label: '구독', value: 'subscription', icon: <Star size={11} /> },
  { label: '팔로우', value: 'follow', icon: <Heart size={11} /> },
  { label: '팔로우 취소', value: 'unfollow', icon: <HeartOff size={11} /> },
]

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (filter === 'today') { const today = toISO(now); return { startDate: today, endDate: today } }
  if (filter === 'week') { const s = new Date(now); s.setDate(s.getDate() - 6); return { startDate: toISO(s), endDate: toISO(now) } }
  if (filter === 'month') { return { startDate: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toISO(now) } }
  return {}
}

function restrictionIdsFromResponse(data: unknown): Set<string> {
  const rows = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown[] })?.data) ? (data as { data: unknown[] }).data : []
  return new Set(rows.map((row) => (row as RestrictionRow).restrictedChannelId).filter((id): id is string => !!id))
}

function Avatar({ name }: { name: string }) {
  const char = (name || '?')[0].toUpperCase()
  const palettes = [
    'bg-accent-mint/20 text-accent-mint',
    'bg-accent-purple/20 text-accent-purple',
    'bg-blue-400/20 text-blue-400',
    'bg-orange-400/20 text-orange-400',
    'bg-pink-400/20 text-pink-400',
  ]
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${palettes[char.charCodeAt(0) % palettes.length]}`}>
      {char}
    </div>
  )
}

function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="text-right leading-tight">
      <p className="text-xs text-text-secondary">{date}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{time}</p>
    </div>
  )
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

export default function AlertHistoryPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [tab, setTab] = useState<Tab>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [donations, setDonations] = useState<Donation[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [followEvents, setFollowEvents] = useState<FollowEvent[]>([])
  const [unfollowEvents, setUnfollowEvents] = useState<FollowEvent[]>([])
  const [followTotal, setFollowTotal] = useState(0)
  const [unfollowTotal, setUnfollowTotal] = useState(0)
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set())
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [donTotal, setDonTotal] = useState(0)
  const [page, setPage] = useState(0)
  const LIMIT = 30

  const loadRestrictions = async () => {
    const res = await channelApi.getRestrictions({ size: 30 })
    setRestrictedIds(restrictionIdsFromResponse(res.data))
  }

  const load = async () => {
    const range = getDateRange(dateFilter)
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
        setFollowEvents(res.data.data)
        setFollowTotal(res.data.total)
      } else { setFollowEvents([]); setFollowTotal(0) }

      if (tab === 'all' || tab === 'unfollow') {
        const [res] = await Promise.all([
          eventsApi.follows({ ...paging, ...range, eventType: 'UNFOLLOW' }),
          loadRestrictions(),
        ])
        setUnfollowEvents(res.data.data)
        setUnfollowTotal(res.data.total)
      } else { setUnfollowEvents([]); setUnfollowTotal(0) }
    } catch {
      addToast({ type: 'error', title: '히스토리 로드 실패' })
    }
  }

  useEffect(() => { setPage(0) }, [tab, dateFilter])
  useEffect(() => { void load() }, [tab, dateFilter, page])

  const handleDelete = async (table: string, id: number) => {
    try { await eventsApi.deleteEvent(table, id); await load() }
    catch { addToast({ type: 'error', title: '삭제 실패' }) }
  }

  const setBusy = (channelId: string, busy: boolean) => {
    setBusyIds((prev) => { const next = new Set(prev); if (busy) next.add(channelId); else next.delete(channelId); return next })
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
    } finally { setBusy(targetId, false) }
  }

  const donSum = donations.reduce((s, d) => s + d.amount, 0)
  const netFollow = followTotal - unfollowTotal
  const hasEvents = donations.length > 0 || subscriptions.length > 0 || followEvents.length > 0 || unfollowEvents.length > 0

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <History size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">알림 히스토리</h1>

        {/* 현재 필터 기준 요약 통계 */}
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

      {/* 탭 + 날짜 필터 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-bg-card flex-wrap">
        <div className="flex gap-0.5 bg-bg-outer border border-border rounded-xl p-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                ${tab === item.value
                  ? 'bg-accent-mint text-bg-outer shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border
                ${dateFilter === filter.value
                  ? 'border-accent-mint/50 text-accent-mint bg-accent-mint/10'
                  : 'border-border text-text-muted hover:text-text-secondary hover:border-border/80'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === 'all' && hasEvents && (
          <AllEventsTable
            donations={donations} subscriptions={subscriptions}
            followEvents={followEvents} unfollowEvents={unfollowEvents}
            onDelete={handleDelete}
          />
        )}
        {tab === 'donation' && donations.length > 0 && (
          <DonationTable rows={donations} onDelete={(id) => handleDelete('donations', id)} />
        )}
        {tab === 'subscription' && subscriptions.length > 0 && (
          <SubscriptionTable rows={subscriptions} onDelete={(id) => handleDelete('subscriptions', id)} />
        )}
        {tab === 'follow' && followEvents.length > 0 && (
          <FollowTable
            title="팔로우" icon={<Heart size={13} className="text-pink-400" />}
            rows={followEvents} tone="follow"
            onDelete={(id) => handleDelete('follows', id)}
          />
        )}
        {tab === 'unfollow' && unfollowEvents.length > 0 && (
          <FollowTable
            title="팔로우 취소" icon={<HeartOff size={13} className="text-red-400" />}
            rows={unfollowEvents} tone="unfollow"
            restrictedIds={restrictedIds} busyIds={busyIds}
            onRestriction={(row) => void handleRestriction(row)}
            onDelete={(id) => handleDelete('follows', id)}
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

      {/* 페이지네이션 */}
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

function DonationTable({ rows, onDelete }: { rows: Donation[]; onDelete: (id: number) => void }) {
  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader icon={<Gift size={13} className="text-yellow-400" />} title="후원" count={rows.length} accent="text-yellow-400" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-40">닉네임</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-32">후원 치즈</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide">메시지</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">일시</th>
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/30 hover:bg-white/[0.04] transition-colors group">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={row.nickname} />
                  <span className="text-sm font-semibold text-text-primary">{row.nickname}</span>
                </div>
              </td>
              <td className="px-4 py-2.5 text-right">
                <span className="text-sm font-bold text-yellow-400">{row.amount.toLocaleString()}</span>
                <span className="text-xs text-text-muted ml-1">치즈</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-text-secondary max-w-xs">
                {row.message
                  ? <span className="line-clamp-1">{row.message}</span>
                  : <span className="text-text-muted/50">없음</span>}
              </td>
              <td className="px-4 py-2.5"><DateCell iso={row.created_at} /></td>
              <td className="px-4 py-2.5">
                <button onClick={() => onDelete(row.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function SubscriptionTable({ rows, onDelete }: { rows: Subscription[]; onDelete: (id: number) => void }) {
  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader icon={<Star size={13} className="text-accent-purple" />} title="구독" count={rows.length} accent="text-accent-purple" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-40">닉네임</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">구독 기간</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide">메시지</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">일시</th>
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/30 hover:bg-white/[0.04] transition-colors group">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={row.nickname} />
                  <span className="text-sm font-semibold text-text-primary">{row.nickname}</span>
                </div>
              </td>
              <td className="px-4 py-2.5">
                {row.month
                  ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-accent-purple/15 text-accent-purple border border-accent-purple/20">{row.month}개월</span>
                  : <span className="text-xs text-text-muted/50">-</span>}
              </td>
              <td className="px-4 py-2.5 text-xs text-text-secondary max-w-xs">
                {row.message
                  ? <span className="line-clamp-1">{row.message}</span>
                  : <span className="text-text-muted/50">없음</span>}
              </td>
              <td className="px-4 py-2.5"><DateCell iso={row.created_at} /></td>
              <td className="px-4 py-2.5">
                <button onClick={() => onDelete(row.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

type UnifiedEvent =
  | { kind: 'donation';     id: number; created_at: string; data: Donation }
  | { kind: 'subscription'; id: number; created_at: string; data: Subscription }
  | { kind: 'follow';       id: number; created_at: string; data: FollowEvent }
  | { kind: 'unfollow';     id: number; created_at: string; data: FollowEvent }

function AllEventsTable({
  donations, subscriptions, followEvents, unfollowEvents, onDelete,
}: {
  donations: Donation[]
  subscriptions: Subscription[]
  followEvents: FollowEvent[]
  unfollowEvents: FollowEvent[]
  onDelete: (table: string, id: number) => void
}) {
  const unified: UnifiedEvent[] = [
    ...donations.map((d) => ({ kind: 'donation' as const, id: d.id, created_at: d.created_at, data: d })),
    ...subscriptions.map((s) => ({ kind: 'subscription' as const, id: s.id, created_at: s.created_at, data: s })),
    ...followEvents.map((f) => ({ kind: 'follow' as const, id: f.id, created_at: f.created_at, data: f })),
    ...unfollowEvents.map((f) => ({ kind: 'unfollow' as const, id: f.id, created_at: f.created_at, data: f })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // 팔로워 관련 이벤트끼리만 증감 계산
  const followerEvts = unified.filter((e) => e.kind === 'follow' || e.kind === 'unfollow')
  const followerDeltaMap = new Map<string, number | null>()
  followerEvts.forEach((ev, i) => {
    const key = `${ev.kind}-${ev.id}`
    if (i === followerEvts.length - 1) { followerDeltaMap.set(key, null); return }
    const curr = (ev.data as FollowEvent).follower_count
    const prev = (followerEvts[i + 1].data as FollowEvent).follower_count
    followerDeltaMap.set(key, curr - prev)
  })

  const TYPE_CFG = {
    donation:     { icon: <Gift size={11} />,     label: '후원',        badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/25',  bar: 'bg-yellow-400' },
    subscription: { icon: <Star size={11} />,     label: '구독',        badge: 'bg-accent-purple/10 text-accent-purple border-accent-purple/25', bar: 'bg-accent-purple' },
    follow:       { icon: <Heart size={11} />,    label: '팔로우',      badge: 'bg-pink-400/10 text-pink-400 border-pink-400/25',        bar: 'bg-pink-400' },
    unfollow:     { icon: <HeartOff size={11} />, label: '팔로우 취소', badge: 'bg-red-400/10 text-red-400 border-red-400/25',           bar: 'bg-red-400' },
  } as const

  const tableMap = { donation: 'donations', subscription: 'subscriptions', follow: 'follows', unfollow: 'follows' } as const

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader icon={<History size={13} className="text-accent-mint" />} title="전체 이벤트" count={unified.length} accent="text-accent-mint" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-32">타입</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-44">닉네임</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide">내용</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">일시</th>
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {unified.map((ev, idx) => {
            const cfg        = TYPE_CFG[ev.kind]
            const dateLabel  = fmtDate(ev.created_at)
            const prevDate   = idx > 0 ? fmtDate(unified[idx - 1].created_at) : null
            const showSep    = dateLabel !== prevDate
            const nickname   = ev.kind === 'donation' || ev.kind === 'subscription' ? ev.data.nickname : ev.data.nickname || '-'
            const evKey      = `${ev.kind}-${ev.id}`
            const delta      = followerDeltaMap.get(evKey) ?? null
            const count      = (ev.kind === 'follow' || ev.kind === 'unfollow') ? (ev.data as FollowEvent).follower_count : 0
            const isMilestone = (ev.kind === 'follow' || ev.kind === 'unfollow') && MILESTONES.includes(count)

            return [
              showSep && (
                <tr key={`sep-${evKey}`}>
                  <td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold text-text-muted/50 bg-bg-outer/40 border-t border-b border-border/40 tracking-widest uppercase select-none">
                    {dateLabel}
                  </td>
                </tr>
              ),
              <tr key={evKey} className="border-b border-border/30 hover:bg-white/[0.04] transition-colors group">

                {/* 타입 배지 + 컬러 accent bar */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-[3px] h-6 rounded-full shrink-0 ${cfg.bar} opacity-70`} />
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${cfg.badge}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>
                </td>

                {/* 닉네임 */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={nickname} />
                    <span className="text-sm font-semibold text-text-primary truncate max-w-[120px]">{nickname}</span>
                  </div>
                </td>

                {/* 내용 */}
                <td className="px-4 py-2.5">
                  {ev.kind === 'donation' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-yellow-400">{ev.data.amount.toLocaleString()}</span>
                        <span className="text-xs text-text-muted">치즈</span>
                      </div>
                      {ev.data.message
                        ? <span className="text-xs text-text-secondary bg-bg-outer border border-border rounded-lg px-2 py-0.5 truncate max-w-[220px]">{ev.data.message}</span>
                        : <span className="text-[11px] text-text-muted/40">메시지 없음</span>}
                    </div>
                  )}
                  {ev.kind === 'subscription' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {ev.data.month
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-accent-purple/15 text-accent-purple border border-accent-purple/20">{ev.data.month}개월</span>
                        : <span className="text-xs font-semibold text-accent-purple">신규 구독</span>}
                      {ev.data.message
                        ? <span className="text-xs text-text-secondary bg-bg-outer border border-border rounded-lg px-2 py-0.5 truncate max-w-[220px]">{ev.data.message}</span>
                        : <span className="text-[11px] text-text-muted/40">메시지 없음</span>}
                    </div>
                  )}
                  {(ev.kind === 'follow' || ev.kind === 'unfollow') && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-base font-bold ${ev.kind === 'follow' ? 'text-pink-400' : 'text-red-400'}`}>
                          {count.toLocaleString()}
                        </span>
                        <span className="text-xs text-text-muted">팔로워</span>
                      </div>
                      {delta !== null && delta !== 0 && (
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-sm font-bold ${delta > 0 ? 'text-pink-400' : 'text-red-400'}`}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                          <span className="text-[10px] text-text-muted">변화</span>
                        </div>
                      )}
                      {isMilestone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-yellow-400/10 border border-yellow-400/25 text-yellow-400">
                          ★ {count.toLocaleString()} 달성
                        </span>
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-2.5"><DateCell iso={ev.created_at} /></td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => onDelete(tableMap[ev.kind], ev.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>,
            ]
          })}
        </tbody>
      </table>
    </section>
  )
}

const MILESTONES = [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 20000, 50000, 100000]

function FollowTable({
  title, icon, rows, tone, restrictedIds, busyIds, onRestriction, onDelete,
}: {
  title: string
  icon: React.ReactNode
  rows: FollowEvent[]
  tone: 'follow' | 'unfollow'
  restrictedIds?: Set<string>
  busyIds?: Set<string>
  onRestriction?: (row: FollowEvent) => void
  onDelete: (id: number) => void
}) {
  const isUnfollow = tone === 'unfollow'
  const accentClass = isUnfollow ? 'text-red-400' : 'text-pink-400'

  // 최신순 정렬 기준으로 이전 이벤트 대비 팔로워 증감 계산
  const deltas: (number | null)[] = rows.map((row, idx) => {
    if (idx === rows.length - 1) return null
    return row.follower_count - rows[idx + 1].follower_count
  })

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader icon={icon} title={title} count={rows.length} accent={accentClass} />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-44">닉네임</th>
            {!isUnfollow
              ? <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide">팔로워 추이</th>
              : <th className="px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide" />}
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-28">팔로워 수</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">일시</th>
            {isUnfollow && <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-28">활동제한</th>}
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const targetId   = row.target_channel_id ?? ''
            const restricted = targetId ? !!restrictedIds?.has(targetId) : false
            const busy       = targetId ? !!busyIds?.has(targetId) : false
            const dateLabel  = fmtDate(row.created_at)
            const prevDate   = idx > 0 ? fmtDate(rows[idx - 1].created_at) : null
            const showSep    = dateLabel !== prevDate
            const delta      = deltas[idx]
            const isMilestone = MILESTONES.includes(row.follower_count)
            const colSpan    = isUnfollow ? 6 : 6

            return [
              showSep && (
                <tr key={`sep-${row.id}`}>
                  <td
                    colSpan={colSpan}
                    className="px-4 py-1.5 text-[10px] font-bold text-text-muted/50 bg-bg-outer/40 border-t border-b border-border/40 tracking-widest uppercase select-none"
                  >
                    {dateLabel}
                  </td>
                </tr>
              ),
              <tr key={row.id} className="border-b border-border/30 hover:bg-white/[0.04] transition-colors group">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.nickname || '?'} />
                    <span className="text-sm font-semibold text-text-primary">{row.nickname || '-'}</span>
                  </div>
                </td>

                {/* 팔로워 추이 / 마일스톤 셀 */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {isMilestone && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-yellow-400/10 border border-yellow-400/25 text-yellow-400">
                        ★ {row.follower_count.toLocaleString()} 달성
                      </span>
                    )}
                    {!isUnfollow && delta !== null && delta !== 0 && (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-base font-bold leading-none ${delta > 0 ? 'text-pink-400' : 'text-red-400'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                        <span className="text-[10px] text-text-muted">팔로워</span>
                      </div>
                    )}
                  </div>
                </td>

                <td className={`px-4 py-2.5 text-right text-sm font-semibold ${isUnfollow ? 'text-red-400' : 'text-pink-400'}`}>
                  {row.follower_count.toLocaleString()}
                </td>
                <td className="px-4 py-2.5"><DateCell iso={row.created_at} /></td>
                {isUnfollow && (
                  <td className="px-4 py-2.5 text-right">
                    <RestrictionButton restricted={restricted} busy={busy} disabled={!targetId} onClick={() => onRestriction?.(row)} />
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <button onClick={() => onDelete(row.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>,
            ]
          })}
        </tbody>
      </table>
    </section>
  )
}

function SectionHeader({ icon, title, count, accent }: { icon: React.ReactNode; title: string; count: number; accent: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
      {icon}
      <span className="text-sm font-bold text-text-primary">{title}</span>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/5 border border-border ${accent}`}>{count}</span>
    </div>
  )
}

function RestrictionButton({ restricted, busy, disabled, onClick }: { restricted: boolean; busy: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={disabled ? '기존 기록에는 대상 채널 ID가 없습니다' : undefined}
      className={`inline-flex items-center justify-center gap-1.5 min-w-[76px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${restricted
          ? 'border-accent-mint/30 bg-accent-mint/10 text-accent-mint hover:bg-accent-mint/20'
          : 'border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20'}`}
    >
      {restricted ? <ShieldCheck size={12} /> : <ShieldBan size={12} />}
      {busy ? '처리 중…' : restricted ? '제한 해제' : '활동제한'}
    </button>
  )
}
