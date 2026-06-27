/**
 * [통계 페이지]
 *
 * 후원·구독·팔로우 데이터를 기간별 차트로 시각화하는 페이지.
 * recharts 라이브러리를 사용해 AreaChart, BarChart, PieChart 를 렌더링한다.
 *
 * ── recharts 미설치 주의 ──────────────────────────────────────────────────
 *   현재 환경에서 recharts 패키지가 설치되지 않아 TypeScript 에러가 발생한다.
 *   이 에러는 기존부터 있던 문제이므로 수정하지 않는다.
 *
 * ── C 객체 (midnight 테마 hex 근사값) ────────────────────────────────────
 *   recharts 에 직접 전달해야 하는 색상값은 CSS 변수(var(--color-...))가 아닌 hex 값이어야 한다.
 *   midnight 테마의 CSS 변수를 hex 로 근사한 상수 객체 C 를 사용한다.
 *   테마 변경 시 차트 색상이 자동으로 따라가지 않는 한계가 있다.
 *
 * ── followerTrend 샘플링 (최대 120 포인트) ──────────────────────────────
 *   팔로워 추이 데이터가 많을 경우 step 을 계산해 120개 포인트 이내로 다운샘플링한다.
 *   너무 많은 데이터 포인트는 recharts 렌더링 성능을 저하시키기 때문.
 *
 * ── Period ('7d' | '30d' | 'all') ────────────────────────────────────────
 *   기간 선택에 따라 날짜 범위 파라미터를 달리해 eventsApi 를 호출한다.
 *
 * ── 서브컴포넌트 ──────────────────────────────────────────────────────────
 *   ChartTooltip → 차트 커서 오버 시 표시되는 커스텀 툴팁
 *   StatCard     → 요약 수치를 표시하는 단일 통계 카드
 *   ChartCard    → 차트를 감싸는 제목 + 컨텐츠 카드 래퍼
 */
import { useEffect, useState, useMemo } from 'react'
import { BarChart2, TrendingUp, Gift, Star, Heart, Users } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { eventsApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

type Period = '7d' | '30d' | 'all'

interface DonationRow { id: number; amount: number; created_at: string }
interface SubRow     { id: number; month?: number; created_at: string }
interface FollowRow  { id: number; follower_count: number; created_at: string }

// CSS vars の hex 近似値 (midnight テーマ)
const C = {
  mint:   '#00ffa3',
  purple: '#a78bfa',
  yellow: '#facc15',
  pink:   '#f472b6',
  red:    '#f87171',
  muted:  '#4f5368',
  border: '#2e3041',
}

const PERIODS: { label: string; value: Period }[] = [
  { label: '7일', value: '7d' },
  { label: '30일', value: '30d' },
  { label: '전체', value: 'all' },
]

function cutoff(period: Period): Date | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : 30
  return new Date(Date.now() - days * 86400 * 1000)
}

function filterByPeriod<T extends { created_at: string }>(data: T[], period: Period): T[] {
  const cut = cutoff(period)
  return cut ? data.filter((d) => new Date(d.created_at) >= cut) : data
}

