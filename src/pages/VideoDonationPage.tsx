import { useEffect, useRef, useState } from 'react'
import { Clapperboard, Copy, PauseCircle, Play, RefreshCw, Send, Settings2, Trash2, X } from 'lucide-react'
import { videoDonationApi } from '../api/client'
import { useToastStore } from '../store/toastStore'
import { io as ioClient } from 'socket.io-client'

interface VideoDonationConfig {
  enabled: boolean
  minAmount: number
  autoPlay: boolean
  maxSeconds: number
}

interface VideoDonationItem {
  id: string
  nickname: string
  amount: number
  message: string
  url: string
  videoId: string
  status: 'pending' | 'playing' | 'played' | 'rejected'
  createdAt: string
}

const STATUS_STYLE: Record<VideoDonationItem['status'], string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25',
  playing: 'text-accent-mint bg-accent-mint/10 border-accent-mint/25',
  played: 'text-text-muted bg-white/5 border-border',
  rejected: 'text-accent-danger bg-accent-danger/10 border-accent-danger/25',
}

const STATUS_LABEL: Record<VideoDonationItem['status'], string> = {
  pending: '대기',
  playing: '재생 중',
  played: '재생 완료',
  rejected: '거절',
}

export default function VideoDonationPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [config, setConfig] = useState<VideoDonationConfig>({ enabled: true, minAmount: 0, autoPlay: false, maxSeconds: 90 })
  const [queue, setQueue] = useState<VideoDonationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualNickname, setManualNickname] = useState('manual')
  const [manualAmount, setManualAmount] = useState(1000)
  const socketRef = useRef<ReturnType<typeof ioClient> | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await videoDonationApi.get()
      setConfig(res.data.config)
      setQueue(res.data.queue || [])
    } catch {
      addToast({ type: 'error', title: '영도 목록 조회 실패' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const host = window.location.hostname || 'localhost'
    const sock = ioClient(`http://${host}:3001`, { transports: ['websocket'] })
    socketRef.current = sock
    sock.on('videoDonation:queue', (queue: VideoDonationItem[]) => setQueue(queue))
    return () => { sock.disconnect(); socketRef.current = null }
  }, [])

  const updateConfig = async (patch: Partial<VideoDonationConfig>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    try {
      const res = await videoDonationApi.updateConfig(next)
      setConfig(res.data)
    } catch {
      addToast({ type: 'error', title: '영도 설정 저장 실패' })
    }
  }

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    try {
      await fn()
      await load()
    } catch {
      addToast({ type: 'error', title: '영도 처리 실패' })
    } finally {
      setBusy('')
    }
  }

  const addManual = async () => {
    if (!manualUrl.trim()) return
    await run('manual', async () => {
      await videoDonationApi.addManual({
        nickname: manualNickname.trim() || 'manual',
        amount: manualAmount,
        url: manualUrl.trim(),
      })
      setManualUrl('')
      addToast({ type: 'info', title: '영도 대기열에 추가했습니다' })
    })
  }

  const copyOverlayUrl = async () => {
    const host = window.location.hostname || 'localhost'
    const url = `http://${host}:3001/overlay/video-donation`
    try {
      await navigator.clipboard.writeText(url)
      addToast({ type: 'info', title: '영도 오버레이 URL 복사 완료' })
    } catch {
      addToast({ type: 'error', title: '복사 실패' })
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Clapperboard size={18} className="text-accent-mint" />
        <div>
          <h1 className="text-base font-bold text-text-primary">영도 관리</h1>
          <p className="text-xs text-text-muted mt-0.5">후원 메시지의 YouTube 링크를 대기열로 관리하고 OBS 오버레이로 재생합니다</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-text-primary">대기열</p>
                <p className="text-xs text-text-muted mt-0.5">오래된 대기 항목부터 재생됩니다</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => run('play-next', () => videoDonationApi.playNext())}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-mint text-bg-outer text-xs font-semibold hover:brightness-110 disabled:opacity-50"
                >
                  <Play size={12} /> 다음 재생
                </button>
                <button
                  type="button"
                  onClick={() => run('stop', () => videoDonationApi.stop())}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary disabled:opacity-50 text-xs"
                >
                  <PauseCircle size={12} /> 스킵
                </button>
              </div>
            </div>

            <div className="divide-y divide-border/70">
              {queue.length === 0 ? (
                <div className="py-16 text-center text-text-muted">
                  <Clapperboard size={26} className="mx-auto mb-2 text-border" />
                  <p className="text-sm">대기 중인 영도가 없습니다</p>
                </div>
              ) : queue.map((item) => (
                <div key={item.id} className="grid grid-cols-[120px_minmax(0,1fr)_auto] gap-3 p-3 hover:bg-white/3">
                  <img
                    src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                    alt=""
                    className="w-[120px] aspect-video rounded-lg object-cover bg-bg-outer border border-border"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLE[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      <span className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary truncate">{item.nickname}</p>
                    <p className="text-xs text-yellow-400 mt-0.5">{item.amount.toLocaleString()} 치즈</p>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2 break-all">{item.message || item.url}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => run(`play:${item.id}`, () => videoDonationApi.play(item.id))}
                      disabled={!!busy || item.status === 'rejected'}
                      className="p-2 rounded-lg text-accent-mint hover:bg-accent-mint/10 disabled:opacity-30"
                      title="재생"
                    >
                      <Play size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => run(`reject:${item.id}`, () => videoDonationApi.reject(item.id))}
                      disabled={!!busy || item.status === 'rejected'}
                      className="p-2 rounded-lg text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 disabled:opacity-30"
                      title="거절"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {queue.some((item) => item.status === 'played' || item.status === 'rejected') && (
              <div className="p-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => run('clear', () => videoDonationApi.clearPlayed())}
                  disabled={!!busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-mint/40 disabled:opacity-50"
                >
                  <Trash2 size={12} /> 완료/거절 항목 정리
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 size={14} className="text-accent-mint" />
                <span className="text-sm font-semibold text-text-primary">설정</span>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-secondary">영도 사용</span>
                  <input type="checkbox" checked={config.enabled} onChange={(e) => updateConfig({ enabled: e.target.checked })} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-secondary">자동 재생</span>
                  <input type="checkbox" checked={config.autoPlay} onChange={(e) => updateConfig({ autoPlay: e.target.checked })} />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">최소 치즈</span>
                  <input
                    type="number"
                    min={0}
                    value={config.minAmount}
                    onChange={(e) => updateConfig({ minAmount: Number(e.target.value) || 0 })}
                    className="mt-1 w-full bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-mint"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">최대 재생 시간(초)</span>
                  <input
                    type="number"
                    min={5}
                    value={config.maxSeconds}
                    onChange={(e) => updateConfig({ maxSeconds: Number(e.target.value) || 90 })}
                    className="mt-1 w-full bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-mint"
                  />
                </label>
              </div>
            </section>

            <section className="bg-bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-3">수동 추가</p>
              <div className="space-y-2">
                <input
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="YouTube URL"
                  className="w-full bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={manualNickname}
                    onChange={(e) => setManualNickname(e.target.value)}
                    placeholder="닉네임"
                    className="bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
                  />
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(Number(e.target.value) || 0)}
                    className="bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-mint"
                  />
                </div>
                <button
                  type="button"
                  onClick={addManual}
                  disabled={!manualUrl.trim() || !!busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-mint text-bg-outer rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-40"
                >
                  <Send size={14} /> 대기열 추가
                </button>
              </div>
            </section>

            <section className="bg-bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-2">OBS 오버레이</p>
              <p className="text-xs text-text-muted leading-relaxed mb-3">OBS 브라우저 소스에 영상 후원 오버레이 URL을 추가하세요.</p>
              <button
                type="button"
                onClick={copyOverlayUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-accent-mint/40"
              >
                <Copy size={14} /> URL 복사
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
