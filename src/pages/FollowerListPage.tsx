/**
 * [팔로워 목록 페이지]
 *
 * 채널의 팔로워 목록을 검색·조회하고, 특정 유저에 대한 활동제한을 토글할 수 있는 페이지.
 *
 * ── restrictionIdsFromResponse ────────────────────────────────────────────
 *   활동제한 API 응답은 버전에 따라 배열 또는 { data: [] } 객체 두 형태로 올 수 있다.
 *   이 헬퍼가 두 형태 모두를 Set<string> 으로 정규화해 컴포넌트 코드를 단순하게 유지한다.
 *
 * ── LIMIT = 50 ────────────────────────────────────────────────────────────
 *   한 페이지에 최대 50명을 로드한다. 서버 부하를 고려한 값으로, 변경 시 페이지네이션 계산도 함께 조정해야 한다.
 *
 * ── 검색 (query 상태) ─────────────────────────────────────────────────────
 *   입력값이 변경될 때마다 서버 API 를 통해 검색한다.
 *   query 가 빈 문자열이면 전체 목록을 로드한다.
 *
 * ── RestrictionButton (인라인 서브컴포넌트) ──────────────────────────────
 *   팔로워 행마다 활동제한/해제 버튼 렌더링 책임을 분리한 최소 단위 컴포넌트.
 *   isRestricted 여부에 따라 ShieldCheck(초록) / ShieldBan(빨강) 아이콘을 전환한다.
 */
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Search, ShieldBan, ShieldCheck, Users } from 'lucide-react'
import { channelApi, eventsApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

interface FollowerRow {
  channel_id: string
  follower_channel_id: string
  nickname: string
  followed_at: string
}

interface RestrictionRow {
  restrictedChannelId?: string
  restrictedChannelName?: string
}

const LIMIT = 50

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function restrictionIdsFromResponse(data: unknown): Set<string> {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] })?.data)
      ? (data as { data: unknown[] }).data
      : []

  return new Set(
    rows
      .map((row) => (row as RestrictionRow).restrictedChannelId)
      .filter((id): id is string => !!id)
  )
}

export default function FollowerListPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [followers, setFollowers] = useState<FollowerRow[]>([])
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set())
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const loadRestrictions = async () => {
    const res = await channelApi.getRestrictions({ size: 30 })
    setRestrictedIds(restrictionIdsFromResponse(res.data))
  }

  const load = async () => {
    setLoading(true)
    try {
      const [followersRes] = await Promise.all([
        eventsApi.followerList({
          limit: LIMIT,
          offset: page * LIMIT,
          search: query || undefined,
        }),
        loadRestrictions(),
      ])
      setFollowers(followersRes.data.data)
      setTotal(followersRes.data.total)
    } catch {
      addToast({ type: 'error', title: '팔로우 목록 로드 실패' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [page, query])

  const handleSearch = () => {
    setPage(0)
    setQuery(search.trim())
  }

  const setBusy = (channelId: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(channelId)
      else next.delete(channelId)
      return next
    })
  }

  const handleRestriction = async (row: FollowerRow) => {
    const targetId = row.follower_channel_id
    const isRestricted = restrictedIds.has(targetId)

    setBusy(targetId, true)
    try {
      if (isRestricted) {
        await channelApi.removeRestriction(targetId)
        setRestrictedIds((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
        addToast({ type: 'info', title: `${row.nickname} 활동제한 해제` })
      } else {
        await channelApi.addRestriction(targetId)
        setRestrictedIds((prev) => new Set(prev).add(targetId))
        addToast({ type: 'info', title: `${row.nickname} 활동제한 추가` })
      }
    } catch {
      addToast({ type: 'error', title: '활동제한 처리 실패' })
    } finally {
      setBusy(targetId, false)
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-accent-mint" />
          <div>
            <h1 className="text-base font-bold text-text-primary">팔로우 목록</h1>
            <p className="text-xs text-text-muted mt-0.5">DB에 저장된 현재 팔로워 기준 목록</p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
          title="새로고침"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg-card shrink-0">
        <div className="relative w-80 max-w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="닉네임 또는 채널 ID 검색"
            className="w-full bg-bg-input border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-3 py-2 bg-accent-mint text-bg-outer rounded-xl text-xs font-semibold hover:brightness-110 transition-all"
        >
          검색
        </button>
        {query && (
          <button
            onClick={() => { setSearch(''); setQuery(''); setPage(0) }}
            className="px-3 py-2 border border-border text-text-secondary rounded-xl text-xs hover:text-text-primary transition-colors"
          >
            초기화
          </button>
        )}
        <div className="ml-auto text-right">
          <p className="text-xs text-text-muted">총 팔로워</p>
          <p className="text-sm font-bold text-text-primary">{total.toLocaleString()}명</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {followers.length > 0 ? (
          <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs border-b border-border">
                  <th className="text-left px-4 py-2.5 font-medium">닉네임</th>
                  <th className="text-left px-4 py-2.5 font-medium">채널 ID</th>
                  <th className="text-right px-4 py-2.5 font-medium">팔로우 일시</th>
                  <th className="text-right px-4 py-2.5 font-medium">활동제한</th>
                </tr>
              </thead>
              <tbody>
                {followers.map((follower) => {
                  const isRestricted = restrictedIds.has(follower.follower_channel_id)
                  const busy = busyIds.has(follower.follower_channel_id)
                  return (
                    <tr key={`${follower.channel_id}-${follower.follower_channel_id}`} className="border-b border-border/40 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-text-primary">{follower.nickname}</td>
                      <td className="px-4 py-2.5 text-text-secondary font-mono text-xs">{follower.follower_channel_id}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted whitespace-nowrap">{fmt(follower.followed_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <RestrictionButton
                          restricted={isRestricted}
                          busy={busy}
                          onClick={() => void handleRestriction(follower)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users size={32} className="text-border mb-3" />
            <p className="text-sm font-medium text-text-muted">저장된 팔로우 목록이 없습니다</p>
            <p className="text-xs text-text-muted/60 mt-1">팔로우 폴링이 한 번 완료되면 목록이 표시됩니다</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-border shrink-0">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border hover:border-accent-mint/40 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={12} /> 이전
        </button>
        <span className="text-xs text-text-muted">{page + 1} / {maxPage} 페이지</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page + 1 >= maxPage}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border hover:border-accent-mint/40 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          다음 <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

function RestrictionButton({ restricted, busy, onClick }: { restricted: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 min-w-[88px] px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50
        ${restricted
          ? 'border-accent-mint/30 bg-accent-mint/10 text-accent-mint hover:bg-accent-mint/15'
          : 'border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/15'}`}
    >
      {restricted ? <ShieldCheck size={12} /> : <ShieldBan size={12} />}
      {busy ? '처리 중' : restricted ? '해제' : '제한'}
    </button>
  )
}
