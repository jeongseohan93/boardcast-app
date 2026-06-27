import Store from 'electron-store'

const store = new Store()
const RAW_DONATION_KEY = 'debugRawDonationEvents'
const RAW_SESSION_KEY = 'debugRawSessionEvents'
const MAX_RAW_EVENTS = 30
const MAX_RAW_SESSION_EVENTS = 80

export interface RawDonationDebugEntry {
  id: string
  capturedAt: string
  eventName: 'DONATION'
  channelId?: string
  keys: string[]
  donationType?: string
  payAmount?: string
  donationText?: string
  donatorNickname?: string
  missionHints: string[]
  raw: unknown
  parsed: Record<string, unknown>
}

export interface RawSessionDebugEntry {
  id: string
  capturedAt: string
  eventName: string
  channelId?: string
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

function parseMaybeJSON(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!text) return value
  if (!((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']')))) return value
  try {
    return JSON.parse(text) as unknown
  } catch {
    return value
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  const parsed = parseMaybeJSON(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
}

function safeForStore(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value)) as unknown
  } catch {
    return String(value)
  }
}

function findMissionHints(value: unknown): string[] {
  let text = ''
  try {
    text = JSON.stringify(value ?? '').toLowerCase()
  } catch {
    text = String(value ?? '').toLowerCase()
  }

  const hints = [
    'mission',
    '\ubbf8\uc158',
    'goal',
    '\ubaa9\ud45c',
    'quest',
    'challenge',
    'participation',
    'pending',
    'approved',
    'settle',
    'result',
  ]
  return hints.filter((hint) => text.includes(hint.toLowerCase()))
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function findStringByKeys(value: unknown, keys: string[], depth = 0): string | undefined {
  if (depth > 6 || value == null) return undefined
  const parsed = parseMaybeJSON(value)
  if (!parsed || typeof parsed !== 'object') return undefined

  const record = Array.isArray(parsed)
    ? Object.fromEntries(parsed.map((item, index) => [String(index), item]))
    : parsed as Record<string, unknown>

  const wanted = new Set(keys.map((key) => key.toLowerCase()))
  for (const [key, nested] of Object.entries(record)) {
    if (wanted.has(key.toLowerCase())) {
      const valueAsString = asString(nested)
      if (valueAsString) return valueAsString
    }
  }

  for (const nested of Object.values(record)) {
    const found = findStringByKeys(nested, keys, depth + 1)
    if (found) return found
  }

  return undefined
}

export function getRawDonationEvents(): RawDonationDebugEntry[] {
  const events = store.get(RAW_DONATION_KEY) as RawDonationDebugEntry[] | undefined
  return Array.isArray(events) ? events : []
}

export function clearRawDonationEvents() {
  store.set(RAW_DONATION_KEY, [])
}

export function getRawSessionEvents(): RawSessionDebugEntry[] {
  const events = store.get(RAW_SESSION_KEY) as RawSessionDebugEntry[] | undefined
  return Array.isArray(events) ? events : []
}

export function clearRawSessionEvents() {
  store.set(RAW_SESSION_KEY, [])
}

export function recordRawSessionEvent(input: {
  eventName: string
  args: unknown[]
  channelId?: string
}): RawSessionDebugEntry {
  const rawArgs = safeForStore(input.args) as unknown[]
  const firstArg = rawArgs[0]
  const parsedFirstArg = safeForStore(parseMaybeJSON(firstArg))
  const parsed = toRecord(parsedFirstArg)
  const missionHints = Array.from(new Set([
    ...findMissionHints(input.eventName),
    ...findMissionHints(rawArgs),
    ...findMissionHints(parsed),
  ]))

  const entry: RawSessionDebugEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    capturedAt: new Date().toISOString(),
    eventName: input.eventName,
    channelId: input.channelId,
    argCount: rawArgs.length,
    keys: Object.keys(parsed).sort(),
    systemType: findStringByKeys(parsedFirstArg, ['type']),
    eventType: findStringByKeys(parsedFirstArg, ['eventType']),
    dataType: findStringByKeys(parsedFirstArg, ['dataType']),
    donationType: findStringByKeys(parsedFirstArg, ['donationType']),
    status: findStringByKeys(parsedFirstArg, ['status']),
    kind: findStringByKeys(parsedFirstArg, ['kind']),
    missionKey: findStringByKeys(parsedFirstArg, ['missionKey', 'mission_key', 'key']),
    title: findStringByKeys(parsedFirstArg, ['title', 'missionTitle', 'mission_title']),
    payAmount: findStringByKeys(parsedFirstArg, ['payAmount', 'amount']),
    donationText: findStringByKeys(parsedFirstArg, ['donationText', 'message', 'content']),
    donatorNickname: findStringByKeys(parsedFirstArg, ['donatorNickname', 'nickname']),
    missionHints,
    rawArgs,
    firstArg: parsedFirstArg,
    parsed,
  }

  const next = [entry, ...getRawSessionEvents()].slice(0, MAX_RAW_SESSION_EVENTS)
  store.set(RAW_SESSION_KEY, next)
  return entry
}

export function recordRawDonationEvent(input: {
  raw: unknown
  parsed: unknown
  channelId?: string
}): RawDonationDebugEntry {
  const parsed = toRecord(input.parsed)
  const raw = safeForStore(parseMaybeJSON(input.raw))
  const safeParsed = toRecord(safeForStore(parsed))
  const missionHints = Array.from(new Set([
    ...findMissionHints(raw),
    ...findMissionHints(safeParsed),
  ]))

  const entry: RawDonationDebugEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    capturedAt: new Date().toISOString(),
    eventName: 'DONATION',
    channelId: input.channelId,
    keys: Object.keys(safeParsed).sort(),
    donationType: asString(safeParsed.donationType),
    payAmount: asString(safeParsed.payAmount),
    donationText: asString(safeParsed.donationText),
    donatorNickname: asString(safeParsed.donatorNickname),
    missionHints,
    raw,
    parsed: safeParsed,
  }

  const next = [entry, ...getRawDonationEvents()].slice(0, MAX_RAW_EVENTS)
  store.set(RAW_DONATION_KEY, next)
  return entry
}
