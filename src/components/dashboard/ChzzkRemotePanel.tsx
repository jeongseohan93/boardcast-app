import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ExternalLink,
  Home,
  Maximize2,
  Monitor,
  RefreshCw,
  Settings,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const FALLBACK_REMOTE_URL =
  'https://studio.chzzk.naver.com/ade160a32751f3572aeb6b712f3de69f/remotecontrol'
const LEGACY_REMOTE_URL = 'https://chzzk.naver.com/manage/live'
const URL_STORAGE_KEY = 'dashChzzkRemoteUrl'
const ZOOM_STORAGE_KEY = 'dashChzzkRemoteZoom'
const DEFAULT_ZOOM = 0.85

type WebviewElement = HTMLElement & {
  reload: () => void
  getURL: () => string
  setZoomFactor: (factor: number) => void
}

type FailLoadEvent = Event & {
  errorCode?: number
  errorDescription?: string
}

function remoteUrlForChannel(channelId: string | null) {
  return channelId
    ? `https://studio.chzzk.naver.com/${channelId}/remotecontrol`
    : FALLBACK_REMOTE_URL
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return new URL(url).toString()
  } catch {
    return null
  }
}

function readStoredZoom() {
  const value = Number(localStorage.getItem(ZOOM_STORAGE_KEY))
  return Number.isFinite(value) && value >= 0.6 && value <= 1.2 ? value : DEFAULT_ZOOM
}

