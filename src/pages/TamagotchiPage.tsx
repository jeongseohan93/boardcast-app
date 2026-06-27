/**
 * [다마고치 페이지]
 *
 * 방송 참여도(후원·팔로우)에 따라 성장하는 마스코트 캐릭터(다마고치)의 상태를 관리하는 페이지.
 *
 * ── STAGE_META / THEME_META / MASCOT_THEME ────────────────────────────────
 *   캐릭터 성장 단계(egg→baby→teen→star)와 테마별 색상·이름을 정의하는 메타 데이터 Record.
 *   현재 stage 와 theme 에 따라 UI 컬러와 아이콘이 달라진다.
 *
 * ── TamagotchiMascot (SVG 인라인 컴포넌트) ───────────────────────────────
 *   radialGradient 를 사용한 SVG 마스코트를 React 컴포넌트로 구현했다.
 *   mood 값에 따라 표정(눈/입 모양)이 달라지고 기분 이모티콘도 변경된다.
 *   CSS `<linearGradient>` 대신 SVG `<radialGradient>` 를 사용한 이유:
 *   캐릭터의 구형 질감 표현에 radial 이 더 자연스럽기 때문.
 *
 * ── overlayUrl (localhost:3001 고정) ─────────────────────────────────────
 *   다마고치 오버레이는 별도 overlay 경로에 서빙되며 OBS Browser Source URL 로 제공된다.
 *   buildOverlayUrl 을 사용하지 않고 직접 하드코딩된 이유:
 *   다마고치 오버레이는 별도 커스텀 파라미터가 없어 빌더가 불필요하다.
 *
 * ── 리셋 (confirm 확인 필수) ─────────────────────────────────────────────
 *   다마고치 초기화는 모든 성장 데이터를 지우는 파괴적 작업이므로 confirm() 으로 재확인한다.
 *
 * ── 서브컴포넌트 ──────────────────────────────────────────────────────────
 *   Metric → 단일 지표 레이블+값+아이콘 셀
 *   Gauge  → 좁은 막대 그래프로 mood/hunger/energy 를 시각화하는 게이지
 */
