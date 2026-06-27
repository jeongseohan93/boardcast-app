/**
 * [오버레이 설정 페이지]
 *
 * 채팅·후원 알림·팔로우 알림·아바챗 오버레이의 세부 스타일을 편집하는 설정 페이지.
 *
 * ── 탭 구조 (Tab = 'chat' | 'donation' | 'follow' | 'avachat') ────────────
 *   탭별로 서로 다른 설정 컴포넌트를 렌더링하며, 오버레이 경로(path)와 테마 목록도 탭마다 다르다.
 *
 * ── iframe 미리보기 + ResizeObserver 스케일링 ──────────────────────────
 *   설정 패널 오른쪽에 실제 오버레이를 iframe 으로 미리 보여준다.
 *   오버레이의 원본 크기(1920×1080)를 미리보기 컨테이너 크기에 맞게 CSS scale() 로 축소한다.
 *   ResizeObserver 가 컨테이너 크기 변화를 감지해 scale 값을 동적으로 재계산한다.
 *
 * ── 이미지 업로드 (base64 data URL, PNG/GIF 최대 8MB) ──────────────────
 *   배경 이미지는 <input type="file"> 를 통해 선택하고 FileReader 로 base64 인코딩한다.
 *   서버 업로드 없이 base64 문자열 자체를 설정 값으로 저장하므로 오프라인에서도 동작한다.
 *   8MB 초과 시 토스트 에러를 표시하고 저장을 차단한다.
 *
 * ── avachatSlotRef ────────────────────────────────────────────────────────
 *   아바챗은 슬롯(slot1~slot4) 단위로 이미지를 각각 설정한다.
 *   이미지 파일 선택 다이얼로그가 열리기 전에 어느 슬롯에 저장할지 ref 로 기억해둔다.
 *   단일 hidden <input> 을 재사용하는 방식이라 다이얼로그가 열릴 때 slotRef 값을 확인해야 한다.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { SlidersHorizontal, RotateCcw, Play, Monitor, Image, Upload, X, ChevronDown, Info, Bell } from 'lucide-react'
import { api } from '../api/client'
import {
  CHAT_THEMES, DONATION_THEMES, FOLLOW_THEMES,
  DEFAULT_OV_SETTINGS, buildOverlayUrl,
  AllOvSettings, ChatOvSettings, AlertOvSettings, AvachatOvSettings,
  StreamPreviewCard,
} from './overlayShared'

type Tab = 'chat' | 'donation' | 'follow' | 'avachat'

const TABS: { key: Tab; label: string; path: string; themes: typeof CHAT_THEMES }[] = [
  { key: 'chat',     label: '채팅',        path: '/overlay/chat',     themes: CHAT_THEMES     },
  { key: 'donation', label: '후원 알림',    path: '/overlay/donation', themes: DONATION_THEMES },
  { key: 'follow',   label: '팔로우 알림',  path: '/overlay/follow',   themes: FOLLOW_THEMES   },
  { key: 'avachat',  label: '아바타 채팅',  path: '/overlay/avachat',  themes: []              },
]

const PRESET_COLORS = ['#00FFA3','#A78BFA','#60A5FA','#F472B6','#FFD166','#FB923C','#EF4444','#ffffff']
const NOTICE_THEMES = [
  { id: 1, label: '민트' },
  { id: 2, label: '라이트' },
  { id: 3, label: '네온' },
  { id: 4, label: '카카오' },
  { id: 5, label: 'HUD' },
]

function Slider({ label, min, max, step = 1, value, display, onChange }: {
  label: string; min: number; max: number; step?: number
  value: number; display: string; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-bold text-text-primary bg-bg-input border border-border rounded-md px-2 py-0.5 min-w-[52px] text-center tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-0.5 appearance-none rounded-full cursor-pointer"
        style={{ accentColor: '#00FFA3' }}
      />
    </div>
  )
}

export default function OverlaySettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [port, setPort]           = useState(3001)
  const [networkIp, setNetworkIp] = useState<string | null>(null)
  const [themes, setThemes]       = useState<Record<string, number>>({})
  const [settings, setSettings]   = useState<AllOvSettings>(DEFAULT_OV_SETTINGS)
  const [testing, setTesting]       = useState(false)
  const [previewRev, setPreviewRev]   = useState(0)
  const [themeOpen, setThemeOpen]     = useState(true)
  const [themeExpanded, setThemeExpanded] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.25)
  const donationImageInputRef = useRef<HTMLInputElement>(null)
  const followImageInputRef   = useRef<HTMLInputElement>(null)
  const avachatImageInputRef  = useRef<HTMLInputElement>(null)
  const avachatSlotRef        = useRef(0)
  const previewAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get('/api/network-info').then((res: { data: { ips: string[]; port: number } }) => {
      const { ips, port: p } = res.data
      if (ips.length) setNetworkIp(ips[0])
      setPort(p)
    }).catch(() => {})
    window.electronAPI.store.get('overlayThemes').then((saved) => {
      if (saved && typeof saved === 'object')
        setThemes(saved as Record<string, number>)
    }).catch(() => {})
    window.electronAPI.store.get('overlaySettings').then((saved) => {
      if (saved && typeof saved === 'object') {
        const s = saved as Partial<AllOvSettings>
        setSettings((prev) => ({
          chat:     { ...prev.chat,     ...(s.chat     || {}) },
          donation: { ...prev.donation, ...(s.donation || {}) },
          follow:   { ...prev.follow,   ...(s.follow   || {}) },
          emote:    { ...prev.emote,    ...(s.emote    || {}) },
          avachat:  { ...prev.avachat,  ...(s.avachat  || {}) },
        }))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => { setThemeExpanded(false) }, [activeTab])

  const updateScale = useCallback(() => {
    const el = previewAreaRef.current
    if (!el) return
    const widthScale = Math.max(0.1, (el.offsetWidth - 40) / 1920)
    const heightScale = Math.max(0.1, (el.offsetHeight - 104) / 1080)
    setPreviewScale(Math.min(widthScale, heightScale))
  }, [])

  useEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null
    if (previewAreaRef.current && ro) ro.observe(previewAreaRef.current)
    return () => {
      window.removeEventListener('resize', updateScale)
      ro?.disconnect()
    }
  }, [updateScale])

  const saveTheme = (key: string, id: number) => {
    setThemes(prev => {
      const next = { ...prev, [key]: id }
      window.electronAPI.store.set('overlayThemes', next).catch(() => {})
      api.post('/api/overlay/themes', { key, id }).catch(() => {})
      return next
    })
  }

  const saveSettings = (next: AllOvSettings) => {
    setSettings(next)
    window.electronAPI.store.set('overlaySettings', next).catch(() => {})
  }

  const updateChat = (patch: Partial<ChatOvSettings>) =>
    setSettings(prev => {
      const next = { ...prev, chat: { ...prev.chat, ...patch } }
      window.electronAPI.store.set('overlaySettings', next).catch(() => {})
      return next
    })

  const updateAlert = (key: 'donation' | 'follow', patch: Partial<AlertOvSettings>) =>
    setSettings(prev => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } }
      window.electronAPI.store.set('overlaySettings', next).catch(() => {})
      return next
    })

  const updateAvachat = (patch: Partial<AvachatOvSettings>) =>
    setSettings(prev => {
      const next = { ...prev, avachat: { ...prev.avachat, ...patch } }
      window.electronAPI.store.set('overlaySettings', next).catch(() => {})
      return next
    })

  const refreshPreview = () => setPreviewRev((v) => v + 1)

  const readImageAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const handleDonationImage = async (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/gif'].includes(file.type)) {
      window.alert('PNG 또는 GIF 이미지만 사용할 수 있어요.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      window.alert('이미지는 8MB 이하로 선택해 주세요.')
      return
    }
    try {
      const imageDataUrl = await readImageAsDataUrl(file)
      updateAlert('donation', { imageDataUrl, imageName: file.name })
      refreshPreview()
    } catch {
      window.alert('이미지를 불러오지 못했어요.')
    } finally {
      if (donationImageInputRef.current) donationImageInputRef.current.value = ''
    }
  }

  const removeDonationImage = () => {
    updateAlert('donation', { imageDataUrl: '', imageName: '' })
    refreshPreview()
  }

  const handleFollowImage = async (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/gif'].includes(file.type)) {
      window.alert('PNG 또는 GIF 이미지만 사용할 수 있어요.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      window.alert('이미지는 8MB 이하로 선택해 주세요.')
      return
    }
    try {
      const imageDataUrl = await readImageAsDataUrl(file)
      updateAlert('follow', { imageDataUrl, imageName: file.name })
      refreshPreview()
    } catch {
      window.alert('이미지를 불러오지 못했어요.')
    } finally {
      if (followImageInputRef.current) followImageInputRef.current.value = ''
    }
  }

  const removeFollowImage = () => {
    updateAlert('follow', { imageDataUrl: '', imageName: '' })
    refreshPreview()
  }

  const handleAvachatImage = async (slot: number, file?: File) => {
    if (!file) return
    if (!['image/png', 'image/gif', 'image/webp', 'image/jpeg'].includes(file.type)) {
      window.alert('PNG, JPG, WEBP, GIF 이미지만 사용할 수 있어요.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      window.alert('이미지는 8MB 이하로 선택해 주세요.')
      return
    }
    try {
      const imageDataUrl = await readImageAsDataUrl(file)
      setSettings(prev => {
        const images = [...(prev.avachat.images || ['', '', '', '', ''])]
        while (images.length < 5) images.push('')
        images[slot] = imageDataUrl
        const next = { ...prev, avachat: { ...prev.avachat, images } }
        window.electronAPI.store.set('overlaySettings', next).catch(() => {})
        return next
      })
      refreshPreview()
    } catch {
      window.alert('이미지를 불러오지 못했어요.')
    } finally {
      if (avachatImageInputRef.current) avachatImageInputRef.current.value = ''
    }
  }

  const removeAvachatImage = (slot: number) => {
    setSettings(prev => {
      const images = [...(prev.avachat.images || ['', '', '', '', ''])]
      while (images.length < 5) images.push('')
      images[slot] = ''
      const next = { ...prev, avachat: { ...prev.avachat, images } }
      window.electronAPI.store.set('overlaySettings', next).catch(() => {})
      return next
    })
    refreshPreview()
  }

  const reset = () => {
    saveSettings(DEFAULT_OV_SETTINGS)
    const rt = { chat: 1, donation: 1, follow: 1, emote: 1 }
    setThemes(prev => {
      const next = { ...prev, ...rt }
      window.electronAPI.store.set('overlayThemes', next).catch(() => {})
      return next
    })
    refreshPreview()
  }

  const sendTest = async () => {
    setTesting(true)
    try {
      await api.post(
        `/api/overlay/test/${activeTab}`,
        activeTab === 'donation'
          ? { imageDataUrl: settings.donation.imageDataUrl || '', imageSize: settings.donation.imageSize || 118 }
          : activeTab === 'follow'
          ? { imageDataUrl: settings.follow.imageDataUrl || '', imageSize: settings.follow.imageSize || 118 }
          : undefined,
      )
    } catch {}
    setTimeout(() => setTesting(false), 1500)
  }

  const BASE  = `http://localhost:${port}`
  const NET   = networkIp ? `http://${networkIp}:${port}` : null
  const mkUrl = (path: string, key: string, net = false) =>
    buildOverlayUrl(net && NET ? NET : BASE, path, key, themes, settings)

  const tab          = TABS.find((t) => t.key === activeTab)!
  const currentTheme = themes[activeTab] || 1
  const lu           = mkUrl(tab.path, activeTab)
  const previewUrl   = `${lu}${lu.includes('?') ? '&' : '?'}preview=1&rev=${previewRev}`
  const nickColor    = settings.chat.nickColor
  const isCustom     = !!(nickColor && !PRESET_COLORS.includes(nickColor))

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
        <SlidersHorizontal size={16} className="text-accent-mint" />
        <h1 className="text-sm font-bold text-text-primary">오버레이 설정</h1>
        <button
          onClick={reset}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-border text-text-muted hover:text-text-secondary hover:border-accent-mint/30 rounded-lg transition-colors"
        >
          <RotateCcw size={11} /> 초기화
        </button>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-border shrink-0 px-4 bg-bg-card">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-accent-mint text-accent-mint'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 테마 설정 섹션 */}
      <div className="shrink-0 border-b border-border bg-bg-card">
        <button
          onClick={() => setThemeOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-sm font-semibold text-text-primary">
            테마 설정
            <span className="ml-2 text-xs font-normal text-text-muted">{tab.themes.length}종</span>
          </span>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform duration-200 ${themeOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {themeOpen && (
          <div className="px-4 pb-4">
            {/* 안내 배너 */}
            <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent-mint/5 border border-accent-mint/15 text-xs text-text-secondary leading-relaxed">
              <Info size={12} className="text-accent-mint shrink-0 mt-0.5" />
              테마 변경 후 OBS 브라우저 소스를 새로 고침해야 적용됩니다
            </div>

            {tab.themes.length > 0 ? (
              <>
                <div className="overflow-y-auto max-h-[272px] pr-0.5 -mr-0.5">
                  <div className="grid grid-cols-5 gap-2.5">
                    {(themeExpanded ? tab.themes : tab.themes.slice(0, 10)).map((t) => (
                      <StreamPreviewCard
                        key={t.id}
                        overlayKey={activeTab}
                        theme={t}
                        selected={currentTheme === t.id}
                        onClick={() => saveTheme(activeTab, t.id)}
                      />
                    ))}
                  </div>
                </div>

                {tab.themes.length > 10 && (
                  <button
                    onClick={() => setThemeExpanded((v) => !v)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-text-secondary border border-border rounded-xl hover:text-text-primary hover:border-white/20 transition-colors"
                  >
                    {themeExpanded ? '접기' : `테마 더보기 (${tab.themes.length - 10}개 더)`}
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${themeExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-text-muted/50">이 오버레이는 테마가 없습니다</p>
            )}
          </div>
        )}
      </div>

      {/* 본문 2단 */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* 좌: 표시 설정 */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-border overflow-hidden min-w-0">

          {/* 표시 설정 */}
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-xs font-semibold text-text-secondary mb-4">표시 설정</p>

            {/* 채팅: 슬라이더(좌) | 구분선 | 닉네임 색상(우) */}
            {activeTab === 'chat' && (
              <div className="flex gap-6">

                {/* 슬라이더 */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-input/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bell size={14} className="text-accent-mint shrink-0" />
                      <div className="min-w-0 [&>p:nth-child(2)]:hidden">
                        <p className="text-xs font-semibold text-text-secondary">공지 표시</p>
                        <p className="text-[10px] text-text-muted mt-0.5">채팅 오버레이 상단에 공지를 표시합니다</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateChat({ noticeEnabled: !settings.chat.noticeEnabled })}
                      className={`hidden relative w-12 h-6 rounded-full border transition-colors shrink-0 shadow-inner ${
                        settings.chat.noticeEnabled
                          ? 'bg-accent-mint border-accent-mint'
                          : 'bg-bg-outer border-border'
                      }`}
                      title={settings.chat.noticeEnabled ? '공지 표시 끄기' : '공지 표시 켜기'}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          settings.chat.noticeEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div className="grid grid-cols-2 w-28 rounded-lg border border-border bg-bg-outer p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateChat({ noticeEnabled: false })}
                        className={`h-7 rounded-md text-xs font-semibold transition-colors ${
                          !settings.chat.noticeEnabled
                            ? 'bg-text-muted/20 text-text-primary'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        끄기
                      </button>
                      <button
                        type="button"
                        onClick={() => updateChat({ noticeEnabled: true })}
                        className={`h-7 rounded-md text-xs font-semibold transition-colors ${
                          settings.chat.noticeEnabled
                            ? 'bg-accent-mint text-bg-outer'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        켜기
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-border bg-bg-input/40 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">공지 테마</span>
                      <span className="text-[10px] text-text-muted">채팅창 위 공지 스타일</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {NOTICE_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => updateChat({ noticeTheme: theme.id })}
                          className={`h-8 rounded-lg border text-xs font-semibold transition-colors ${
                            (settings.chat.noticeTheme || 1) === theme.id
                              ? 'border-accent-mint bg-accent-mint/10 text-accent-mint'
                              : 'border-border bg-bg-outer text-text-muted hover:text-text-secondary hover:border-accent-mint/40'
                          }`}
                        >
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Slider
                    label="폰트 크기" min={12} max={36} value={settings.chat.fontSize}
                    display={`${settings.chat.fontSize}px`}
                    onChange={(v) => updateChat({ fontSize: v })}
                  />
                  <Slider
                    label="최대 메시지" min={5} max={30} value={settings.chat.maxMsgs}
                    display={`${settings.chat.maxMsgs}개`}
                    onChange={(v) => updateChat({ maxMsgs: v })}
                  />
                  <Slider
                    label="표시 시간" min={0} max={60} step={5} value={settings.chat.fadeMs}
                    display={settings.chat.fadeMs === 0 ? '무제한' : `${settings.chat.fadeMs}초`}
                    onChange={(v) => updateChat({ fadeMs: v })}
                  />
                </div>

                {/* 구분선 */}
                <div className="w-px bg-border shrink-0" />

                {/* 닉네임 색상 */}
                <div className="w-44 shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-secondary">닉네임 색상</p>
                    {nickColor && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: nickColor }} />
                        <span className="text-[9px] font-mono text-text-muted">{nickColor}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {/* 랜덤 */}
                    <button
                      onClick={() => updateChat({ nickColor: '' })}
                      title="닉별 고유색"
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                        !nickColor
                          ? 'border-accent-mint bg-accent-mint/10'
                          : 'border-border bg-bg-input hover:border-text-muted hover:bg-white/5'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ background: 'conic-gradient(#FF6B9D,#FFD166,#00FFA3,#A78BFA,#FF6B9D)' }} />
                      <span className="text-[8px] text-text-muted leading-none">랜덤</span>
                    </button>

                    {/* 프리셋 */}
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateChat({ nickColor: c })}
                        title={c}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                          nickColor === c
                            ? 'border-white/40 bg-white/5'
                            : 'border-border bg-bg-input hover:border-text-muted hover:bg-white/5'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ background: c, boxShadow: nickColor === c ? `0 0 6px ${c}90` : undefined }}
                        />
                        <span className="text-[8px] leading-none" style={{ color: nickColor === c ? c : 'transparent' }}>✓</span>
                      </button>
                    ))}

                    {/* 직접 */}
                    <label
                      title="직접 선택"
                      className={`relative flex flex-col items-center gap-1 py-2 rounded-xl border cursor-pointer transition-all ${
                        isCustom
                          ? 'border-white/40 bg-white/5'
                          : 'border-border bg-bg-input hover:border-text-muted hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-text-muted"
                        style={{ background: isCustom ? nickColor : '#3a3d46' }}
                      >
                        {!isCustom && '+'}
                      </div>
                      <span className="text-[8px] text-text-muted leading-none">직접</span>
                      <input
                        type="color"
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        value={nickColor || '#00FFA3'}
                        onChange={(e) => updateChat({ nickColor: e.target.value })}
                      />
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* 후원/팔로우 슬라이더 */}
            {activeTab === 'avachat' && (
              <div className="max-w-3xl space-y-4">
                <Slider
                  label="아바타 크기"
                  min={60}
                  max={200}
                  value={settings.avachat.size}
                  display={`${settings.avachat.size}px`}
                  onChange={(v) => {
                    updateAvachat({ size: v })
                    refreshPreview()
                  }}
                />

                <div className="rounded-xl border border-border bg-bg-input/40 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image size={14} className="text-accent-mint" />
                      <span className="text-xs font-semibold text-text-secondary">아바타 이미지</span>
                    </div>
                    <span className="text-[10px] text-text-muted">최대 5개 · PNG/JPG/WEBP/GIF</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const src = settings.avachat.images?.[idx] || ''
                      return (
                        <div key={idx} className="relative group rounded-xl border border-border bg-bg-outer overflow-hidden aspect-square">
                          {src ? (
                            <>
                              <img src={src} alt="" className="w-full h-full object-contain p-2" />
                              <button
                                type="button"
                                onClick={() => removeAvachatImage(idx)}
                                className="absolute right-1.5 top-1.5 p-1 rounded-md bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="이미지 삭제"
                              >
                                <X size={11} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                avachatSlotRef.current = idx
                                avachatImageInputRef.current?.click()
                              }}
                              className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-text-muted hover:text-accent-mint hover:bg-white/5 transition-colors"
                            >
                              <Upload size={18} />
                              <span className="text-[10px] font-semibold">추가</span>
                            </button>
                          )}
                          {src && (
                            <button
                              type="button"
                              onClick={() => {
                                avachatSlotRef.current = idx
                                avachatImageInputRef.current?.click()
                              }}
                              className="absolute inset-x-2 bottom-2 py-1.5 rounded-lg bg-bg-card/90 border border-border text-[10px] font-semibold text-text-secondary opacity-0 group-hover:opacity-100 hover:text-accent-mint transition-all"
                            >
                              변경
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <input
                    ref={avachatImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleAvachatImage(avachatSlotRef.current, e.target.files?.[0])}
                  />
                </div>
              </div>
            )}

            {(activeTab === 'donation' || activeTab === 'follow') && (
              <div className="max-w-xs space-y-4">
                <Slider
                  label="폰트 크기" min={0} max={48} value={settings[activeTab].fontSize}
                  display={settings[activeTab].fontSize === 0 ? '기본값' : `${settings[activeTab].fontSize}px`}
                  onChange={(v) => updateAlert(activeTab, { fontSize: v })}
                />
                <Slider
                  label="표시 시간" min={2} max={20} value={settings[activeTab].showMs}
                  display={`${settings[activeTab].showMs}초`}
                  onChange={(v) => updateAlert(activeTab, { showMs: v })}
                />
                {(activeTab === 'donation' || activeTab === 'follow') && (() => {
                  const isFollow   = activeTab === 'follow'
                  const imgKey     = isFollow ? 'follow' : 'donation'
                  const imgRef     = isFollow ? followImageInputRef : donationImageInputRef
                  const imgData    = settings[imgKey].imageDataUrl || ''
                  const imgName    = settings[imgKey].imageName    || ''
                  const imgSize    = settings[imgKey].imageSize    || 118
                  const handleImg  = isFollow ? handleFollowImage : handleDonationImage
                  const removeImg  = isFollow ? removeFollowImage  : removeDonationImage
                  const label      = isFollow ? '팔로우 이미지' : '후원 이미지'
                  return (
                    <div className="space-y-3 rounded-xl border border-border bg-bg-input/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Image size={14} className="text-accent-mint shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text-secondary">{label}</p>
                            <p className="text-[10px] text-text-muted truncate">
                              {imgName || 'PNG/GIF 파일을 선택하세요'}
                            </p>
                          </div>
                        </div>
                        {imgData && (
                          <button
                            type="button"
                            onClick={removeImg}
                            className="shrink-0 p-1.5 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-colors"
                            title="이미지 제거"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {imgData ? (
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg border border-border bg-black/30 overflow-hidden flex items-center justify-center shrink-0">
                            <img src={imgData} alt="" className="max-w-full max-h-full object-contain" />
                          </div>
                          <button
                            type="button"
                            onClick={() => imgRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border text-text-secondary hover:border-accent-mint/40 hover:text-accent-mint transition-colors"
                          >
                            <Upload size={12} />
                            이미지 변경
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imgRef.current?.click()}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold rounded-lg border border-dashed border-border text-text-secondary hover:border-accent-mint/40 hover:text-accent-mint transition-colors"
                        >
                          <Upload size={12} />
                          PNG/GIF 선택
                        </button>
                      )}

                      <input
                        ref={imgRef}
                        type="file"
                        accept="image/png,image/gif"
                        className="hidden"
                        onChange={(e) => handleImg(e.target.files?.[0])}
                      />

                      {imgData && (
                        <Slider
                          label="이미지 크기"
                          min={40}
                          max={240}
                          value={imgSize}
                          display={`${imgSize}px`}
                          onChange={(v) => {
                            updateAlert(imgKey, { imageSize: v })
                            refreshPreview()
                          }}
                        />
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

        </div>

        {/* 우: 미리보기 패널 */}
        <div className="flex-1 flex flex-col bg-bg-card min-h-0 min-w-0">

          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Monitor size={13} className="text-text-muted" />
              <span className="text-xs font-semibold text-text-secondary">미리보기</span>
            </div>
            <span className="text-[10px] text-text-muted bg-bg-input border border-border px-2 py-0.5 rounded">
              OBS 투명 배경
            </span>
          </div>

          {/* min-h-full + overflow-y-auto 로 공간 부족 시 스크롤 */}
          <div ref={previewAreaRef} className="flex-1 min-h-0 overflow-hidden bg-bg-outer">
            <div className="h-full flex flex-col items-center justify-center gap-4 p-5">
              <div
                className="rounded-xl overflow-hidden shadow-2xl bg-black border border-white/5 shrink-0"
                style={{
                  width: `${1920 * previewScale}px`,
                  height: `${1080 * previewScale}px`,
                  position: 'relative',
                }}
              >
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  style={{
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '1920px',
                    height: '1080px',
                    transformOrigin: 'top left',
                    transform: `scale(${previewScale})`,
                    pointerEvents: 'none',
                  }}
                  title={`${tab.label} 미리보기`}
                />
              </div>

              <button
                onClick={sendTest}
                disabled={testing}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-accent-purple/15 border border-accent-purple/35 text-accent-purple hover:bg-accent-purple/25 rounded-xl transition-colors disabled:opacity-50"
              >
                <Play size={12} />
                {testing ? '전송 중...' : `${tab.label} 테스트`}
              </button>

              <p className="text-[10px] text-text-muted/40">400 × 225 · 16:9</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
