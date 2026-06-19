import { useEffect, useState } from 'react'
import { Trash2, ChevronLeft, ChevronRight, History, Gift, Heart, Star } from 'lucide-react'
import { eventsApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

type Tab = 'all' | 'donation' | 'subscription' | 'follow'
type DateFilter = 'today' | 'week' | 'month' | 'all'

interface Donation { id: number; nickname: string; amount: number; type: string; message?: string; created_at: string }
interface Subscription { id: number; nickname: string; month?: number; message?: string; created_at: string }
interface Follow { id: number; follower_count: number; created_at: string }

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: '오늘', value: 'today' },
  { label: '이번 주', value: 'week' },
  { label: '이번 달', value: 'month' },
  { label: '전체', value: 'all' },
]

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (filter === 'today') { const s = toISO(now); return { startDate: s, endDate: s } }
  if (filter === 'week') { const s = new Date(now); s.setDate(s.getDate() - 6); return { startDate: toISO(s), endDate: toISO(now) } }
  if (filter === 'month') { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { startDate: toISO(s), endDate: toISO(now) } }
  return {}
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AlertHistoryPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [tab, setTab] = useState<Tab>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [donations, setDonations] = useState<Donation[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [follows, setFollows] = useState<Follow[]>([])
  const [donTotal, setDonTotal] = useState(0)
  const [page, setPage] = useState(0)
  const LIMIT = 30

  const load = async () => {
    const range = getDateRange(dateFilter)
    try {
      if (tab === 'all' || tab === 'donation') {
        const r = await eventsApi.donations({ limit: LIMIT, offset: page * LIMIT, ...range })
        setDonations(r.data.data); setDonTotal(r.data.total)
      }
      if (tab === 'all' || tab === 'subscription') {
        const r = await eventsApi.subscriptions({ limit: LIMIT, offset: page * LIMIT })
        setSubscriptions(r.data.data)
      }
      if (tab === 'all' || tab === 'follow') {
        const r = await eventsApi.follows({ limit: LIMIT, offset: page * LIMIT })
        setFollows(r.data.data)
      }
    } catch { addToast({ type: 'error', title: '히스토리 로드 실패' }) }
  }

  useEffect(() => { setPage(0) }, [tab, dateFilter])
  useEffect(() => { load() }, [tab, dateFilter, page])

  const handleDelete = async (table: string, id: number) => {
    try { await eventsApi.deleteEvent(table, id); await load() }
    catch { addToast({ type: 'error', title: '삭제 실패' }) }
  }

  const donSum = donations.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="flex flex-col h-screen bg-bg-outer overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <History size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">알림 히스토리</h1>
      </div>

      {/* 필터 바 */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-border shrink-0 bg-bg-card">
        <div className="flex gap-1 bg-bg-outer border border-border rounded-xl p-1">
          {(['all', 'donation', 'subscription', 'follow'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${tab === t ? 'bg-accent-mint text-bg-outer' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {t === 'donation' && <Gift size={11} />}
              {t === 'subscription' && <Star size={11} />}
              {t === 'follow' && <Heart size={11} />}
              {{ all: '전체', donation: '후원', subscription: '구독', follow: '팔로우' }[t]}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border
                ${dateFilter === f.value
                  ? 'border-accent-mint text-accent-mint bg-accent-mint/10'
                  : 'border-border text-text-secondary hover:border-text-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {tab === 'donation' && donations.length > 0 && (
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-text-muted">합산</p>
              <p className="text-sm font-bold text-accent-mint">{donSum.toLocaleString()} 치즈</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">건수</p>
              <p className="text-sm font-bold text-text-primary">{donTotal}</p>
            </div>
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(tab === 'all' || tab === 'donation') && donations.length > 0 && (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Gift size={13} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">후원</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-xs border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium">닉네임</th>
                    <th className="text-right px-4 py-2.5 font-medium">치즈</th>
                    <th className="text-left px-4 py-2.5 font-medium">메시지</th>
                    <th className="text-right px-4 py-2.5 font-medium">일시</th>
                    <th className="px-4 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id} className="border-b border-border/40 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{d.nickname}</td>
                      <td className="px-4 py-2.5 text-right text-accent-mint font-semibold">{d.amount.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-text-secondary max-w-xs truncate">{d.message || <span className="text-text-muted">-</span>}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted whitespace-nowrap">{fmt(d.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => handleDelete('donations', d.id)} className="text-text-muted hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(tab === 'all' || tab === 'subscription') && subscriptions.length > 0 && (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Star size={13} className="text-accent-purple" />
              <span className="text-sm font-semibold text-text-primary">구독</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">닉네임</th>
                  <th className="text-right px-4 py-2.5 font-medium">개월</th>
                  <th className="text-left px-4 py-2.5 font-medium">메시지</th>
                  <th className="text-right px-4 py-2.5 font-medium">일시</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{s.nickname}</td>
                    <td className="px-4 py-2.5 text-right text-accent-purple">{s.month ? `${s.month}개월` : '-'}</td>
                    <td className="px-4 py-2.5 text-text-secondary max-w-xs truncate">{s.message || <span className="text-text-muted">-</span>}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted whitespace-nowrap">{fmt(s.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete('subscriptions', s.id)} className="text-text-muted hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(tab === 'all' || tab === 'follow') && follows.length > 0 && (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Heart size={13} className="text-accent-success" />
              <span className="text-sm font-semibold text-text-primary">팔로우</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">감지 일시</th>
                  <th className="text-right px-4 py-2.5 font-medium">팔로워 수</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {follows.map((f) => (
                  <tr key={f.id} className="border-b border-border/40 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5 text-text-secondary">{fmt(f.created_at)}</td>
                    <td className="px-4 py-2.5 text-right text-accent-success font-semibold">{f.follower_count.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete('follows', f.id)} className="text-text-muted hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {donations.length === 0 && subscriptions.length === 0 && follows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <History size={32} className="text-border mb-3" />
            <p className="text-sm font-medium text-text-muted">이벤트 기록이 없습니다</p>
            <p className="text-xs text-text-muted/60 mt-1">방송 중 발생한 후원, 구독, 팔로우가 표시됩니다</p>
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
          <span className="text-xs text-text-muted">{page + 1} 페이지</span>
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
