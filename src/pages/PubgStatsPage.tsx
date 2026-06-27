/**
 * [PUBG 전적 페이지]
 *
 * PUBG(배틀그라운드) 플레이어 전적을 조회하고, 시즌 통계·최근 매치를 표시하는 페이지.
 *
 * ── Platform / GameMode ───────────────────────────────────────────────────
 *   Platform: 'steam' | 'kakao' | 'psn' | 'xbox' — PUBG API 플랫폼 파라미터
 *   GameMode: 'solo' | 'solo-fpp' | 'duo' | ... — 모드별 통계 분리 조회에 사용
 *
 * ── API 키 저장 (password input) ──────────────────────────────────────────
 *   PUBG API 키는 서버 사이드에 저장되므로 클라이언트에는 전달되지 않는다.
 *   입력 필드는 type="password" 로 렌더링해 화면 캡처 시 노출을 방지한다.
 *
 * ── HTTP 상태 코드 처리 ────────────────────────────────────────────────────
 *   428 Precondition Required → API 키가 설정되지 않은 상태. 키 입력 안내 메시지 표시.
 *   404 Not Found            → 존재하지 않는 닉네임. "플레이어를 찾을 수 없음" 메시지 표시.
 *
 * ── 헬퍼 함수 (n / f / pct / km / rate) ─────────────────────────────────
 *   n    → 숫자 null-safe 변환 (undefined → 0)
 *   f    → 소수점 1자리 포맷팅
 *   pct  → 퍼센트 포맷팅 (0~100)
 *   km   → 미터를 킬로미터로 변환
 *   rate → 분모가 0 일 때 안전한 비율 계산
 *
 * ── 서브컴포넌트 ──────────────────────────────────────────────────────────
 *   SummaryCard  → 시즌 전체 요약 카드 (K/D, 승률, 평균 딜 등)
 *   Metric       → 단일 지표 레이블+값 셀
 *   RankRow      → 랭킹 행 (게임 모드 + 티어/포인트)
 *   RecentMetric → 최근 매치 요약 지표
 */
import { useEffect, useMemo, useState } from 'react'
import { Activity, Clock, Crosshair, Gamepad2, KeyRound, MapPin, RefreshCw, Search, Shield, Target, Trophy, Users } from 'lucide-react'
import { pubgApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

type Platform = 'steam' | 'kakao' | 'psn' | 'xbox'
type GameMode = 'solo' | 'solo-fpp' | 'duo' | 'duo-fpp' | 'squad' | 'squad-fpp'

interface GameModeStats {
  assists?: number
  boosts?: number
  damageDealt?: number
  headshotKills?: number
  kills?: number
  longestKill?: number
  roundsPlayed?: number
  timeSurvived?: number
  top10s?: number
  wins?: number
}

interface RankedStats {
  avgRank?: number
  currentRankPoint?: number
  currentTier?: { tier?: string; subTier?: string }
  damageDealt?: number
  kda?: number
  roundsPlayed?: number
  top10Ratio?: number
  winRatio?: number
}

interface RecentMatchDetail {
  id: string
  createdAt?: string
  duration?: number
  gameMode?: string
  mapName?: string
  matchType?: string
  rank?: number
  won?: boolean
  kills?: number
  assists?: number
  damageDealt?: number
  headshotKills?: number
  longestKill?: number
  timeSurvived?: number
  deathType?: string
  teammates?: {
    id?: string
    playerId?: string
    name?: string
    isSearchedPlayer?: boolean
    kills?: number
    assists?: number
    damageDealt?: number
    headshotKills?: number
    longestKill?: number
    timeSurvived?: number
    deathType?: string
  }[]
}

interface PubgResponse {
  platform: Platform
  currentSeasonId?: string | null
  recentMatches: { id: string; type: string }[]
  player: {
    id: string
    attributes?: {
      name?: string
      banType?: string
    }
  }
  lifetime?: {
    data?: {
      attributes?: {
        gameModeStats?: Record<GameMode, GameModeStats>
      }
    }
  } | null
  ranked?: {
    data?: {
      attributes?: {
        rankedGameModeStats?: Record<string, RankedStats>
      }
    }
  } | null
  recentMatchDetails?: RecentMatchDetail[]
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'steam', label: 'Steam' },
  { value: 'kakao', label: 'Kakao' },
  { value: 'psn', label: 'PSN' },
  { value: 'xbox', label: 'Xbox' },
]

