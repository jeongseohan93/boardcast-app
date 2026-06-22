// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const SocketIOClient = require('socket.io-client-v2') as (url: string, opts?: Record<string, unknown>) => {
  on: (event: string, cb: (data: any) => void) => void
  off: (event: string) => void
  disconnect: () => void
}

import { Server as SocketIOServer } from 'socket.io'
import axios from 'axios'
import { getDB } from '../db/index'
import { getSessionAuth, sendChat } from './chzzkApi'
import { findMatchingCommand } from './botService'
import { getRoulettConfig } from '../routes/roulette'

export class ChzzkSession {
  private socket: ReturnType<typeof SocketIOClient> | null = null
  private sessionKey: string | null = null
  private accessToken: string
  private channelId: string
  private clientId: string
  private clientSecret: string
  private io: SocketIOServer
  private destroyed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private tokenRefresher: (() => Promise<string | null>) | null = null
  private refreshAttempted = false
  private chatChannelId: string | null = null

  constructor(
    accessToken: string,
    channelId: string,
    clientId: string,
    clientSecret: string,
    io: SocketIOServer,
    tokenRefresher?: () => Promise<string | null>,
  ) {
    this.accessToken = accessToken
    this.channelId = channelId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.io = io
    this.tokenRefresher = tokenRefresher ?? null
  }

  async connect() {
    this.refreshAttempted = false  // 매 연결 시도마다 초기화
    try {
      console.log('[ChzzkSession] connect() called - fetching user session auth...')
      const sessionData = await getSessionAuth(this.accessToken, this.clientId)
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

        if (data.chatChannelId && !this.chatChannelId) {
          this.chatChannelId = data.chatChannelId
          console.log('[ChzzkSession] chatChannelId captured:', this.chatChannelId)
        }

        this.io.emit('chat', {
          type: 'CHAT',
          userId: data.senderChannelId || '',
          nickname: data.profile?.nickname || 'unknown',
          message: data.content,
          emojis: data.emojis || {},
          badges: data.profile?.badges || [],
          timestamp: data.messageTime
            ? new Date(data.messageTime).toISOString()
            : new Date().toISOString(),
        })

        const msg = data.content?.trim()
        if (msg) {
          const cmd = findMatchingCommand(msg, data.userRoleCode)
          if (cmd) {
            void (async () => {
              try {
                await sendChat(this.accessToken, cmd.response, this.clientId)
              } catch (err: unknown) {
                const detail = axios.isAxiosError(err) ? err.response?.data ?? err.message : err instanceof Error ? err.message : String(err)
                console.error('[Bot] Send failed:', JSON.stringify(detail))
                this.io.emit('bot-send-error', { trigger: cmd.trigger, detail })
              }
            })()
          }
        }
      })

      this.socket.on('DONATION', (raw: unknown) => {
        const data = parse<ChzzkDonationEvent>(raw)
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
          donationType: data.donationType || 'CHAT',
          message: data.donationText,
          createdAt: now,
        }

        this.io.emit('donation', event)
        this.io.emit('event', event)

        try {
          const roulette = getRoulettConfig()
          if (roulette.enabled && roulette.triggerAmounts.includes(amount) && roulette.items.length >= 2) {
            console.log(`[Roulette] Triggered by donation: ${amount} from ${event.nickname}`)
            this.io.emit('roulette:spin', {
              items: roulette.items,
              donation: { nickname: event.nickname, amount, message: event.message },
            })
          }
        } catch (e) {
          console.error('[Roulette] Trigger check failed:', e)
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

    try {
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json',
      }
      const params = { sessionKey: this.sessionKey }

      const chatRes = await axios.post(
        'https://openapi.chzzk.naver.com/open/v1/sessions/events/subscribe/chat',
        null,
        { headers, params }
      )
      console.log('[ChzzkSession] chat subscribe response:', JSON.stringify(chatRes.data))

      await axios.post(
        'https://openapi.chzzk.naver.com/open/v1/sessions/events/subscribe/donation',
        null,
        { headers, params }
      )
      await axios.post(
        'https://openapi.chzzk.naver.com/open/v1/sessions/events/subscribe/subscription',
        null,
        { headers, params }
      )

      console.log('[ChzzkSession] Subscribed to CHAT / DONATION / SUBSCRIPTION')
    } catch (err) {
      console.error('[ChzzkSession] Subscribe failed:', err)
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
  profile?: { nickname: string; badges?: unknown[]; verifiedMark?: boolean }
  userRoleCode?: string
  content: string
  emojis?: Record<string, string>
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