/**
 * [CHZZK WebSocket 세션]
 *
 * 공식 문서 기준 연결 흐름:
 *   1. GET /open/v1/sessions/auth → { url } 수신
 *   2. Socket.IO v2 클라이언트로 url에 연결
 *   3. SYSTEM 이벤트 수신 → type === 'connected' 일 때 data.sessionKey 획득
 *   4. sessionKey로 채팅/후원/구독 이벤트 구독 신청
 *       POST /open/v1/sessions/events/subscribe/chat  { sessionKey }
 *       POST /open/v1/sessions/events/subscribe/donation
 *       POST /open/v1/sessions/events/subscribe/subscription
 *   5. CHAT / DONATION / SUBSCRIPTION 이벤트 수신
 *
 * Socket.IO 버전: CHZZK 서버는 v2 프로토콜 사용 (v4와 호환 안 됨)
 */

// CHZZK는 Socket.IO v2 프로토콜 사용 — npm alias로 설치된 v2 라이브러리 사용
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const SocketIOClient = require('socket.io-client-v2') as (url: string, opts?: Record<string, unknown>) => { on: (event: string, cb: (data: any) => void) => void; off: (event: string) => void; disconnect: () => void }

import { Server as SocketIOServer } from 'socket.io'
import axios from 'axios'
import { getDB } from '../db/index'
import { getSessionAuth, sendChat } from './chzzkApi'
import { findMatchingCommand } from './botService'
import { getRoulettConfig } from '../routes/roulette'

export class ChzzkSession {
  private socket: ReturnType<typeof SocketIOClient> | null = null
  private sessionKey: string | null = null  // SYSTEM connected 메시지에서 획득
  private accessToken: string
  private channelId: string
  private clientId: string
  private clientSecret: string
  private io: SocketIOServer
  private destroyed = false  // disconnect() 명시 호출 시 재연결 방지
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(accessToken: string, channelId: string, clientId: string, clientSecret: string, io: SocketIOServer) {
    this.accessToken = accessToken
    this.channelId = channelId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.io = io
  }

