import { useEffect, useState } from 'react'
import { Copy, Monitor, PartyPopper, Play, RotateCcw, SlidersHorizontal, Wifi } from 'lucide-react'
import { api } from '../api/client'
import {
  DEFAULT_OV_SETTINGS,
  EMOTE_THEMES,
  AllOvSettings,
  EmoteOvSettings,
  StreamPreviewCard,
  buildOverlayUrl,
} from './overlayShared'


function Slider({ label, min, max, step = 1, value, display, onChange }: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  display: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-bold text-text-primary bg-bg-input border border-border rounded-md px-2 py-0.5 min-w-[62px] text-center tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full h-0.5 appearance-none rounded-full cursor-pointer"
        style={{ accentColor: '#F472B6' }}
      />
    </div>
  )
}

export default function EmotePartyPage() {
  const [port, setPort] = useState(3001)
  const [networkIp, setNetworkIp] = useState<string | null>(null)
  const [themes, setThemes] = useState<Record<string, number>>({})
  const [settings, setSettings] = useState<AllOvSettings>(DEFAULT_OV_SETTINGS)
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    api.get('/api/network-info').then((res: { data: { ips: string[]; port: number } }) => {
      const { ips, port: nextPort } = res.data
      if (ips.length) setNetworkIp(ips[0])
      setPort(nextPort)
    }).catch(() => {})

    window.electronAPI.store.get('overlayThemes').then((saved) => {
      if (saved && typeof saved === 'object') setThemes(saved as Record<string, number>)
    }).catch(() => {})

    window.electronAPI.store.get('overlaySettings').then((saved) => {
      if (saved && typeof saved === 'object') {
        const s = saved as Partial<AllOvSettings>
        setSettings((prev) => ({
          chat: { ...prev.chat, ...(s.chat || {}) },
          donation: { ...prev.donation, ...(s.donation || {}) },
          follow: { ...prev.follow, ...(s.follow || {}) },
          emote: { ...prev.emote, ...(s.emote || {}) },
          avachat: { ...prev.avachat, ...(s.avachat || {}) },
        }))
      }
    }).catch(() => {})
  }, [])

  const saveTheme = (id: number) => {
    const next = { ...themes, emote: id }
    setThemes(next)
    window.electronAPI.store.set('overlayThemes', next).catch(() => {})
  }

  const saveEmoteSettings = (patch: Partial<EmoteOvSettings>) => {
    const next = { ...settings, emote: { ...settings.emote, ...patch } }
    setSettings(next)
    window.electronAPI.store.set('overlaySettings', next).catch(() => {})
  }

  const reset = () => {
    saveTheme(1)
    saveEmoteSettings(DEFAULT_OV_SETTINGS.emote)
  }

  const sendTest = async () => {
    setTesting(true)
    try { await api.post('/api/overlay/test/emote') } catch {}
    setTimeout(() => setTesting(false), 1500)
  }

  const base = `http://localhost:${port}`
  const netBase = networkIp ? `http://${networkIp}:${port}` : null
  const localUrl = buildOverlayUrl(base, '/overlay/emote', 'emote', themes, settings)
  const obsUrl = buildOverlayUrl(netBase || base, '/overlay/emote', 'emote', themes, settings)
  const currentTheme = themes.emote || 1

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(''), 1800)
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
        <PartyPopper size={17} className="text-accent-purple" />
        <h1 className="text-sm font-bold text-text-primary">이모티콘 파티</h1>
        {networkIp && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-accent-mint bg-accent-mint/10 border border-accent-mint/20 rounded-lg px-2.5 py-1">
            <Wifi size={11} /> OBS URL 사용 가능
          </div>
        )}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-[430px] shrink-0 border-r border-border bg-bg-card overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-text-muted" />
                <span className="text-xs font-semibold text-text-secondary">OBS 브라우저 소스</span>
              </div>
              <button
                onClick={() => copy(obsUrl, 'obs')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 transition-colors font-medium"
              >
                <Copy size={11} /> {copied === 'obs' ? '복사됨' : '복사'}
              </button>
            </div>
            <code className="block text-xs text-accent-purple bg-bg-input border border-accent-purple/20 rounded-lg px-3 py-2 font-mono break-all">
              {obsUrl}
            </code>
            <button
              onClick={() => copy(localUrl, 'local')}
              className="mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              {copied === 'local' ? 'localhost URL 복사됨' : 'localhost URL 복사'}
            </button>
          </div>

          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold text-text-secondary mb-3">테마</p>
            <div className="grid grid-cols-2 gap-3">
              {EMOTE_THEMES.map((theme) => (
                <StreamPreviewCard
                  key={theme.id}
                  overlayKey="emote"
                  theme={theme}
                  selected={currentTheme === theme.id}
                  onClick={() => saveTheme(theme.id)}
                />
              ))}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-text-muted" />
                <span className="text-xs font-semibold text-text-secondary">파티클 설정</span>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-border text-text-muted hover:text-text-secondary hover:border-accent-purple/40 rounded-lg transition-colors"
              >
                <RotateCcw size={11} /> 초기화
              </button>
            </div>
            <Slider
              label="크기"
              min={24}
              max={96}
              value={settings.emote.size}
              display={`${settings.emote.size}px`}
              onChange={(size) => saveEmoteSettings({ size })}
            />
            <Slider
              label="최대 개수"
              min={20}
              max={220}
              step={10}
              value={settings.emote.maxParts}
              display={`${settings.emote.maxParts}개`}
              onChange={(maxParts) => saveEmoteSettings({ maxParts })}
            />
            <Slider
              label="중력"
              min={200}
              max={1800}
              step={50}
              value={settings.emote.gravity}
              display={String(settings.emote.gravity)}
              onChange={(gravity) => saveEmoteSettings({ gravity })}
            />
            <Slider
              label="퍼짐"
              min={0.5}
              max={1.8}
              step={0.1}
              value={settings.emote.spread}
              display={`${settings.emote.spread.toFixed(1)}x`}
              onChange={(spread) => saveEmoteSettings({ spread })}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-bg-outer">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-card shrink-0">
            <span className="text-xs font-semibold text-text-secondary">미리보기</span>
            <button
              onClick={sendTest}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold bg-accent-purple/15 border border-accent-purple/35 text-accent-purple hover:bg-accent-purple/25 rounded-lg transition-colors disabled:opacity-50"
            >
              <Play size={12} /> {testing ? '전송 중...' : '테스트'}
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-5">
            <div className="w-full max-w-5xl bg-black border border-white/5 shadow-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <iframe
                key={localUrl}
                src={localUrl}
                className="w-full h-full"
                style={{ border: 'none' }}
                title="이모티콘 파티 미리보기"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
