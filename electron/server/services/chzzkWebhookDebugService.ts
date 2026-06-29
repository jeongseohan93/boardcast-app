import type { IncomingHttpHeaders } from 'http'
import Store from 'electron-store'

const store = new Store()
const WEBHOOK_EVENTS_KEY = 'debugChzzkWebhookEvents'
const MAX_WEBHOOK_EVENTS = 50

export interface ChzzkWebhookDebugEntry {
  id: string
  capturedAt: string
  messageId?: string
  messageType?: string
  dataType?: string
  messageVersion?: string
  dataVersion?: string
  retry?: string
  signature?: string
  contentType?: string
  remoteAddress?: string
  bodyText: string
  body: unknown
  bodyKeys: string[]
  headers: Record<string, string>
}

function headerValue(headers: Record<string, string>, key: string): string | undefined {
  return headers[key.toLowerCase()]
}

function normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) out[key.toLowerCase()] = value.join(', ')
    else if (value !== undefined) out[key.toLowerCase()] = String(value)
  }
  return out
}

function parseBody(text: string): unknown {
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function safeForStore(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value)) as unknown
  } catch {
    return String(value)
  }
}

function bodyKeys(body: unknown): string[] {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? Object.keys(body as Record<string, unknown>).sort()
    : []
}

export function getChzzkWebhookEvents(): ChzzkWebhookDebugEntry[] {
  const events = store.get(WEBHOOK_EVENTS_KEY) as ChzzkWebhookDebugEntry[] | undefined
  return Array.isArray(events) ? events : []
}

export function clearChzzkWebhookEvents() {
  store.set(WEBHOOK_EVENTS_KEY, [])
}

export function recordChzzkWebhookEvent(input: {
  headers: IncomingHttpHeaders
  rawBody: Buffer
  remoteAddress?: string
}): ChzzkWebhookDebugEntry {
  const headers = normalizeHeaders(input.headers)
  const bodyText = input.rawBody.toString('utf8')
  const body = safeForStore(parseBody(bodyText))
  const entry: ChzzkWebhookDebugEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    capturedAt: new Date().toISOString(),
    messageId: headerValue(headers, 'chzzk-event-message-id'),
    messageType: headerValue(headers, 'chzzk-event-message-type'),
    dataType: headerValue(headers, 'chzzk-event-message-data-type'),
    messageVersion: headerValue(headers, 'chzzk-event-message-version'),
    dataVersion: headerValue(headers, 'chzzk-event-message-data-version'),
    retry: headerValue(headers, 'chzzk-event-message-retry'),
    signature: headerValue(headers, 'chzzk-event-message-signature'),
    contentType: headerValue(headers, 'content-type'),
    remoteAddress: input.remoteAddress,
    bodyText,
    body,
    bodyKeys: bodyKeys(body),
    headers,
  }

  const next = [entry, ...getChzzkWebhookEvents()].slice(0, MAX_WEBHOOK_EVENTS)
  store.set(WEBHOOK_EVENTS_KEY, next)
  return entry
}
