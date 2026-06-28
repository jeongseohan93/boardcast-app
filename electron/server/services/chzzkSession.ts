// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const SocketIOClient = require('socket.io-client-v2') as (url: string, opts?: Record<string, unknown>) => {
  on: (event: string, cb: (data: any) => void) => void
  off: (event: string) => void
  disconnect: () => void
}

type SocketIOClientSocket = ReturnType<typeof SocketIOClient>
type DebuggableSocket = SocketIOClientSocket & {
  onevent?: (packet: { data?: unknown }) => void
}

import { Server as SocketIOServer } from 'socket.io'
import axios from 'axios'
import { getDB } from '../db/index'
import { getSessionAuth } from './chzzkApi'
import { getRoulettes } from '../routes/roulette'
import { applyTamagotchiDonation } from './tamagotchiService'
import { addVideoDonation, getVideoDonationConfig, getVideoDonationQueue, isCurrentlyPlaying, playVideoDonation } from './videoDonationService'
import { recordRawDonationEvent, recordRawSessionEvent } from './rawEventDebugService'
import { ChzzkInternalChat } from './chzzkInternalChat'
import { saveMissionToDB } from '../routes/mission'

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

function asRecord(value: unknown): Record<string, unknown> {
  const parsed = parseMaybeJSON(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
}

function normalizeBadges(value: unknown): unknown[] {
  const parsed = parseMaybeJSON(value)
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') return Object.values(parsed as Record<string, unknown>)
  return []
}

function collectProfileBadges(profile: Record<string, unknown>): unknown[] {
  const candidates = [
    profile.badges,
    profile.badge,
    profile.activityBadges,
    profile.profileBadges,
    profile.subscriptionBadge,
    profile.streamingBadge,
  ]

  const badges = candidates.flatMap(normalizeBadges)
  if (badges.length) return badges

  return Object.entries(profile)
    .filter(([key]) => /badge/i.test(key))
    .flatMap(([, value]) => normalizeBadges(value))
}

function findImageUrl(value: unknown, depth = 0): string {
  const parsed = parseMaybeJSON(value)
  if (depth > 5 || parsed == null) return ''
  if (typeof parsed === 'string') return /^https?:\/\//i.test(parsed) ? parsed : ''
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findImageUrl(item, depth + 1)
      if (found) return found
    }
    return ''
  }
  if (typeof parsed !== 'object') return ''

  const entries = Object.entries(parsed as Record<string, unknown>)
  const priority = entries.filter(([key]) => /url|image|icon|emote|emoji/i.test(key))
  for (const [, nested] of priority) {
    const found = findImageUrl(nested, depth + 1)
    if (found) return found
  }
  for (const [, nested] of entries) {
    const found = findImageUrl(nested, depth + 1)
    if (found) return found
  }
  return ''
}

function normalizeEmojis(value: unknown): Record<string, string> {
  const parsed = parseMaybeJSON(value)
  if (!parsed || typeof parsed !== 'object') return {}

  const entries = Array.isArray(parsed)
    ? parsed.map((item, index) => [String(index), item] as const)
    : Object.entries(parsed as Record<string, unknown>)

  return entries.reduce<Record<string, string>>((acc, [key, item]) => {
    const url = findImageUrl(item)
    if (url) acc[key] = url
    return acc
  }, {})
}

function emojiItemsFromMap(emojis: Record<string, string>) {
  return Object.entries(emojis).map(([key, url]) => ({ key, url }))
}

export class ChzzkSession {
  private socket: DebuggableSocket | null = null
  private sessionKey: string | null = null
  private accessToken: string
  private channelId: string
  private clientId: string
  private io: SocketIOServer
  private destroyed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private tokenRefresher: (() => Promise<string | null>) | null = null
  private refreshAttempted = false
  private chatChannelId: string | null = null
  private internalChat: ChzzkInternalChat | null = null

  getChatChannelId(): string | null {
    return this.chatChannelId
  }

  constructor(
    accessToken: string,
    channelId: string,
    clientId: string,
    _clientSecret: string,
    io: SocketIOServer,
    tokenRefresher?: () => Promise<string | null>,
  ) {
    this.accessToken = accessToken
    this.channelId = channelId
    this.clientId = clientId
    this.io = io
    this.tokenRefresher = tokenRefresher ?? null
  }