const GAME_MODES: { value: GameMode; label: string }[] = [
  { value: 'squad-fpp', label: '스쿼드 FPP' },
  { value: 'squad', label: '스쿼드 TPP' },
  { value: 'duo-fpp', label: '듀오 FPP' },
  { value: 'duo', label: '듀오 TPP' },
  { value: 'solo-fpp', label: '솔로 FPP' },
  { value: 'solo', label: '솔로 TPP' },
]

const n = (value?: number) => Math.round(value ?? 0).toLocaleString()
const f = (value?: number, digits = 2) => (value ?? 0).toFixed(digits)
const pct = (value?: number) => `${((value ?? 0) * 100).toFixed(1)}%`
const km = (value?: number) => `${((value ?? 0) / 1000).toFixed(1)}km`

function rate(part?: number, total?: number) {
  if (!part || !total) return '0.0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

function avgDamage(stats?: GameModeStats) {
  if (!stats?.roundsPlayed) return '0'
  return n((stats.damageDealt ?? 0) / stats.roundsPlayed)
}

function kd(stats?: GameModeStats) {
  const deaths = Math.max(0, (stats?.roundsPlayed ?? 0) - (stats?.wins ?? 0))
  if (!stats || deaths <= 0) return f(stats?.kills ?? 0)
  return f((stats.kills ?? 0) / deaths)
}

function tierLabel(stats?: RankedStats) {
  const tier = stats?.currentTier
  if (!tier?.tier) return 'Unranked'
  return `${tier.tier} ${tier.subTier ?? ''}`.trim()
}

function formatMatchTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function duration(value?: number) {
  if (!value) return '-'
  const min = Math.floor(value / 60)
  const sec = value % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

function shortMapName(value?: string) {
  const map: Record<string, string> = {
    Baltic_Main: 'Erangel',
    Desert_Main: 'Miramar',
    DihorOtok_Main: 'Vikendi',
    Erangel_Main: 'Erangel',
    Heaven_Main: 'Haven',
    Kiki_Main: 'Deston',
    Range_Main: 'Training',
    Savage_Main: 'Sanhok',
    Summerland_Main: 'Karakin',
    Tiger_Main: 'Taego',
    Neon_Main: 'Rondo',
  }
  return value ? map[value] ?? value.replace(/_Main$/, '') : '-'
}

export default function PubgStatsPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [platform, setPlatform] = useState<Platform>('steam')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<GameMode>('squad-fpp')
  const [loading, setLoading] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [result, setResult] = useState<PubgResponse | null>(null)

  useEffect(() => {
    pubgApi.getSettings()
      .then((res) => setHasApiKey(Boolean(res.data?.hasApiKey)))
      .catch(() => setHasApiKey(false))
  }, [])

  const lifetimeStats = result?.lifetime?.data?.attributes?.gameModeStats?.[mode]
  const rankedStats = useMemo(() => {
    const stats = result?.ranked?.data?.attributes?.rankedGameModeStats
    if (!stats) return undefined
    return stats[mode] ?? stats[mode.replace('-fpp', '')] ?? Object.values(stats)[0]
  }, [result, mode])

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return
    setSavingKey(true)
    try {
      await pubgApi.saveApiKey(apiKey.trim())
      setApiKey('')
      setHasApiKey(true)
      addToast({ type: 'info', title: 'PUBG API 키를 저장했습니다' })
    } catch {
      addToast({ type: 'error', title: 'API 키 저장 실패' })
    } finally {
      setSavingKey(false)
    }
  }

  const handleSearch = async () => {
    const q = name.trim()
    if (!q) return
    setLoading(true)
    try {
      const res = await pubgApi.searchPlayer({ platform, name: q })
      setResult(res.data)
      addToast({ type: 'info', title: '전적을 불러왔습니다', message: q })
    } catch (err: any) {
      const status = err?.response?.status
      const title = status === 428
        ? 'PUBG API 키가 필요합니다'
        : status === 404
          ? '플레이어를 찾을 수 없습니다'
          : '전적 검색 실패'
      addToast({ type: 'error', title })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Gamepad2 size={18} className="text-accent-mint" />
          <div>
            <h1 className="text-base font-bold text-text-primary">배틀그라운드 전적 검색</h1>
            <p className="text-xs text-text-muted mt-0.5">닉네임과 플랫폼으로 최근 전적과 평생 통계를 조회합니다</p>
          </div>
        </div>
        {result && (
          <button
            onClick={handleSearch}
            disabled={loading}
            title="새로고침"
            className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg-card shrink-0">
        <div className="flex bg-bg-outer border border-border rounded-xl p-1">
          {PLATFORMS.map((item) => (
            <button
              key={item.value}
              onClick={() => setPlatform(item.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                platform === item.value
                  ? 'bg-accent-mint text-bg-outer'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-80 max-w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            placeholder="플레이어 닉네임"
            className="w-full bg-bg-input border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !name.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent-mint text-bg-outer rounded-xl text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search size={13} />
          {loading ? '검색 중' : '검색'}
        </button>
        <div className="ml-auto text-xs">
          <span className={hasApiKey ? 'text-accent-mint' : 'text-text-muted'}>
            {hasApiKey ? 'API 키 저장됨' : 'API 키 필요'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <section className="grid grid-cols-[minmax(0,1fr)_320px] gap-3">
          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-accent-mint" />
              <span className="text-sm font-bold text-text-primary">게임 모드</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {GAME_MODES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setMode(item.value)}
                  className={`min-h-10 rounded-xl border px-2 text-xs font-medium transition-all ${
                    mode === item.value
                      ? 'border-accent-mint bg-accent-mint/10 text-accent-mint'
                      : 'border-border bg-bg-input text-text-secondary hover:text-text-primary hover:border-accent-mint/40'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={14} className="text-yellow-400" />
              <span className="text-sm font-bold text-text-primary">PUBG API 키</span>
            </div>
            <div className="flex gap-2">
              <input
                value={apiKey}
                type="password"
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSaveKey()}
                placeholder={hasApiKey ? '새 키로 교체' : 'API 키 입력'}
                className="min-w-0 flex-1 bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
              />
              <button
                onClick={handleSaveKey}
                disabled={savingKey || !apiKey.trim()}
                className="px-3 py-2 bg-bg-input border border-border rounded-xl text-xs text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                저장
              </button>
            </div>
          </div>
        </section>

        {result ? (
          <>
            <section className="grid grid-cols-4 gap-3">
              <SummaryCard icon={<Trophy size={15} />} label="랭크" value={tierLabel(rankedStats)} sub={`${n(rankedStats?.currentRankPoint)} RP`} color="text-yellow-400" bg="bg-yellow-400/10" />
              <SummaryCard icon={<Crosshair size={15} />} label="K/D" value={kd(lifetimeStats)} sub={`${n(lifetimeStats?.kills)} 킬`} color="text-red-300" bg="bg-red-400/10" />
              <SummaryCard icon={<Activity size={15} />} label="평균 딜량" value={avgDamage(lifetimeStats)} sub={`${n(lifetimeStats?.roundsPlayed)} 매치`} color="text-accent-mint" bg="bg-accent-mint/10" />
              <SummaryCard icon={<Shield size={15} />} label="승률" value={rate(lifetimeStats?.wins, lifetimeStats?.roundsPlayed)} sub={`${n(lifetimeStats?.wins)} 승`} color="text-purple-300" bg="bg-purple-400/10" />
            </section>

            <section className="grid grid-cols-[minmax(0,1fr)_340px] gap-3">
              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-bold text-text-primary">{result.player.attributes?.name ?? result.player.id}</p>
                    <p className="text-xs text-text-muted mt-0.5">{result.player.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">플랫폼</p>
                    <p className="text-sm font-bold text-accent-mint uppercase">{result.platform}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-px bg-border/60">
                  <Metric label="매치" value={n(lifetimeStats?.roundsPlayed)} />
                  <Metric label="Top 10" value={rate(lifetimeStats?.top10s, lifetimeStats?.roundsPlayed)} />
                  <Metric label="헤드샷" value={rate(lifetimeStats?.headshotKills, lifetimeStats?.kills)} />
                  <Metric label="최장킬" value={km(lifetimeStats?.longestKill)} />
                  <Metric label="피해량" value={n(lifetimeStats?.damageDealt)} />
                  <Metric label="어시스트" value={n(lifetimeStats?.assists)} />
                  <Metric label="부스트" value={n(lifetimeStats?.boosts)} />
                  <Metric label="생존시간" value={`${Math.round((lifetimeStats?.timeSurvived ?? 0) / 3600)}h`} />
                </div>
              </div>

              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold text-text-primary">경쟁전</p>
                  <p className="text-xs text-text-muted mt-0.5">{result.currentSeasonId ?? '현재 시즌 정보 없음'}</p>
                </div>
                <div className="p-4 space-y-3">
                  <RankRow label="KDA" value={f(rankedStats?.kda)} />
                  <RankRow label="승률" value={pct(rankedStats?.winRatio)} />
                  <RankRow label="Top 10" value={pct(rankedStats?.top10Ratio)} />
                  <RankRow label="평균 순위" value={f(rankedStats?.avgRank, 1)} />
                  <RankRow label="평균 딜량" value={rankedStats?.roundsPlayed ? n((rankedStats.damageDealt ?? 0) / rankedStats.roundsPlayed) : '0'} />
                </div>
              </div>
            </section>

            <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">최근 전적</span>
                <span className="text-xs text-text-muted">최근 10경기 상세</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-px bg-border/60">
                {(result.recentMatchDetails?.length ?? 0) > 0 ? result.recentMatchDetails?.map((match, index) => (
                  <div key={match.id} className="bg-bg-card p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted">#{index + 1} · {match.gameMode ?? '-'}</p>
                        <p className={`text-lg font-black mt-1 ${match.won ? 'text-yellow-400' : 'text-text-primary'}`}>
                          {match.rank ? `#${match.rank}` : '-'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        match.matchType === 'official'
                          ? 'bg-accent-mint/10 text-accent-mint'
                          : 'bg-text-muted/15 text-text-muted'
                      }`}>
                        {match.matchType ?? 'match'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <RecentMetric label="킬" value={n(match.kills)} tone="text-red-300" />
                      <RecentMetric label="딜" value={n(match.damageDealt)} tone="text-accent-mint" />
                      <RecentMetric label="어시" value={n(match.assists)} tone="text-purple-300" />
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-text-muted">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{shortMapName(match.mapName)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} className="shrink-0" />
                        <span>{formatMatchTime(match.createdAt)} · {duration(match.duration)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
                      <span>헤드샷 {n(match.headshotKills)}</span>
                      <span>최장 {km(match.longestKill)}</span>
                    </div>

                    {(match.teammates?.length ?? 0) > 1 && (
                      <div className="mt-3 rounded-xl border border-border bg-bg-outer/70 overflow-hidden">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border text-[10px] font-semibold text-text-muted">
                          <Users size={11} />
                          <span>팀원 {match.teammates?.length ?? 0}명</span>
                        </div>
                        <div className="divide-y divide-border/60">
                          {match.teammates?.map((mate) => (
                            <div key={mate.id || mate.playerId || mate.name} className="grid grid-cols-[minmax(0,1fr)_28px_42px_28px] gap-1 px-2 py-1.5 text-[10px] items-center">
                              <span className={`truncate font-medium ${mate.isSearchedPlayer ? 'text-accent-mint' : 'text-text-secondary'}`}>
                                {mate.name || mate.playerId || '-'}
                              </span>
                              <span className="text-right text-red-300 tabular-nums">{n(mate.kills)}</span>
                              <span className="text-right text-accent-mint tabular-nums">{n(mate.damageDealt)}</span>
                              <span className="text-right text-purple-300 tabular-nums">{n(mate.assists)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] font-mono text-text-muted/70 truncate mt-2">{match.id}</p>
                  </div>
                )) : (
                  <div className="col-span-full bg-bg-card p-8 text-center text-sm text-text-muted">
                    최근 전적 상세를 불러오지 못했습니다
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-72 text-center">
            <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-3">
              <Gamepad2 size={24} className="text-border" />
            </div>
            <p className="text-sm font-medium text-text-muted">검색할 플레이어 닉네임을 입력하세요</p>
            <p className="text-xs text-text-muted/60 mt-1">처음 사용할 때는 PUBG Developer API 키를 저장해야 합니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, sub, color, bg }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: string
  bg: string
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-3.5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
          <span className={color}>{icon}</span>
        </div>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1.5">{sub}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold text-text-primary mt-1 tabular-nums">{value}</p>
    </div>
  )
}

function RankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm font-bold text-text-primary tabular-nums">{value}</span>
    </div>
  )
}

function RecentMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-bg-outer border border-border rounded-xl px-2 py-2 min-w-0">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className={`text-sm font-bold tabular-nums truncate ${tone}`}>{value}</p>
    </div>
  )
}
