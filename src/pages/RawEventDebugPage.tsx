/**
 * [로우 이벤트 디버그 페이지]
 *
 * 서버에서 수신하는 원시(raw) 소켓 이벤트를 실시간으로 확인하는 개발자 디버그 페이지.
 *
 * ── 독립 Socket.IO 연결 ────────────────────────────────────────────────────
 *   useSocket 싱글턴과는 별도로 이 페이지 전용 Socket.IO 인스턴스를 생성한다.
 *   디버그 이벤트(debug:sessionRaw, debug:internalDonationRaw)는 useSocket 이 구독하지 않으므로
 *   별도 연결이 필요하다. 페이지 언마운트 시 disconnect() 해 리소스를 해제한다.
 *
 * ── MISSION_EVENTS Set ────────────────────────────────────────────────────
 *   미션 관련 소켓 이벤트 이름 집합. has() 로 O(1) 조회해 이벤트 유형별 탭 분류에 활용한다.
 *
 * ── 4개 탭 구조 ──────────────────────────────────────────────────────────
 *   session  → debug:sessionRaw 이벤트: Chzzk 로그인 세션 원시 데이터
 *   donation → 후원 관련 이벤트 원시 페이로드
 *   webhook  → 웹훅 수신 이벤트 (팔로우, 구독 등)
 *   internal → debug:internalDonationRaw 이벤트: 내부 후원 처리 파이프라인 데이터
 *
 * ── 트리 뷰 (JSON 접기/펼치기) ───────────────────────────────────────────
 *   각 이벤트 페이로드는 계층적 트리 뷰로 표시되며, 클릭으로 중첩 객체를 접거나 펼칠 수 있다.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw, Trash2, ChevronDown, ChevronRight, Wifi, WifiOff } from 'lucide-react'
import { eventsApi } from '../api/client'
import { useToastStore } from '../store/toastStore'
import { io as socketIO } from 'socket.io-client'

type TabId = 'session' | 'donation' | 'webhook' | 'internal'

interface SessionEntry {
  id: string
  capturedAt: string
  eventName: string
  argCount: number
  keys: string[]
  systemType?: string
  eventType?: string
  dataType?: string
  donationType?: string
  status?: string
  kind?: string
  missionKey?: string
  title?: string
  payAmount?: string
  donationText?: string
  donatorNickname?: string
  missionHints: string[]
  rawArgs: unknown[]
  firstArg: unknown
  parsed: Record<string, unknown>
}

interface DonationEntry {
  id: string
  capturedAt: string
  eventName: string
  keys: string[]
  donationType?: string
  payAmount?: string
  donationText?: string
  donatorNickname?: string
  missionHints: string[]
  raw: unknown
  parsed: Record<string, unknown>
}

interface WebhookEntry {
  id: string
  capturedAt: string
  messageId?: string
  messageType?: string
  dataType?: string
  bodyKeys: string[]
  missionHints: string[]
  bodyText: string
  body: unknown
  headers: Record<string, string>
}

const EVENT_COLORS: Record<string, string> = {
  MISSION:               'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  MISSION_PARTICIPATION: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  DONATION:              'bg-blue-500/20 text-blue-300 border-blue-500/40',
  SUBSCRIPTION:          'bg-purple-500/20 text-purple-300 border-purple-500/40',
  SYSTEM:                'bg-gray-500/20 text-gray-300 border-gray-500/40',
}

function eventBadge(name: string) {
  const cls = EVENT_COLORS[name] ?? 'bg-zinc-700 text-zinc-300 border-zinc-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide ${cls}`}>
      {name}
    </span>
  )
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-[10px] text-text-secondary font-mono whitespace-pre-wrap break-all bg-bg-outer rounded p-2 max-h-60 overflow-auto border border-border/40">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function EventCard({ children, hasMission }: { children: React.ReactNode; hasMission: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${hasMission ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border bg-bg-card'}`}>
      {children}
    </div>
  )
}

function ExpandToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors">
      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      raw JSON
    </button>
  )
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="text-text-muted shrink-0">{label}:</span>
      <span className="text-text-primary break-all">{value}</span>
    </div>
  )
}

function SessionEventCard({ entry, isNew }: { entry: SessionEntry; isNew: boolean }) {
  const [open, setOpen] = useState(false)
  const hasMission = entry.missionHints.length > 0 || entry.eventName.includes('MISSION')

  return (
    <EventCard hasMission={hasMission}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {eventBadge(entry.eventName)}
          {hasMission && (
            <span className="text-[10px] text-yellow-400 font-semibold">⭐ 미션 관련</span>
          )}
          {isNew && (
            <span className="text-[10px] text-green-400 animate-pulse font-bold">● NEW</span>
          )}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">{new Date(entry.capturedAt).toLocaleTimeString('ko-KR')}</span>
      </div>

      <div className="space-y-1 mb-2">
        <FieldRow label="eventType"    value={entry.eventType} />
        <FieldRow label="dataType"     value={entry.dataType} />
        <FieldRow label="systemType"   value={entry.systemType} />
        <FieldRow label="donationType" value={entry.donationType} />
        <FieldRow label="status"       value={entry.status} />
        <FieldRow label="kind"         value={entry.kind} />
        <FieldRow label="missionKey"   value={entry.missionKey} />
        <FieldRow label="title"        value={entry.title} />
        <FieldRow label="payAmount"    value={entry.payAmount} />
        <FieldRow label="nickname"     value={entry.donatorNickname} />
        <FieldRow label="message"      value={entry.donationText} />
      </div>

      {entry.keys.length > 0 && (
        <div className="text-[10px] text-text-muted mb-2">
          keys: <span className="text-text-secondary">{entry.keys.join(', ')}</span>
        </div>
      )}
      {entry.missionHints.length > 0 && (
        <div className="text-[10px] text-yellow-400 mb-2">
          hints: {entry.missionHints.join(', ')}
        </div>
      )}

      <ExpandToggle open={open} onToggle={() => setOpen(v => !v)} />
      {open && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-text-muted mb-1">firstArg:</div>
          <JsonBlock data={entry.firstArg} />
          {entry.rawArgs.length > 1 && (
            <>
              <div className="text-[10px] text-text-muted mt-2 mb-1">rawArgs:</div>
              <JsonBlock data={entry.rawArgs} />
            </>
          )}
        </div>
      )}
    </EventCard>
  )
}

function DonationEventCard({ entry, isNew }: { entry: DonationEntry; isNew: boolean }) {
  const [open, setOpen] = useState(false)
  const hasMission = entry.missionHints.length > 0

  return (
    <EventCard hasMission={hasMission}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {eventBadge(entry.eventName)}
          {hasMission && <span className="text-[10px] text-yellow-400 font-semibold">⭐ 미션 관련</span>}
          {isNew && <span className="text-[10px] text-green-400 animate-pulse font-bold">● NEW</span>}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">{new Date(entry.capturedAt).toLocaleTimeString('ko-KR')}</span>
      </div>
      <div className="space-y-1 mb-2">
        <FieldRow label="donationType" value={entry.donationType} />
        <FieldRow label="payAmount"    value={entry.payAmount} />
        <FieldRow label="nickname"     value={entry.donatorNickname} />
        <FieldRow label="message"      value={entry.donationText} />
      </div>
      {entry.keys.length > 0 && (
        <div className="text-[10px] text-text-muted mb-2">
          keys: <span className="text-text-secondary">{entry.keys.join(', ')}</span>
        </div>
      )}
      {entry.missionHints.length > 0 && (
        <div className="text-[10px] text-yellow-400 mb-2">hints: {entry.missionHints.join(', ')}</div>
      )}
      <ExpandToggle open={open} onToggle={() => setOpen(v => !v)} />
      {open && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-text-muted mb-1">parsed:</div>
          <JsonBlock data={entry.parsed} />
          <div className="text-[10px] text-text-muted mt-2 mb-1">raw:</div>
          <JsonBlock data={entry.raw} />
        </div>
      )}
    </EventCard>
  )
}

function WebhookEventCard({ entry, isNew }: { entry: WebhookEntry; isNew: boolean }) {
  const [open, setOpen] = useState(false)
  const hasMission = entry.missionHints.length > 0

  return (
    <EventCard hasMission={hasMission}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide bg-teal-500/20 text-teal-300 border-teal-500/40">
            WEBHOOK
          </span>
          {entry.dataType && <span className="text-[11px] text-text-secondary">{entry.dataType}</span>}
          {hasMission && <span className="text-[10px] text-yellow-400 font-semibold">⭐ 미션 관련</span>}
          {isNew && <span className="text-[10px] text-green-400 animate-pulse font-bold">● NEW</span>}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">{new Date(entry.capturedAt).toLocaleTimeString('ko-KR')}</span>
      </div>
      <div className="space-y-1 mb-2">
        <FieldRow label="messageType" value={entry.messageType} />
        <FieldRow label="dataType"    value={entry.dataType} />
      </div>
      {entry.bodyKeys.length > 0 && (
        <div className="text-[10px] text-text-muted mb-2">
          keys: <span className="text-text-secondary">{entry.bodyKeys.join(', ')}</span>
        </div>
      )}
      {hasMission && (
        <div className="text-[10px] text-yellow-400 mb-2">hints: {entry.missionHints.join(', ')}</div>
      )}
      <ExpandToggle open={open} onToggle={() => setOpen(v => !v)} />
      {open && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-text-muted mb-1">body:</div>
          <JsonBlock data={entry.body} />
          <div className="text-[10px] text-text-muted mt-2 mb-1">headers:</div>
          <JsonBlock data={entry.headers} />
        </div>
      )}
    </EventCard>
  )
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'session',  label: '세션 이벤트' },
  { id: 'internal', label: '내부 API (미션)' },
  { id: 'donation', label: '후원 raw' },
  { id: 'webhook',  label: '웹훅' },
]

const MISSION_EVENTS = new Set(['MISSION', 'MISSION_PARTICIPATION'])

export default function RawEventDebugPage() {
  const { addToast } = useToastStore()
  const [tab, setTab] = useState<TabId>('session')
  const [sessionEvents, setSessionEvents]   = useState<SessionEntry[]>([])
  const [donationEvents, setDonationEvents] = useState<DonationEntry[]>([])
  const [webhookEvents, setWebhookEvents]   = useState<WebhookEntry[]>([])
  const [internalEvents, setInternalEvents] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [missionOnly, setMissionOnly] = useState(false)
  const [connected, setConnected] = useState(false)
  const newIds = useRef<Set<string>>(new Set())
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, dRes, wRes] = await Promise.all([
        eventsApi.debugSession({ limit: 80 }),
        eventsApi.debugDonations({ limit: 30 }),
        eventsApi.debugWebhooks({ limit: 50 }),
      ])
      setSessionEvents(sRes.data.data ?? [])
      setDonationEvents(dRes.data.data ?? [])
      setWebhookEvents(wRes.data.data ?? [])
    } catch {
      addToast({ type: 'error', title: '이벤트 불러오기 실패' })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // 실시간 세션 이벤트 수신
  useEffect(() => {
    const socket = socketIO('http://localhost:3001', { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('debug:sessionRaw', (entry: SessionEntry) => {
      newIds.current.add(entry.id)
      setSessionEvents(prev => {
        const exists = prev.some(e => e.id === entry.id)
        return exists ? prev : [entry, ...prev].slice(0, 80)
      })
      setTimeout(() => {
        newIds.current.delete(entry.id)
        setSessionEvents(prev => [...prev])
      }, 3000)
    })

    socket.on('debug:internalDonationRaw', (raw: unknown) => {
      setInternalEvents(prev => [{ _t: Date.now(), ...((raw as object) ?? {}) }, ...prev].slice(0, 100))
    })

    socket.on('mission', (data: unknown) => {
      setInternalEvents(prev => [{ _t: Date.now(), _type: 'MISSION_PARSED', ...((data as object) ?? {}) }, ...prev].slice(0, 100))
    })

    return () => { socket.disconnect() }
  }, [])

  const clearTab = async () => {
    try {
      if (tab === 'session')  { await eventsApi.clearDebugSession();   setSessionEvents([]) }
      if (tab === 'donation') { await eventsApi.clearDebugDonations(); setDonationEvents([]) }
      if (tab === 'webhook')  { await eventsApi.clearDebugWebhooks();  setWebhookEvents([]) }
      addToast({ type: 'info', title: '삭제 완료' })
    } catch {
      addToast({ type: 'error', title: '삭제 실패' })
    }
  }

  const filteredSession = missionOnly
    ? sessionEvents.filter(e => MISSION_EVENTS.has(e.eventName) || e.missionHints.length > 0)
    : sessionEvents

  const missionCount = sessionEvents.filter(e => MISSION_EVENTS.has(e.eventName) || e.missionHints.length > 0).length

  return (
    <div className="flex flex-col h-full bg-bg-outer">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-text-primary">Raw 이벤트 디버거</h1>
          <div className={`flex items-center gap-1.5 text-[11px] ${connected ? 'text-green-400' : 'text-text-muted'}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? '실시간 연결됨' : '연결 안됨'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-text-muted hover:text-text-primary bg-bg-card border border-border rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <button
            onClick={clearTab}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-red-400 hover:text-red-300 bg-bg-card border border-border rounded-lg transition-colors"
          >
            <Trash2 size={12} />
            현재 탭 삭제
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 px-5 pt-3 pb-0 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[11px] rounded-t-lg border-x border-t transition-colors ${
              tab === t.id
                ? 'bg-bg-card border-border text-text-primary font-medium'
                : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
            {t.id === 'session' && (
              <span className="ml-1.5 text-[10px] text-text-muted">({sessionEvents.length})</span>
            )}
            {t.id === 'internal' && (
              <span className="ml-1.5 text-[10px] text-yellow-400">({internalEvents.length})</span>
            )}
            {t.id === 'donation' && (
              <span className="ml-1.5 text-[10px] text-text-muted">({donationEvents.length})</span>
            )}
            {t.id === 'webhook' && (
              <span className="ml-1.5 text-[10px] text-text-muted">({webhookEvents.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* 필터 바 (세션 탭만) */}
      {tab === 'session' && (
        <div className="flex items-center gap-3 px-5 py-2 bg-bg-card border-b border-border shrink-0">
          <button
            onClick={() => setMissionOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] rounded-lg border transition-colors ${
              missionOnly
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                : 'bg-bg-outer border-border text-text-muted hover:text-text-secondary'
            }`}
          >
            ⭐ 미션 관련만 ({missionCount})
          </button>
          <span className="text-[11px] text-text-muted">
            감지된 이벤트: MISSION, MISSION_PARTICIPATION, DONATION, SUBSCRIPTION, SYSTEM, ...
          </span>
        </div>
      )}

      {/* 이벤트 목록 */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {tab === 'session' && (
          filteredSession.length === 0
            ? <Empty label={missionOnly ? '미션 관련 이벤트 없음' : '캡처된 세션 이벤트 없음'} />
            : filteredSession.map(e => (
                <SessionEventCard key={e.id} entry={e} isNew={newIds.current.has(e.id)} />
              ))
        )}
        {tab === 'donation' && (
          donationEvents.length === 0
            ? <Empty label="캡처된 후원 이벤트 없음" />
            : donationEvents.map(e => (
                <DonationEventCard key={e.id} entry={e} isNew={false} />
              ))
        )}
        {tab === 'webhook' && (
          webhookEvents.length === 0
            ? <Empty label="캡처된 웹훅 이벤트 없음" />
            : webhookEvents.map(e => (
                <WebhookEventCard key={e.id} entry={e} isNew={false} />
              ))
        )}
        {tab === 'internal' && (
          internalEvents.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm gap-2">
                <span className="text-2xl">🔌</span>
                <span>내부 API 연결 대기 중</span>
                <span className="text-[11px]">채팅이 시작되면 자동으로 kr-ss*.chat.naver.com에 연결됩니다</span>
                <span className="text-[11px] text-yellow-400">방송 중 후원/미션이 발생하면 여기에 표시됩니다</span>
              </div>
            )
            : internalEvents.map((e, i) => {
                const entry = e as Record<string, unknown>
                const isMission = entry._type === 'MISSION_PARSED' || (entry.extras as Record<string,unknown>)?.donationType === 'MISSION'
                return (
                  <div key={i} className={`rounded-lg border p-3 ${isMission ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border bg-bg-card'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {isMission
                        ? <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/20 border border-yellow-500/40 px-2 py-0.5 rounded">⭐ MISSION</span>
                        : <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 rounded">DONATION raw</span>
                      }
                      <span className="text-[10px] text-text-muted">{new Date(entry._t as number).toLocaleTimeString('ko-KR')}</span>
                    </div>
                    <JsonBlock data={entry} />
                  </div>
                )
              })
        )}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm gap-2">
      <span className="text-2xl">🔍</span>
      <span>{label}</span>
      <span className="text-[11px]">방송 중 이벤트가 발생하면 자동으로 캡처됩니다</span>
    </div>
  )
}