function toLabel(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function StatisticsPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [period, setPeriod] = useState<Period>('30d')
  const [donations, setDonations]       = useState<DonationRow[]>([])
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([])
  const [follows, setFollows]           = useState<FollowRow[]>([])
  const [unfollows, setUnfollows]       = useState<FollowRow[]>([])
  const [followTotal, setFollowTotal]   = useState(0)
  const [unfollowTotal, setUnfollowTotal] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const start = cutoff(period)
        const range = start ? { startDate: start.toISOString().slice(0, 10) } : {}
        const [d, s, f, u] = await Promise.all([
          eventsApi.donations({ limit: 500, ...range }),
          eventsApi.subscriptions({ limit: 500 }),
          eventsApi.follows({ limit: 500, ...range, eventType: 'FOLLOW' }),
          eventsApi.follows({ limit: 500, ...range, eventType: 'UNFOLLOW' }),
        ])
        setDonations(d.data.data)
        setSubscriptions(s.data.data)
        setFollows(f.data.data)
        setUnfollows(u.data.data)
        setFollowTotal(f.data.total)
        setUnfollowTotal(u.data.total)
      } catch {
        addToast({ type: 'error', title: '통계 로드 실패' })
      }
    })()
  }, [period])

  const fd = useMemo(() => filterByPeriod(donations, period),    [donations, period])
  const ff = useMemo(() => filterByPeriod(follows, period),      [follows, period])
  const fu = useMemo(() => filterByPeriod(unfollows, period),    [unfollows, period])
  const fs = useMemo(() => filterByPeriod(subscriptions, period),[subscriptions, period])

  // 팔로워 추이: follow + unfollow 이벤트를 시간순으로 합침
  const followerTrend = useMemo(() => {
    const all = [
      ...ff.map((r) => ({ t: r.created_at, v: r.follower_count })),
      ...fu.map((r) => ({ t: r.created_at, v: r.follower_count })),
    ].sort((a, b) => a.t.localeCompare(b.t))
    // 최대 120 포인트로 샘플링
    const step = Math.max(1, Math.ceil(all.length / 120))
    return all.filter((_, i) => i % step === 0).map((d) => ({ date: toLabel(d.t), count: d.v }))
  }, [ff, fu])

  // 일별 후원
  const dailyDonations = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of fd) {
      const day = d.created_at.slice(0, 10)
      map.set(day, (map.get(day) ?? 0) + d.amount)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amount]) => ({ date: toLabel(day + 'T00:00:00'), amount }))
  }, [fd])

  // 이벤트 분포 (도넛)
  const distribution = useMemo(() => [
    { name: '팔로우',    value: ff.length,  color: C.pink   },
    { name: '언팔로우',  value: fu.length,  color: C.red    },
    { name: '후원',      value: fd.length,  color: C.yellow },
    { name: '구독',      value: fs.length,  color: C.purple },
  ].filter((d) => d.value > 0), [ff, fu, fd, fs])

  // 구독 월별 분포 (bar)
  const subByMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of fs) {
      const day = s.created_at.slice(0, 10)
      map.set(day, (map.get(day) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ date: toLabel(day + 'T00:00:00'), count }))
  }, [fs])

  const totalDon    = fd.reduce((s, d) => s + d.amount, 0)
  const netFollow   = followTotal - unfollowTotal
  const latestCount = follows[0]?.follower_count ?? 0
  const hasData     = followerTrend.length > 1 || dailyDonations.length > 0 || distribution.length > 0

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <BarChart2 size={18} className="text-accent-mint" />
          <h1 className="text-base font-bold text-text-primary">통계</h1>
        </div>
        <div className="flex gap-0.5 bg-bg-outer border border-border rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p.value
                  ? 'bg-accent-mint text-bg-outer shadow-sm'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* 요약 카드 4개 */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={<Users size={14} />}   label="현재 팔로워"  value={latestCount.toLocaleString()}                        color={C.mint}   tw="text-accent-mint" />
          <StatCard icon={<Gift size={14} />}    label="기간 후원"    value={`${totalDon.toLocaleString()} 치즈`}                 color={C.yellow} tw="text-yellow-400" />
          <StatCard icon={<Heart size={14} />}   label="순 팔로우"    value={`${netFollow >= 0 ? '+' : ''}${netFollow}`}           color={netFollow >= 0 ? C.pink : C.red} tw={netFollow >= 0 ? 'text-pink-400' : 'text-red-400'} />
          <StatCard icon={<Star size={14} />}    label="기간 구독"    value={`${fs.length}건`}                                    color={C.purple} tw="text-accent-purple" />
        </div>

        {/* 팔로워 추이 (Area) */}
        {followerTrend.length > 1 && (
          <ChartCard title="팔로워 추이" icon={<TrendingUp size={13} className="text-pink-400" />}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={followerTrend} margin={{ top: 5, right: 8, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="followGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.pink} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.pink} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip unit="명" />} />
                <Area type="monotone" dataKey="count" name="팔로워" stroke={C.pink} strokeWidth={2} fill="url(#followGrad)" dot={false} activeDot={{ r: 4, fill: C.pink }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 후원 + 이벤트분포 */}
        {(dailyDonations.length > 0 || distribution.length > 0) && (
          <div className="grid grid-cols-5 gap-3">
            {dailyDonations.length > 0 && (
              <div className="col-span-3">
                <ChartCard title="일별 후원 치즈" icon={<Gift size={13} className="text-yellow-400" />}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dailyDonations} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                      <Tooltip content={<ChartTooltip unit="치즈" />} />
                      <Bar dataKey="amount" name="후원" fill={C.yellow} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}
            {distribution.length > 0 && (
              <div className={dailyDonations.length > 0 ? 'col-span-2' : 'col-span-5'}>
                <ChartCard title="이벤트 분포" icon={<BarChart2 size={13} className="text-accent-mint" />}>
                  <div className="flex items-center gap-3 h-[180px]">
                    <PieChart width={150} height={150}>
                      <Pie data={distribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip unit="건" />} />
                    </PieChart>
                    <div className="space-y-2 flex-1 min-w-0">
                      {distribution.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: d.color }} />
                          <span className="text-[11px] text-text-muted truncate flex-1">{d.name}</span>
                          <span className="text-xs font-bold text-text-primary">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              </div>
            )}
          </div>
        )}

        {/* 구독 추이 */}
        {subByMonth.length > 1 && (
          <ChartCard title="구독 추이" icon={<Star size={13} className="text-accent-purple" />}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={subByMonth} margin={{ top: 5, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit="건" />} />
                <Bar dataKey="count" name="구독" fill={C.purple} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 빈 상태 */}
        {!hasData && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-3">
              <BarChart2 size={24} className="text-border" />
            </div>
            <p className="text-sm font-medium text-text-muted">데이터가 없습니다</p>
            <p className="text-xs text-text-muted/60 mt-1">방송을 진행하면 통계가 자동으로 쌓입니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, tw }: { icon: React.ReactNode; label: string; value: string; color: string; tw: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${tw}`}>
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold leading-tight ${tw}`}>{value}</p>
    </div>
  )
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-bold text-text-primary">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-text-muted mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}{unit ? ` ${unit}` : ''}
        </p>
      ))}
    </div>
  )
}