export default function ChzzkRemotePanel() {
  const channelId = useAuthStore((s) => s.channelId)
  const defaultRemoteUrl = useMemo(() => remoteUrlForChannel(channelId), [channelId])
  const webviewRef = useRef<WebviewElement | null>(null)

  const [remoteUrl, setRemoteUrl] = useState(() => {
    const stored = localStorage.getItem(URL_STORAGE_KEY)
    return !stored || stored === LEGACY_REMOTE_URL ? defaultRemoteUrl : stored
  })
  const [draftUrl, setDraftUrl] = useState(remoteUrl)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [currentUrl, setCurrentUrl] = useState(remoteUrl)
  const [zoom, setZoom] = useState(readStoredZoom)

  useEffect(() => {
    const stored = localStorage.getItem(URL_STORAGE_KEY)
    if (stored && stored !== LEGACY_REMOTE_URL) return

    localStorage.setItem(URL_STORAGE_KEY, defaultRemoteUrl)
    setRemoteUrl(defaultRemoteUrl)
    setDraftUrl(defaultRemoteUrl)
    setCurrentUrl(defaultRemoteUrl)
  }, [defaultRemoteUrl])

  useEffect(() => {
    localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom))
    try {
      webviewRef.current?.setZoomFactor(zoom)
    } catch {
      /* webview가 아직 준비되지 않은 경우 다음 dom-ready에서 적용한다. */
    }
  }, [zoom])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleReady = () => {
      try {
        webview.setZoomFactor(zoom)
      } catch {
        /* ignore */
      }
    }
    const handleStart = () => {
      setLoading(true)
      setLoadError('')
    }
    const handleStop = () => {
      setLoading(false)
      try {
        setCurrentUrl(webview.getURL())
      } catch {
        setCurrentUrl(remoteUrl)
      }
    }
    const handleFail = (event: Event) => {
      const detail = event as FailLoadEvent
      if (detail.errorCode === -3) return
      setLoading(false)
      setLoadError(detail.errorDescription || '리모콘 페이지를 불러오지 못했습니다.')
    }
    const handleNavigate = () => {
      try {
        setCurrentUrl(webview.getURL())
      } catch {
        setCurrentUrl(remoteUrl)
      }
    }

    webview.addEventListener('dom-ready', handleReady)
    webview.addEventListener('did-start-loading', handleStart)
    webview.addEventListener('did-stop-loading', handleStop)
    webview.addEventListener('did-fail-load', handleFail)
    webview.addEventListener('did-navigate', handleNavigate)
    webview.addEventListener('did-navigate-in-page', handleNavigate)

    return () => {
      webview.removeEventListener('dom-ready', handleReady)
      webview.removeEventListener('did-start-loading', handleStart)
      webview.removeEventListener('did-stop-loading', handleStop)
      webview.removeEventListener('did-fail-load', handleFail)
      webview.removeEventListener('did-navigate', handleNavigate)
      webview.removeEventListener('did-navigate-in-page', handleNavigate)
    }
  }, [remoteUrl, zoom])

  const applyUrl = () => {
    const nextUrl = normalizeUrl(draftUrl)
    if (!nextUrl) {
      setLoadError('올바른 URL을 입력해 주세요.')
      return
    }

    localStorage.setItem(URL_STORAGE_KEY, nextUrl)
    setRemoteUrl(nextUrl)
    setCurrentUrl(nextUrl)
    setEditing(false)
    setLoadError('')
  }

  const resetUrl = () => {
    localStorage.setItem(URL_STORAGE_KEY, defaultRemoteUrl)
    setDraftUrl(defaultRemoteUrl)
    setRemoteUrl(defaultRemoteUrl)
    setCurrentUrl(defaultRemoteUrl)
    setEditing(false)
    setLoadError('')
  }

  const openCurrentUrl = () => {
    const url = normalizeUrl(currentUrl || remoteUrl)
    if (url) void window.electronAPI.openExternal(url)
  }

  const changeZoom = (delta: number) => {
    setZoom((value) => Math.min(1.2, Math.max(0.6, Number((value + delta).toFixed(2)))))
  }

  const webview = createElement('webview', {
    ref: (node: Element | null) => {
      webviewRef.current = node as WebviewElement | null
    },
    src: remoteUrl,
    className: 'block h-full w-full bg-white',
    allowpopups: 'true',
    webpreferences: 'contextIsolation=yes,nodeIntegration=no',
  } as Record<string, unknown>)

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden rounded-2xl border border-border bg-bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border bg-bg-card px-4 py-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-mint/10 text-accent-mint">
          <Monitor size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">치지직 리모콘</span>
            {loading && <span className="text-[11px] text-accent-mint">로딩 중</span>}
          </div>
          <p className="max-w-[520px] truncate text-[11px] text-text-muted">{currentUrl || remoteUrl}</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => changeZoom(-0.05)}
            title="축소"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <span className="w-11 text-center text-[11px] tabular-nums text-text-secondary">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => changeZoom(0.05)}
            title="확대"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => webviewRef.current?.reload()}
            title="새로고침"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={openCurrentUrl}
            title="외부 브라우저에서 열기"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
          >
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            title="URL 설정"
            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
              editing
                ? 'bg-accent-mint/10 text-accent-mint'
                : 'text-text-muted hover:bg-white/5 hover:text-text-primary'
            }`}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 border-b border-border bg-bg-outer/70 px-4 py-2 shrink-0">
          <input
            className="min-w-0 flex-1 rounded-lg border border-border bg-bg-input px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-mint focus:outline-none"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyUrl()
              if (e.key === 'Escape') {
                setDraftUrl(remoteUrl)
                setEditing(false)
              }
            }}
            placeholder={defaultRemoteUrl}
          />
          <button
            type="button"
            onClick={applyUrl}
            title="저장"
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-accent-mint text-bg-outer hover:brightness-110 transition-all"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={resetUrl}
            title="기본 URL"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-text-muted hover:border-accent-mint/40 hover:text-text-primary transition-colors"
          >
            <Home size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftUrl(remoteUrl)
              setEditing(false)
            }}
            title="취소"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-text-muted hover:border-accent-mint/40 hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loadError && (
        <div className="border-b border-accent-danger/30 bg-accent-danger/10 px-4 py-2 text-xs text-accent-danger shrink-0">
          {loadError}
        </div>
      )}

      <div className="relative flex-1 min-h-0 bg-white">
        {webview}
        {loading && (
          <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white shadow-lg">
            <RefreshCw size={12} className="animate-spin" />
            불러오는 중
          </div>
        )}
        {!loadError && !loading && (
          <div className="pointer-events-none absolute right-4 bottom-4 rounded-full bg-black/55 px-3 py-1.5 text-[11px] text-white/90 shadow-lg">
            <Maximize2 size={11} className="mr-1 inline-block" />
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    </div>
  )
}