import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Gift, Heart, Play, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { tamagotchiApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

interface TamagotchiState {
  level: number
  exp: number
  expToNext: number
  cheese: number
  follows: number
  mood: number
  hunger: number
  energy: number
  stage: 'egg' | 'baby' | 'teen' | 'star'
  theme: 'classic' | 'pixel' | 'slime' | 'space'
  lastEvent?: {
    type: 'donation' | 'follow' | 'reset'
    nickname?: string
    amount?: number
    message: string
    at: string
  }
  updatedAt: string
}

const STAGE_META: Record<TamagotchiState['stage'], { label: string; title: string; colors: string; glow: string }> = {
  egg: {
    label: '알',
    title: '처음 만난 치즈몽',
    colors: 'from-slate-100 to-emerald-200',
    glow: 'shadow-emerald-300/20',
  },
  baby: {
    label: '베이비',
    title: '방송에 적응 중',
    colors: 'from-emerald-200 to-emerald-400',
    glow: 'shadow-emerald-300/25',
  },
  teen: {
    label: '틴',
    title: '제법 든든한 파트너',
    colors: 'from-yellow-200 to-orange-400',
    glow: 'shadow-yellow-300/25',
  },
  star: {
    label: '스타',
    title: '방송의 마스코트',
    colors: 'from-violet-300 to-pink-400',
    glow: 'shadow-pink-300/25',
  },
}

const THEME_META: Record<TamagotchiState['theme'], { name: string; desc: string; colors: string; shape: string }> = {
  classic: {
    name: '클래식',
    desc: '둥근 방송 펫',
    colors: 'from-emerald-200 to-teal-400',
    shape: 'rounded-full',
  },
  pixel: {
    name: '픽셀',
    desc: '레트로 게임 느낌',
    colors: 'from-lime-200 to-green-500',
    shape: 'rounded-md',
  },
  slime: {
    name: '슬라임',
    desc: '말랑한 젤리형',
    colors: 'from-cyan-200 to-sky-500',
    shape: 'rounded-[42%]',
  },
  space: {
    name: '우주',
    desc: '별빛 마스코트',
    colors: 'from-violet-300 to-pink-500',
    shape: 'rounded-[38%]',
  },
}

function fmt(n: number) {
  return Number(n || 0).toLocaleString()
}

function pct(value: number, max = 100) {
  return Math.max(0, Math.min(100, (Number(value || 0) / max) * 100))
}

function fmtDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function TamagotchiPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [state, setState] = useState<TamagotchiState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)

  const overlayUrl = 'http://localhost:3001/overlay/tamagotchi'
  const meta = useMemo(() => STAGE_META[state?.stage ?? 'egg'], [state?.stage])
  const themeMeta = useMemo(() => THEME_META[state?.theme ?? 'classic'], [state?.theme])
  const expPercent = state ? pct(state.exp, state.expToNext) : 0

  const load = async () => {
    setLoading(true)
    try {
      const res = await tamagotchiApi.getState()
      setState(res.data)
    } catch {
      addToast({ type: 'error', title: '다마고치 상태를 불러오지 못했습니다' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const testGrowth = async () => {
    setBusy('test')
    try {
      await tamagotchiApi.test()
      await load()
      addToast({ type: 'info', title: '테스트 성장 이벤트를 보냈습니다' })
    } catch {
      addToast({ type: 'error', title: '테스트 실패' })
    } finally {
      setBusy('')
    }
  }

  const reset = async () => {
    if (!confirm('다마고치 성장 기록을 초기화할까요?')) return
    setBusy('reset')
    try {
      const res = await tamagotchiApi.reset()
      setState(res.data)
      addToast({ type: 'info', title: '다마고치를 초기화했습니다' })
    } catch {
      addToast({ type: 'error', title: '초기화 실패' })
    } finally {
      setBusy('')
    }
  }

  const setTheme = async (theme: TamagotchiState['theme']) => {
    setBusy(`theme:${theme}`)
    try {
      const res = await tamagotchiApi.setTheme(theme)
      setState(res.data)
      addToast({ type: 'info', title: '다마고치 테마를 변경했습니다' })
    } catch {
      addToast({ type: 'error', title: '테마 변경 실패' })
    } finally {
      setBusy('')
    }
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(overlayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading && !state) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-outer">
        <div className="text-sm text-text-secondary animate-pulse">다마고치 상태를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-bg-outer overflow-hidden gap-3 p-3">
      <div className="flex-1 min-w-0 bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-pink-300" />
            <span className="text-sm font-semibold text-text-primary">다마고치 관리</span>
            {state && <span className="text-xs text-text-muted bg-bg-outer border border-border rounded-full px-2 py-0.5">Lv.{state.level}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-50" title="새로고침">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={testGrowth} disabled={busy === 'test'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
              <Play size={12} /> 테스트
            </button>
          </div>
        </div>

        {state && (
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-[minmax(320px,420px)_1fr] gap-4">
            <section className="bg-bg-outer border border-border rounded-2xl p-5 flex flex-col items-center justify-center">
              <TamagotchiMascot stage={state.stage} theme={state.theme} className="w-48 h-48" />
              <h2 className="mt-5 text-2xl font-black text-text-primary">치즈몽</h2>
              <p className="mt-1 text-sm text-text-secondary">{meta.title}</p>
              <p className="mt-1 text-xs text-accent-mint">{themeMeta.name} 테마</p>
              <div className="mt-4 w-full">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>경험치</span>
                  <span>{fmt(state.exp)} / {fmt(state.expToNext)}</span>
                </div>
                <div className="h-3 bg-bg-input border border-border rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-mint to-yellow-300 rounded-full transition-all" style={{ width: `${expPercent}%` }} />
                </div>
              </div>
            </section>

            <section className="min-w-0 space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <Metric label="단계" value={meta.label} />
                <Metric label="누적 치즈" value={fmt(state.cheese)} icon={<Gift size={13} />} />
                <Metric label="팔로우" value={fmt(state.follows)} icon={<Heart size={13} />} />
                <Metric label="기분" value={`${Math.round(state.mood)}%`} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Gauge label="기분" value={state.mood} color="bg-pink-300" />
                <Gauge label="허기" value={state.hunger} color="bg-yellow-300" />
                <Gauge label="에너지" value={state.energy} color="bg-accent-mint" />
              </div>

              <div className="bg-bg-outer border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">테마 선택</p>
                    <p className="text-xs text-text-muted mt-0.5">관리 페이지와 OBS 오버레이에 같이 적용됩니다</p>
                  </div>
                  <span className="text-xs text-accent-mint bg-accent-mint/10 border border-accent-mint/20 rounded-full px-2 py-0.5">
                    {themeMeta.name}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(THEME_META) as [TamagotchiState['theme'], typeof THEME_META.classic][]).map(([key, theme]) => {
                    const selected = state.theme === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void setTheme(key)}
                        disabled={busy === `theme:${key}`}
                        className={`text-left rounded-xl border p-3 transition-all ${
                          selected
                            ? 'border-accent-mint bg-accent-mint/10'
                            : 'border-border bg-bg-input hover:border-accent-mint/40'
                        }`}
                      >
                        <div className={`w-12 h-12 ${theme.shape} bg-gradient-to-br ${theme.colors} border border-white/30 shadow-lg`} />
                        <p className="mt-2 text-xs font-semibold text-text-primary">{theme.name}</p>
                        <p className="mt-0.5 text-[11px] text-text-muted leading-snug">{theme.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="bg-bg-outer border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">오버레이 URL</p>
                    <p className="text-xs text-text-muted mt-0.5">OBS 브라우저 소스에 추가하면 방송 화면에 표시됩니다</p>
                  </div>
                  <button onClick={() => window.electronAPI.openExternal(overlayUrl)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors" title="브라우저에서 열기">
                    <ExternalLink size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-accent-mint bg-bg-input border border-border rounded-lg px-3 py-2 font-mono truncate">{overlayUrl}</code>
                  <button onClick={copyUrl} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap">
                    <Copy size={12} /> {copied ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>

              <div className="bg-bg-outer border border-border rounded-2xl p-4">
                <p className="text-sm font-semibold text-text-primary mb-3">최근 반응</p>
                <div className="min-h-[58px] rounded-xl bg-bg-input border border-border p-3">
                  <p className="text-sm text-text-primary">{state.lastEvent?.message ?? '아직 반응 이벤트가 없습니다'}</p>
                  <p className="text-xs text-text-muted mt-1">{fmtDate(state.lastEvent?.at ?? state.updatedAt)}</p>
                </div>
              </div>

              <div className="bg-red-400/5 border border-red-400/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-red-200">초기화</p>
                  <p className="text-xs text-text-muted mt-0.5">레벨, 경험치, 누적 치즈와 팔로우 카운트를 처음 상태로 되돌립니다</p>
                </div>
                <button onClick={reset} disabled={busy === 'reset'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-400/30 text-red-200 rounded-lg hover:bg-red-400/10 disabled:opacity-50 transition-colors">
                  <RotateCcw size={12} /> 초기화
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

const MASCOT_THEME: Record<TamagotchiState['theme'], { bodyA: string; bodyB: string; ruffA: string; ruffB: string; accent: string; eye: string }> = {
  classic: { bodyA: '#D49A62', bodyB: '#8A5632', ruffA: '#FFF8E8', ruffB: '#EFD28E', accent: '#F4AFA0', eye: '#3A1A0D' },
  pixel: { bodyA: '#74B86A', bodyB: '#326F39', ruffA: '#F0FFD8', ruffB: '#B6DF74', accent: '#9BE076', eye: '#123D1E' },
  slime: { bodyA: '#68C7E8', bodyB: '#2377AC', ruffA: '#E5FBFF', ruffB: '#8FE5F9', accent: '#8DE5FF', eye: '#073B60' },
  space: { bodyA: '#C084FC', bodyB: '#6D28D9', ruffA: '#FAF5FF', ruffB: '#C4B5FD', accent: '#F0ABFC', eye: '#2E1065' },
}

function TamagotchiMascot({
  stage,
  theme,
  className = '',
}: {
  stage: TamagotchiState['stage']
  theme: TamagotchiState['theme']
  className?: string
}) {
  const palette = MASCOT_THEME[theme]
  const babyScale = stage === 'egg' ? 0.82 : stage === 'baby' ? 0.92 : 1
  const sparkle = stage === 'star'

  return (
    <div className={`relative flex items-center justify-center ${className}`} aria-label="Tamagotchi mascot">
      <div className="absolute inset-4 rounded-full bg-white/5 blur-xl" />
      <svg viewBox="0 0 160 160" className="relative h-full w-full drop-shadow-2xl" role="img">
        <defs>
          <radialGradient id="mascotBody" cx="38%" cy="26%" r="74%">
            <stop offset="0%" stopColor={palette.bodyA} />
            <stop offset="100%" stopColor={palette.bodyB} />
          </radialGradient>
          <radialGradient id="mascotRuff" cx="48%" cy="22%" r="80%">
            <stop offset="0%" stopColor={palette.ruffA} />
            <stop offset="100%" stopColor={palette.ruffB} />
          </radialGradient>
          <radialGradient id="mascotEye" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#8B5A34" />
            <stop offset="100%" stopColor={palette.eye} />
          </radialGradient>
        </defs>

        <g transform={`translate(80 84) scale(${babyScale}) translate(-80 -84)`}>
          <path d="M106 106 C137 91 140 62 121 51 C109 43 93 51 92 70 C91 88 99 101 106 106Z" fill="url(#mascotBody)" opacity="0.96" />
          <path d="M114 94 C132 84 133 66 121 59 C112 54 102 61 103 74 C104 84 109 91 114 94Z" fill="url(#mascotRuff)" opacity="0.92" />

          <ellipse cx="80" cy="112" rx="34" ry="23" fill="url(#mascotBody)" />
          <ellipse cx="80" cy="93" rx="43" ry="34" fill="url(#mascotBody)" />

          <path d="M47 67 C33 39 34 18 44 12 C56 20 65 40 64 65Z" fill="url(#mascotBody)" />
          <path d="M113 67 C127 39 126 18 116 12 C104 20 95 40 96 65Z" fill="url(#mascotBody)" />
          <path d="M49 60 C42 39 43 25 47 22 C55 31 59 45 58 62Z" fill={palette.accent} opacity="0.78" />
          <path d="M111 60 C118 39 117 25 113 22 C105 31 101 45 102 62Z" fill={palette.accent} opacity="0.78" />

          <circle cx="80" cy="70" r="34" fill="url(#mascotBody)" />
          <path d="M40 95 C47 75 59 66 80 66 C101 66 113 75 120 95 C108 89 99 98 94 113 C88 102 72 102 66 113 C61 98 52 89 40 95Z" fill="url(#mascotRuff)" />
          <circle cx="53" cy="96" r="13" fill="url(#mascotRuff)" />
          <circle cx="67" cy="104" r="14" fill="url(#mascotRuff)" />
          <circle cx="80" cy="107" r="15" fill="url(#mascotRuff)" />
          <circle cx="93" cy="104" r="14" fill="url(#mascotRuff)" />
          <circle cx="107" cy="96" r="13" fill="url(#mascotRuff)" />

          <ellipse cx="64" cy="70" rx="10" ry="12" fill="#120807" />
          <ellipse cx="96" cy="70" rx="10" ry="12" fill="#120807" />
          <ellipse cx="64" cy="71" rx="7" ry="9" fill="url(#mascotEye)" />
          <ellipse cx="96" cy="71" rx="7" ry="9" fill="url(#mascotEye)" />
          <circle cx="68" cy="65" r="3.2" fill="#FFFFFF" />
          <circle cx="100" cy="65" r="3.2" fill="#FFFFFF" />
          <circle cx="61" cy="75" r="1.4" fill="#FFFFFF" opacity="0.65" />
          <circle cx="93" cy="75" r="1.4" fill="#FFFFFF" opacity="0.65" />
          <ellipse cx="80" cy="82" rx="4.6" ry="3.1" fill="#160908" />
          <path d="M72 88 Q80 94 88 88" stroke="#160908" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <ellipse cx="51" cy="82" rx="8" ry="4.8" fill="#FF7A68" opacity="0.22" />
          <ellipse cx="109" cy="82" rx="8" ry="4.8" fill="#FF7A68" opacity="0.22" />

          <ellipse cx="60" cy="132" rx="14" ry="8" fill="url(#mascotBody)" />
          <ellipse cx="100" cy="132" rx="14" ry="8" fill="url(#mascotBody)" />
        </g>

        {sparkle && (
          <g fill="#FFE8A3">
            <path d="M127 28 L131 38 L141 42 L131 46 L127 56 L123 46 L113 42 L123 38Z" />
            <circle cx="35" cy="40" r="3" />
            <circle cx="134" cy="88" r="2.5" />
          </g>
        )}
      </svg>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-bg-outer border border-border rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-text-primary truncate">{value}</p>
    </div>
  )
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-outer border border-border rounded-2xl p-4">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-muted">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-bg-input rounded-full overflow-hidden border border-border">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct(value)}%` }} />
      </div>
    </div>
  )
}
