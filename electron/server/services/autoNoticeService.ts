import Store from 'electron-store'
import { safeStorage } from 'electron'
import { sendChat } from './chzzkApi'

const store = new Store()

export interface AutoNotice {
  id: string
  message: string
  intervalMinutes: number
  enabled: boolean
}

const timers = new Map<string, ReturnType<typeof setInterval>>()

function getSecure(key: string): string | null {
  try {
    const b64 = store.get(`secure_${key}`) as string | undefined
    if (!b64) return (store.get(`secure_${key}_plain`) as string | null) ?? null
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return null
  }
}

export function getAutoNotices(): AutoNotice[] {
  return (store.get('autoNotices') as AutoNotice[]) || []
}

export function saveAutoNotices(notices: AutoNotice[]) {
  store.set('autoNotices', notices)
}

function stopTimer(id: string) {
  const t = timers.get(id)
  if (t) { clearInterval(t); timers.delete(id) }
}

function startTimer(notice: AutoNotice) {
  stopTimer(notice.id)
  if (!notice.enabled || notice.intervalMinutes <= 0) return
  const ms = notice.intervalMinutes * 60 * 1000
  const t = setInterval(async () => {
    const token = getSecure('accessToken')
    if (!token) return
    const clientId = getSecure('clientId') ?? undefined
    try {
      await sendChat(token, notice.message, clientId)
    } catch (e) {
      console.error('[AutoNotice] send failed:', e)
    }
  }, ms)
  timers.set(notice.id, t)
}

export function initAutoNotices() {
  for (const n of getAutoNotices()) {
    if (n.enabled) startTimer(n)
  }
}

export function applyAutoNotice(notice: AutoNotice) {
  if (notice.enabled) startTimer(notice)
  else stopTimer(notice.id)
}

export function removeAutoNotice(id: string) {
  stopTimer(id)
}
