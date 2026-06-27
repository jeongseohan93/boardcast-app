import { useState, useEffect } from 'react'
import { Vote, Plus, Trash2, Play, Square, RotateCcw, BarChart2, Terminal } from 'lucide-react'
import { api } from '../api/client'
import { useVoteStore } from '../store/voteStore'

const COLORS = ['#00FFA3','#A78BFA','#FFD166','#F472B6','#60A5FA','#34D399','#FB923C','#E879F9']

export default function VotePage() {
  const poll = useVoteStore((s) => s.poll)

  const [title, setTitle]     = useState('')
  const [options, setOptions] = useState(['', ''])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/api/voting').then((res) => {
      useVoteStore.getState().setPoll(res.data)
    }).catch(() => {})
  }, [])

  const addOption    = () => setOptions((p) => [...p, ''])
  const removeOption = (i: number) => setOptions((p) => p.filter((_, idx) => idx !== i))
  const setOption    = (i: number, v: string) => setOptions((p) => p.map((o, idx) => idx === i ? v : o))

  const handleStart = async () => {
    const filtered = options.map((o) => o.trim()).filter(Boolean)
    if (!title.trim() || filtered.length < 2) return
    setLoading(true)
    try {
      await api.post('/api/voting/start', { title: title.trim(), options: filtered })
      setTitle('')
      setOptions(['', ''])
    } catch {}
    setLoading(false)
  }

  const handleStop  = async () => { await api.post('/api/voting/stop').catch(() => {}) }
  const handleClear = async () => { await api.post('/api/voting/clear').catch(() => {}) }

  const total    = poll.options.reduce((s, o) => s + o.votes, 0)
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1)

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* ── 헤더 ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-xl bg-accent-mint/15 border border-accent-mint/25 flex items-center justify-center">
          <Vote size={15} className="text-accent-mint" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-text-primary leading-none">투표 관리</h1>
          <p className="text-xs text-text-muted mt-0.5">채팅 명령어 또는 직접 투표를 생성하세요</p>
        </div>
      </div>

      {/* ── 본문 2단 ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">

        {/* 좌: 투표 현황 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto border-r border-border p-5">

          {/* 현황 제목 + 상태 뱃지 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-text-muted" />
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">투표 현황</span>
            </div>
            {poll.status === 'active' && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-mint bg-accent-mint/10 border border-accent-mint/25 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse" />
                LIVE
              </span>
            )}
            {poll.status === 'ended' && (
              <span className="text-xs font-semibold text-text-muted bg-bg-card border border-border px-2.5 py-1 rounded-full">
                종료됨
              </span>
            )}
          </div>

          {poll.status === 'idle' ? (
            /* 빈 상태 */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-4">
                <BarChart2 size={28} className="text-border" />
              </div>
              <p className="text-sm font-semibold text-text-muted">진행 중인 투표가 없습니다</p>
              <p className="text-xs text-text-muted/50 mt-2 leading-relaxed">
                오른쪽 폼에서 투표를 만들거나<br />
                채팅에서 <span className="text-accent-mint font-mono">!투표</span> 명령어를 사용하세요
              </p>
            </div>
          ) : (
            /* 투표 결과 */
            <div className="space-y-1">
              {/* 제목 */}
              <div className="mb-5">
                <p className="text-lg font-bold text-text-primary leading-tight">{poll.title}</p>
                <p className="text-xs text-text-muted mt-1">
                  총 <span className="text-text-secondary font-semibold">{total}</span>표
                  {poll.status === 'active' && (
                    <span className="text-text-muted"> · 채팅에서 번호를 입력하면 투표됩니다</span>
                  )}
                </p>
              </div>

              {/* 항목별 바 */}
              <div className="space-y-4">
                {poll.options.map((opt, i) => {
                  const pct      = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                  const isWinner = poll.status === 'ended' && opt.votes === maxVotes && total > 0
                  const color    = COLORS[i % COLORS.length]
                  return (
                    <div key={i} className={`rounded-xl p-3.5 border transition-colors ${isWinner ? 'border-accent-mint/30 bg-accent-mint/5' : 'border-border bg-bg-card'}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                            style={{ background: color + '22', color, border: `1px solid ${color}44` }}
                          >
                            {i + 1}
                          </span>
                          <span className={`text-sm font-semibold ${isWinner ? 'text-accent-mint' : 'text-text-primary'}`}>
                            {opt.label}
                          </span>
                          {isWinner && (
                            <span className="text-xs bg-accent-mint/15 text-accent-mint px-1.5 py-0.5 rounded font-semibold">🏆 1위</span>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-base font-black" style={{ color }}>{pct}%</span>
                          <span className="text-xs text-text-muted ml-1.5">{opt.votes}표</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-bg-input rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 컨트롤 */}
              <div className="pt-4">
                {poll.status === 'active' && (
                  <button
                    onClick={handleStop}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors"
                  >
                    <Square size={13} /> 투표 종료
                  </button>
                )}
                {poll.status === 'ended' && (
                  <button
                    onClick={handleClear}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border border-border text-text-muted hover:text-text-secondary hover:border-text-muted/40 rounded-xl transition-colors"
                  >
                    <RotateCcw size={13} /> 초기화하고 새 투표 만들기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 우: 새 투표 만들기 + 명령어 */}
        <div className="w-72 shrink-0 flex flex-col overflow-y-auto">

          {/* 새 투표 만들기 */}
          <div className="p-5 border-b border-border">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">새 투표</p>

            {poll.status === 'active' ? (
              <div className="flex flex-col items-center text-center py-6">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-mint mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse" /> 투표 진행 중
                </span>
                <p className="text-xs text-text-muted">투표가 종료되면<br />새 투표를 만들 수 있습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
                  placeholder="투표 제목..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />

                <div className="space-y-1.5">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={{ background: COLORS[i % COLORS.length] + '22', color: COLORS[i % COLORS.length] }}
                      >
                        {i + 1}
                      </span>
                      <input
                        className="flex-1 bg-bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
                        placeholder={`항목 ${i + 1}`}
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                      />
                      {options.length > 2 && (
                        <button onClick={() => removeOption(i)} className="p-1 text-text-muted hover:text-red-400 transition-colors shrink-0">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {options.length < 8 && (
                    <button
                      onClick={addOption}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-mint transition-colors pl-6 mt-1"
                    >
                      <Plus size={11} /> 항목 추가
                    </button>
                  )}
                </div>

                <button
                  onClick={handleStart}
                  disabled={loading || !title.trim() || options.filter(Boolean).length < 2}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Play size={13} /> {loading ? '시작 중...' : '투표 시작'}
                </button>
              </div>
            )}
          </div>

          {/* 채팅 명령어 */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={12} className="text-text-muted" />
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">채팅 명령어</p>
            </div>
            <div className="space-y-2.5">
              {([
                ['!투표 제목 / A / B', '투표 시작'],
                ['!투표종료',          '투표 종료'],
                ['1  /  2  /  3 …',   '번호 입력으로 투표'],
              ] as const).map(([cmd, desc]) => (
                <div key={cmd}>
                  <code className="block text-xs text-accent-mint font-mono bg-accent-mint/8 border border-accent-mint/15 px-2.5 py-1.5 rounded-lg">{cmd}</code>
                  <p className="text-xs text-text-muted mt-1 pl-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