  private getDonationTotal(userId?: string, nickname?: string): number {
    const db = getDB()
    const row = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM donations
       WHERE channel_id = ?
         AND (
           (? != '' AND user_id = ?)
           OR (? != '' AND nickname = ?)
         )`
    ).get(
      this.channelId,
      userId || '',
      userId || '',
      nickname || '',
      nickname || ''
    ) as { total: number }

    return row.total
  }

  private shouldRecordRawSessionEvent(eventName: string): boolean {
    return eventName !== 'CHAT'
  }

  private captureRawSessionEvent(eventName: string, args: unknown[]) {
    if (!this.shouldRecordRawSessionEvent(eventName)) return

    try {
      const debugEntry = recordRawSessionEvent({
        eventName,
        args,
        channelId: this.channelId,
      })

      console.log('[ChzzkSession] session raw captured:', {
        id: debugEntry.id,
        eventName: debugEntry.eventName,
        keys: debugEntry.keys,
        systemType: debugEntry.systemType,
        eventType: debugEntry.eventType,
        dataType: debugEntry.dataType,
        donationType: debugEntry.donationType,
        status: debugEntry.status,
        kind: debugEntry.kind,
        missionHints: debugEntry.missionHints,
      })
      this.io.emit('debug:sessionRaw', debugEntry)
    } catch (err) {
      console.error('[ChzzkSession] session raw capture failed:', err)
    }
  }

  private attachRawSessionDebug(socket: DebuggableSocket) {
    const originalOnevent = typeof socket.onevent === 'function'
      ? socket.onevent.bind(socket)
      : null

    if (originalOnevent) {
      socket.onevent = (packet: { data?: unknown }) => {
        const packetData = Array.isArray(packet?.data) ? packet.data : []
        const [eventName, ...args] = packetData

        if (typeof eventName === 'string') {
          this.captureRawSessionEvent(eventName, args)
        } else {
          this.captureRawSessionEvent('UNKNOWN', packetData)
        }

        originalOnevent(packet)
      }
      return
    }

    for (const eventName of ['SYSTEM', 'DONATION', 'SUBSCRIPTION', 'MISSION', 'MISSION_PARTICIPATION']) {
      socket.on(eventName, (raw: unknown) => this.captureRawSessionEvent(eventName, [raw]))
    }
  }

  async connect() {
    this.refreshAttempted = false  // 매 연결 시도마다 초기화
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    try {
      console.log('[ChzzkSession] connect() called - fetching user session auth...')
      const sessionData = await getSessionAuth(this.accessToken)
      console.log('[ChzzkSession] Session auth response:', JSON.stringify(sessionData))
      const { url } = sessionData

      if (!url) {
        console.error('[ChzzkSession] No URL in session auth! Keys:', Object.keys(sessionData || {}))
        this.scheduleReconnect()
        return
      }

      console.log('[ChzzkSession] Connecting to:', url)
      this.socket = SocketIOClient(url, {
        reconnection: false,
        'force new connection': true,
        'connect timeout': 3000,
        transports: ['websocket'],
      })
      this.attachRawSessionDebug(this.socket)

      this.socket.on('connect', () => {
        console.log('[ChzzkSession] WebSocket connected - waiting for SYSTEM connected message')
      })

      const parse = <T>(raw: unknown): T => {
        if (typeof raw === 'string') return JSON.parse(raw) as T
        return raw as T
      }

      this.socket.on('SYSTEM', async (raw: unknown) => {
        const data = parse<ChzzkSystemMessage>(raw)
        console.log('[ChzzkSession] SYSTEM (parsed):', JSON.stringify(data))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionKey = data.data?.sessionKey ?? (data as any).sessionKey
        if (data.type?.toLowerCase() === 'connected' && sessionKey) {
          this.sessionKey = sessionKey
          await this.subscribe()
        }
      })

      this.socket.on('CHAT', (raw: unknown) => {
        const data = parse<ChzzkChatEvent>(raw)
        const profile = asRecord(data.profile)
        const badges = collectProfileBadges(profile)
        const userId = data.senderChannelId || ''
        const nickname = typeof profile.nickname === 'string' ? profile.nickname : 'unknown'
        const msg = (data.content || '').trim()
        const emojis = normalizeEmojis(data.emojis)

        if (data.chatChannelId && !this.chatChannelId) {
          this.chatChannelId = data.chatChannelId
          console.log('[ChzzkSession] chatChannelId captured:', this.chatChannelId)
          this.startInternalChat(this.chatChannelId)
        }

        this.io.emit('chat', {
          type: 'CHAT',
          userId,
          chatChannelId: data.chatChannelId,
          messageTime: data.messageTime,
          senderChannelId: data.senderChannelId,
          nickname,
          message: data.content,
          donationTotal: this.getDonationTotal(userId, nickname),
          emojis,
          emojiItems: emojiItemsFromMap(emojis),
          badges,
          timestamp: data.messageTime
            ? new Date(data.messageTime).toISOString()
            : new Date().toISOString(),
        })

        // ── 출석 체크 처리 ───────────────────────────────────────────────────────
        const { getAttendanceSettings, processAttendance, buildReply, matchesAttendanceKeyword } = require('./attendanceService')
        const attSettings = getAttendanceSettings()
        if (
          attSettings.enabled &&
          attSettings.keyword &&
          matchesAttendanceKeyword(msg, attSettings.keyword)
        ) {
          const result = processAttendance(this.channelId, nickname, userId)
          if (!result.alreadyChecked) {
            this.io.emit('attendance', { nickname, count: result.count, isNew: result.isNew })
            const reply = buildReply(attSettings.replyTemplate, nickname, result.count)
            const { sendChat } = require('../services/chzzkApi')
            sendChat(this.accessToken, reply, this.clientId).catch((e: unknown) => {
              console.error('[Attendance] sendChat failed:', e)
            })
          }
        }

        // ── 투표 커맨드 처리 ─────────────────────────────────────────────────────
        const { startPoll, stopPoll, vote, isActive, getVoteState } = require('./votingService')

        if (msg === '!투표종료') {
          const state = stopPoll()
          this.io.emit('pollUpdate', state)
        } else if (msg.startsWith('!투표')) {
          const rest = msg.slice(3).trim()
          if (rest) {
            const parts = rest.split('/').map((s: string) => s.trim()).filter(Boolean)
            if (parts.length >= 3) {
              const [title, ...options] = parts
              const state = startPoll(title, options)
              this.io.emit('pollUpdate', state)
            }
          }
        } else if (isActive() && /^[1-9]$/.test(msg)) {
          const changed = vote(userId, parseInt(msg, 10))
          if (changed) this.io.emit('pollUpdate', getVoteState())
        }

      })

      this.socket.on('DONATION', (raw: unknown) => {
        const data = parse<ChzzkDonationEvent>(raw)
        const debugEntry = recordRawDonationEvent({ raw, parsed: data, channelId: this.channelId })
        console.log('[ChzzkSession] donation raw captured:', {
          id: debugEntry.id,
          keys: debugEntry.keys,
          donationType: debugEntry.donationType,
          missionHints: debugEntry.missionHints,
        })
        this.io.emit('debug:donationRaw', debugEntry)

        const db = getDB()
        const now = new Date().toISOString()
        const amount = parseInt(data.payAmount || '0', 10)

        const stmt = db.prepare(
          `INSERT INTO donations (channel_id, user_id, nickname, amount, type, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        const result = stmt.run(
          this.channelId,
          data.donatorChannelId || '',
          data.donatorNickname || 'unknown',
          amount,
          data.donationType || 'CHAT',
          data.donationText || null,
          now
        )

        const event = {
          id: result.lastInsertRowid,
          type: 'DONATION',
          channelId: this.channelId,
          userId: data.donatorChannelId,
          nickname: data.donatorNickname || 'unknown',
          amount,
          donationTotal: this.getDonationTotal(data.donatorChannelId || '', data.donatorNickname || 'unknown'),
          donationType: data.donationType || 'CHAT',
          message: data.donationText,
          createdAt: now,
        }

        this.io.emit('event', event)
        applyTamagotchiDonation(amount, event.nickname, this.io)

        // ── 후원 라우팅 ───────────────────────────────────────────────────────
        // 1. 활성화된 룰렛 중 금액이 일치하는 첫 번째 룰렛을 발동
        // 2. 일치하는 룰렛이 없으면 채팅 후원 오버레이 발동
        // 3. 영상 후원은 donationType 기준으로 독립 처리
        let rouletteTriggered = false
        try {
          const roulettes = getRoulettes()
          const matched = roulettes.find(
            r => r.enabled && r.triggerAmounts.includes(amount) && r.items.length >= 2
          )
          if (matched) {
            rouletteTriggered = true
            console.log(`[Roulette] "${matched.name}" triggered by ${amount} from ${event.nickname}`)
            this.io.emit('roulette:spin', {
              spinId: `donation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              rouletteId: matched.id,
              items: matched.items,
              theme: matched.theme || 'default',
              mode: matched.mode || 'wheel',
              donation: { nickname: event.nickname, amount, message: event.message },
            })
          }
        } catch (e) {
          console.error('[Roulette] Trigger check failed:', e)
        }

        // 룰렛이 발동되지 않은 경우에만 채팅 후원 오버레이 표시
        // 금액별 알림 규칙에서 매칭되는 이미지·사운드를 첨부
        if (!rouletteTriggered) {
          const { matchDonationAlertRule } = require('./donationAlertService')
          const rule = matchDonationAlertRule(amount)
          this.io.emit('donation', {
            ...event,
            imageDataUrl: rule?.imageDataUrl ?? '',
            imageSize: rule?.imageSize ?? 118,
            soundDataUrl: rule?.soundDataUrl ?? '',
            soundVolume: rule?.soundVolume ?? 1,
          })
        }

        // 영상 후원은 금액/룰렛과 무관하게 YouTube 링크 여부로 독립 처리
        const videoDonation = addVideoDonation({
          nickname: event.nickname,
          amount,
          message: event.message,
          donationType: event.donationType,
        })
        if (videoDonation) {
          this.io.emit('videoDonation:queue', getVideoDonationQueue())
          if (getVideoDonationConfig().autoPlay && !isCurrentlyPlaying()) {
            playVideoDonation(this.io, videoDonation.id)
          }
        }
      })

      this.socket.on('SUBSCRIPTION', (raw: unknown) => {
        const data = parse<ChzzkSubscriptionEvent>(raw)
        const db = getDB()
        const now = new Date().toISOString()

        const stmt = db.prepare(
          `INSERT INTO subscriptions (channel_id, user_id, nickname, month, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        const result = stmt.run(
          this.channelId,
          data.subscriberChannelId || '',
          data.subscriberNickname || 'unknown',
          data.month || null,
          null,
          now
        )

        const event = {
          id: result.lastInsertRowid,
          type: 'SUBSCRIPTION',
          channelId: this.channelId,
          userId: data.subscriberChannelId,
          nickname: data.subscriberNickname || 'unknown',
          month: data.month,
          tierNo: data.tierNo,
          tierName: data.tierName,
          createdAt: now,
        }

        this.io.emit('subscription', event)
        this.io.emit('event', event)
      })

      this.socket.on('disconnect', (reason: string) => {
        console.log(`[ChzzkSession] Disconnected (${reason}) - reconnecting in 5s...`)
        this.scheduleReconnect()
      })

      this.socket.on('error', (err: unknown) => {
        console.error('[ChzzkSession] Socket error:', err)
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        if (this.tokenRefresher && !this.refreshAttempted) {
          this.refreshAttempted = true
          console.log('[ChzzkSession] Token expired - attempting refresh...')
          try {
            const newToken = await this.tokenRefresher()
            if (newToken) {
              this.accessToken = newToken
              console.log('[ChzzkSession] Token refreshed - reconnecting in 1s...')
              this.scheduleReconnect(1000)
              return
            }
          } catch (refreshErr) {
            console.error('[ChzzkSession] Token refresh failed:', refreshErr)
          }
        }
        console.error('[ChzzkSession] Token expired or invalid - re-login required.')
        this.io.emit('session-error', { type: 'TOKEN_EXPIRED' })
        return
      }

      const detail = axios.isAxiosError(err)
        ? `HTTP ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err)
      console.error('[ChzzkSession] Connect failed:', detail)
      this.scheduleReconnect()
    }
  }

  private async subscribe() {
    if (!this.sessionKey) {
      console.error('[ChzzkSession] subscribe() called without sessionKey')
      return
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    }
    // docs: "Request Param" → query parameter for these POST endpoints
    const params = { sessionKey: this.sessionKey }

    const BASE = 'https://openapi.chzzk.naver.com/open/v1/sessions/events'

    try {
      const chatRes = await axios.post(`${BASE}/subscribe/chat`, null, { headers, params })
      console.log('[ChzzkSession] chat subscribe:', chatRes.status, JSON.stringify(chatRes.data))
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? `HTTP ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err)
      console.error('[ChzzkSession] chat subscribe failed:', detail)
    }

    try {
      const donRes = await axios.post(`${BASE}/subscribe/donation`, null, { headers, params })
      console.log('[ChzzkSession] donation subscribe:', donRes.status, JSON.stringify(donRes.data))
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? `HTTP ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err)
      console.error('[ChzzkSession] donation subscribe failed:', detail)
    }

    try {
      const subRes = await axios.post(`${BASE}/subscribe/subscription`, null, { headers, params })
      console.log('[ChzzkSession] subscription subscribe:', subRes.status, JSON.stringify(subRes.data))
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? `HTTP ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err)
      console.error('[ChzzkSession] subscription subscribe failed:', detail)
    }

    // 미션 이벤트 구독 시도 (공식 문서에 없으므로 실패해도 무시)
    const missionEndpoints = ['mission', 'activity_feed', 'activity']
    for (const ep of missionEndpoints) {
      try {
        const mRes = await axios.post(`${BASE}/subscribe/${ep}`, null, { headers, params })
        console.log(`[ChzzkSession] ${ep} subscribe:`, mRes.status, JSON.stringify(mRes.data))
      } catch (err) {
        const detail = axios.isAxiosError(err)
          ? `HTTP ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
          : String(err)
        console.log(`[ChzzkSession] ${ep} subscribe attempt:`, detail)
      }
    }

    console.log('[ChzzkSession] Subscribe calls completed for sessionKey:', this.sessionKey?.slice(0, 8) + '...')

    // CHAT 이벤트 없이도 내부 채팅 연결 시작
    if (!this.chatChannelId) {
      this.fetchChatChannelIdAndStartInternal()
    }
  }

  private async fetchChatChannelIdAndStartInternal() {
    try {
      // Electron 세션에서 NID 쿠키 추출 (chzzkInternalChat과 동일 패턴)
      const { session } = await import('electron')
      const cookies = await session.defaultSession.cookies.get({ domain: '.naver.com' })
      const nidAuth    = cookies.find(c => c.name === 'NID_AUT')?.value
      const nidSession = cookies.find(c => c.name === 'NID_SES')?.value

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
      if (nidAuth && nidSession) {
        headers['Cookie'] = `NID_AUT=${nidAuth}; NID_SES=${nidSession}`
      }

      const res = await axios.get(
        `https://api.chzzk.naver.com/service/v2/channels/${this.channelId}/live-detail`,
        { headers, timeout: 10000 }
      )
      const chatChannelId = res.data?.content?.chatChannelId
      if (chatChannelId && !this.chatChannelId) {
        this.chatChannelId = chatChannelId
        console.log('[ChzzkSession] chatChannelId (from live-detail API):', chatChannelId)
        this.startInternalChat(chatChannelId)
      } else {
        console.log('[ChzzkSession] live-detail: chatChannelId 없음 (오프라인?)', JSON.stringify(res.data?.content))
      }
    } catch (err) {
      console.error('[ChzzkSession] chatChannelId fetch 실패:', err instanceof Error ? err.message : err)
    }
  }

  private scheduleReconnect(delay = 5000) {
    if (this.destroyed) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) {
        console.log('[ChzzkSession] Reconnecting...')
        this.connect().catch((err) => console.error('[ChzzkSession] Reconnect error:', err))
      }
    }, delay)
  }

  private startInternalChat(chatChannelId: string) {
    if (this.internalChat) return  // 이미 연결 중
    this.internalChat = new ChzzkInternalChat(
      chatChannelId,
      (mission) => {
        try {
          saveMissionToDB(this.channelId, mission)
        } catch (err) {
          console.error('[ChzzkSession] mission DB save failed:', err)
        }
        this.io.emit('mission', mission)
        console.log('[ChzzkSession] mission emit:', mission.missionText, mission.status)
      },
      (raw) => {
        this.io.emit('debug:internalDonationRaw', raw)
      },
    )
    this.internalChat.connect().catch((err) => {
      console.error('[ChzzkSession] internalChat connect 실패:', err)
    })
  }

  disconnect() {
    this.destroyed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.internalChat?.destroy()
    this.internalChat = null
    this.sessionKey = null
  }
}

interface ChzzkSystemMessage {
  type: string
  data?: { sessionKey?: string; eventType?: string; channelId?: string }
}

interface ChzzkChatEvent {
  channelId?: string
  senderChannelId?: string
  chatChannelId?: string
  profile?: unknown
  userRoleCode?: string
  content: string
  emojis?: unknown
  messageTime?: number
}

interface ChzzkDonationEvent {
  donationType?: string
  channelId?: string
  donatorChannelId?: string
  donatorNickname?: string
  payAmount?: string
  donationText?: string
  emojis?: Record<string, string>
}

interface ChzzkSubscriptionEvent {
  channelId?: string
  subscriberChannelId?: string
  subscriberNickname?: string
  tierNo?: number
  tierName?: string
  month?: number
}