  async connect() {
    try {
      console.log('[ChzzkSession] connect() called — fetching user session auth...')
      // 1단계: User 세션으로 URL 획득 (채팅 구독은 User Access Token 필수)
      const sessionData = await getSessionAuth(this.accessToken, this.clientId)
      console.log('[ChzzkSession] Session auth response:', JSON.stringify(sessionData))
      const { url } = sessionData

      if (!url) {
        console.error('[ChzzkSession] No URL in session auth! Keys:', Object.keys(sessionData || {}))
        this.scheduleReconnect()
        return
      }

      console.log('[ChzzkSession] Connecting to:', url)

      // 2단계: 공식 문서 권장 옵션으로 Socket.IO v2 연결
      this.socket = SocketIOClient(url, {
        reconnection: false,
        'force new connection': true,
        'connect timeout': 3000,
        transports: ['websocket'],
      })

      this.socket.on('connect', () => {
        console.log('[ChzzkSession] WebSocket connected — waiting for SYSTEM connected message')
      })

      // CHZZK는 이벤트 데이터를 JSON 문자열로 보냄 — 파싱 헬퍼
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parse = <T>(raw: unknown): T => {
        if (typeof raw === 'string') return JSON.parse(raw) as T
        return raw as T
      }

      // 3단계: 시스템 메시지에서 sessionKey 추출 → 이벤트 구독 신청
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

      // ── CHAT 이벤트 ─────────────────────────────────────────────────────────
      this.socket.on('CHAT', (raw: unknown) => {
        const data = parse<ChzzkChatEvent>(raw)
        if (data.emojis && Object.keys(data.emojis).length > 0) {
          console.log('[Chat] emojis:', JSON.stringify(data.emojis))
        }
        this.io.emit('chat', {
          type: 'CHAT',
          userId: data.senderChannelId || '',
          nickname: data.profile?.nickname || '익명',
          message: data.content,
          emojis: data.emojis || {},
          badges: data.profile?.badges || [],
          timestamp: data.messageTime
            ? new Date(data.messageTime).toISOString()
            : new Date().toISOString(),
        })

        // 봇 명령어 트리거 확인 → 매칭 시 자동 응답
        const msg = data.content?.trim()
        if (msg) {
          const cmd = findMatchingCommand(msg, data.userRoleCode)
          if (cmd) {
            sendChat(this.accessToken, cmd.response)
              .then(() => console.log(`[Bot] Sent: "${cmd.response}"`))
              .catch((err) => console.error('[Bot] Send failed:', err?.response?.data || err.message))
          }
        }
      })

      // ── DONATION 이벤트 ──────────────────────────────────────────────────────
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
          data.donatorNickname || '익명',
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
          nickname: data.donatorNickname || '익명',
          amount,
          donationType: data.donationType || 'CHAT',
          message: data.donationText,
          createdAt: now,
        }

        this.io.emit('donation', event)
        this.io.emit('event', event)

        // 룰렛 트리거 체크
        try {
          const roulette = getRoulettConfig()
          if (roulette.enabled && roulette.triggerAmounts.includes(amount) && roulette.items.length >= 2) {
            console.log(`[Roulette] Triggered by donation: ${amount}치즈 from ${event.nickname}`)
            this.io.emit('roulette:spin', {
              items: roulette.items,
              donation: { nickname: event.nickname, amount, message: event.message },
            })
          }
        } catch (e) {
          console.error('[Roulette] Trigger check failed:', e)
        }
      })

      // ── SUBSCRIPTION 이벤트 ──────────────────────────────────────────────────
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
          data.subscriberNickname || '익명',
          data.month || null,
          null,
          now
        )

        const event = {
          id: result.lastInsertRowid,
          type: 'SUBSCRIPTION',
          channelId: this.channelId,
          userId: data.subscriberChannelId,
          nickname: data.subscriberNickname || '익명',
          month: data.month,
          tierNo: data.tierNo,
          tierName: data.tierName,
          createdAt: now,
        }

        this.io.emit('subscription', event)
        this.io.emit('event', event)
      })

      this.socket.on('disconnect', (reason: string) => {
        console.log(`[ChzzkSession] Disconnected (${reason}) — reconnecting in 5s...`)
        this.scheduleReconnect()
      })

      this.socket.on('error', (err: unknown) => {
        console.error('[ChzzkSession] Socket error:', err)
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        console.error('[ChzzkSession] Token expired or invalid — re-login required. Not retrying.')
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

  /**
   * SYSTEM connected 수신 후 호출.
   * sessionKey로 구독 신청 (channelId 아님!)
   */
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
        null, { headers, params }
      )
      console.log('[ChzzkSession] chat subscribe response:', JSON.stringify(chatRes.data))

      await axios.post(
        'https://openapi.chzzk.naver.com/open/v1/sessions/events/subscribe/donation',
        null, { headers, params }
      )
      await axios.post(
        'https://openapi.chzzk.naver.com/open/v1/sessions/events/subscribe/subscription',
        null, { headers, params }
      )

      console.log('[ChzzkSession] Subscribed to CHAT / DONATION / SUBSCRIPTION')
    } catch (err) {
      console.error('[ChzzkSession] Subscribe failed:', err)
    }
  }

  private scheduleReconnect() {
    if (this.destroyed) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) {
        console.log('[ChzzkSession] Reconnecting...')
        this.connect().catch((err) => console.error('[ChzzkSession] Reconnect error:', err))
      }
    }, 5000)
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

// ─── 타입 정의 (공식 문서 필드명 기준) ─────────────────────────────────────────

interface ChzzkSystemMessage {
  type: string  // 'connected' | 'subscribed' | 'unsubscribed' | 'revoked'
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
  donationType?: string       // 'CHAT' | 'VIDEO'
  channelId?: string
  donatorChannelId?: string
  donatorNickname?: string
  payAmount?: string          // 문자열! parseInt 필요
  donationText?: string
  emojis?: Record<string, string>
}

interface ChzzkSubscriptionEvent {
  channelId?: string
  subscriberChannelId?: string
  subscriberNickname?: string
  tierNo?: number             // 1 | 2
  tierName?: string
  month?: number
}
