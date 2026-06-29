import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react'
import { io as socketIO } from 'socket.io-client'
import { eventsApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

type TabId = 'session' | 'donation' | 'webhook'

interface SessionEntry {
  id: string
  capturedAt: string
  eventName: string
  keys: string[]
  systemType?: string
  eventType?: string
  dataType?: string
  donationType?: string
  status?: string
  kind?: string
  title?: string
  payAmount?: string
  donationText?: string
  donatorNickname?: string
  rawArgs: unknown[]
  firstArg: unknown
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
  raw: unknown
  parsed: Record<string, unknown>
}

interface WebhookEntry {
  id: string
  capturedAt: string
  messageType?: string
  dataType?: string
  bodyKeys: string[]
  body: unknown
  headers: Record<string, string>
}

const EVENT_COLORS: Record<string, string> = {
  DONATION:     'bg-blue-500/20 text-blue-300 border-blue-500/40',
  SUBSCRIPTION: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  SYSTEM:       'bg-gray-500/20 text-gray-300 border-gray-500/40',
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'session',  label: '세션 이벤트' },
  { id: 'donation', label: '후원 raw' },
  { id: 'webhook',  label: '웹훅' },
]

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

function EventCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-bg-card p-3">{children}</div>
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

  return (
    <EventCard>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {eventBadge(entry.eventName)}
          {isNew && <span className="text-[10px] text-green-400 animate-pulse font-bold">● NEW</span>}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">
          {new Date(entry.capturedAt).toLocaleTimeString('ko-KR')}
        </span>
      </div>

      <div className="space-y-1 mb-2">
        <FieldRow label="eventType"    value={entry.eventType} />
        <FieldRow label="dataType"     value={entry.dataType} />
        <FieldRow label="systemType"   value={entry.systemType} />
        <FieldRow label="donationType" value={entry.donationType} />
        <FieldRow label="status"       value={entry.status} />
        <FieldRow label="kind"         value={entry.kind} />
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

      <ExpandToggle open={open} onToggle={() => setOpen((v) => !v)} />
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

function DonationEventCard({ entry }: { entry: DonationEntry }) {
  const [open, setOpen] = useState(false)

  return (
    <EventCard>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">{eventBadge(entry.eventName)}</div>
        <span className="text-[10px] text-text-muted shrink-0">
          {new Date(entry.capturedAt).toLocaleTimeString('ko-KR')}
        </span>
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
      <ExpandToggle open={open} onToggle={() => setOpen((v) => !v)} />
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

function WebhookEventCard({ entry }: { entry: WebhookEntry }) {
  const [open, setOpen] = useState(false)

  return (
    <EventCard>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide bg-teal-500/20 text-teal-300 border-teal-500/40">
            WEBHOOK
          </span>
          {entry.dataType && <span className="text-[11px] text-text-secondary">{entry.dataType}</span>}
        </div>
        <span className="text-[10px] text-text-muted shrink-0">
          {new Date(entry.capturedAt).toLocaleTimeString('ko-KR')}
        </span>
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
      <ExpandToggle open={open} onToggle={() => setOpen((v) => !v)} />
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

export default function RawEventDebugPage() {
  const { addToast } = useToastStore()
  const [tab, setTab] = useState<TabId>('session')
  const [sessionEvents, setSessionEvents] = useState<SessionEntry[]>([])
  const [donationEvents, setDonationEvents] = useState<DonationEntry[]>([])
  const [webhookEvents, setWebhookEvents] = useState<WebhookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const newIds = useRef<Set<string>>(new Set())

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

  useEffect(() => {
    const socket = socketIO('http://localhost:3001', { transports: ['websocket'] })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('debug:sessionRaw', (entry: SessionEntry) => {
      newIds.current.add(entry.id)
      setSessionEvents((prev) => {
        const exists = prev.some((event) => event.id === entry.id)
        return exists ? prev : [entry, ...prev].slice(0, 80)
      })
      setTimeout(() => {
        newIds.current.delete(entry.id)
        setSessionEvents((prev) => [...prev])
      }, 3000)
    })

    return () => { socket.disconnect() }
  }, [])

  const clearTab = async () => {
    try {
      if (tab === 'session') { await eventsApi.clearDebugSession(); setSessionEvents([]) }
      if (tab === 'donation') { await eventsApi.clearDebugDonations(); setDonationEvents([]) }
      if (tab === 'webhook') { await eventsApi.clearDebugWebhooks(); setWebhookEvents([]) }
      addToast({ type: 'info', title: '삭제 완료' })
    } catch {
      addToast({ type: 'error', title: '삭제 실패' })
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer">
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

      <div className="flex items-center gap-1 px-5 pt-3 pb-0 shrink-0">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-3 py-1.5 text-[11px] rounded-t-lg border-x border-t transition-colors ${
              tab === item.id
                ? 'bg-bg-card border-border text-text-primary font-medium'
                : 'bg-transparent border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {item.label}
            {item.id === 'session' && <span className="ml-1.5 text-[10px] text-text-muted">({sessionEvents.length})</span>}
            {item.id === 'donation' && <span className="ml-1.5 text-[10px] text-text-muted">({donationEvents.length})</span>}
            {item.id === 'webhook' && <span className="ml-1.5 text-[10px] text-text-muted">({webhookEvents.length})</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {tab === 'session' && (
          sessionEvents.length === 0
            ? <Empty label="캡처된 세션 이벤트 없음" />
            : sessionEvents.map((event) => (
                <SessionEventCard key={event.id} entry={event} isNew={newIds.current.has(event.id)} />
              ))
        )}
        {tab === 'donation' && (
          donationEvents.length === 0
            ? <Empty label="캡처된 후원 이벤트 없음" />
            : donationEvents.map((event) => <DonationEventCard key={event.id} entry={event} />)
        )}
        {tab === 'webhook' && (
          webhookEvents.length === 0
            ? <Empty label="캡처된 웹훅 이벤트 없음" />
            : webhookEvents.map((event) => <WebhookEventCard key={event.id} entry={event} />)
        )}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm gap-2">
      <span>{label}</span>
      <span className="text-[11px]">방송 중 이벤트가 발생하면 자동으로 캡처됩니다</span>
    </div>
  )
}
