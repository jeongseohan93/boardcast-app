/**
 * [Express + Socket.IO 서버]
 *
 * Electron 메인 프로세스 안에서 localhost:3001 서버를 띄운다.
 * React 렌더러는 이 서버로 HTTP 요청(Axios)과 WebSocket(Socket.IO)을 보낸다.
 *
 * 왜 Electron 내부에 서버를 두나?
 *   - React 렌더러는 Node.js 접근 불가 → DB, 파일시스템을 직접 쓸 수 없음
 *   - IPC로 모든 걸 처리하면 복잡해짐
 *   - Express를 내부에 두면 React가 일반 HTTP API처럼 사용 가능
 *
 * 실시간 이벤트 흐름:
 *   CHZZK WebSocket → ChzzkSession → Socket.IO emit → React useSocket() 훅
 */

import express from 'express'
import cors from 'cors'
import http from 'http'
import os from 'os'
import path from 'path'
import axios from 'axios'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { Server as SocketIOServer } from 'socket.io'
import { initDB } from './db/index'
import authRouter from './routes/auth'
import liveRouter from './routes/live'
import chatRouter from './routes/chat'
import categoryRouter from './routes/category'
import eventsRouter from './routes/events'
import botRouter from './routes/bot'
import rouletteRouter from './routes/roulette'
import { setupSocket } from './socket/index'
import { ChzzkSession } from './services/chzzkSession'
import { PollService } from './services/pollService'

// Socket.IO 서버 인스턴스 — 다른 모듈에서 import해서 emit에 사용
export let io: SocketIOServer

// CHZZK WebSocket 세션 — 로그인 후 connect(), 로그아웃 시 disconnect()
export let chzzkSession: ChzzkSession | null = null

// 팔로우 폴링 서비스 — 30초마다 채널 정보를 체크해 팔로워 증가 감지
export let pollService: PollService | null = null

export async function startExpressServer(port: number) {
  // 1단계: SQLite DB 초기화 (테이블 없으면 생성)
  initDB()

  const app = express()
  const server = http.createServer(app)

  // Socket.IO 서버 생성. CORS * 허용: 렌더러(5173)와 OBS 오버레이(파일 프로토콜)에서 접근
  io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  app.use(cors({ origin: '*' }))
  app.use(express.json())

  // OBS 오버레이 HTML 정적 서빙 (donation.html 등 직접 접근용)
  app.use('/overlay', express.static(path.join(__dirname, 'overlay')))

  // clean URL 라우트: /overlay/donation → donation.html (확장자 생략 지원)
  app.get('/overlay/:name', (req, res) => {
    const file = path.join(__dirname, 'overlay', `${req.params.name}.html`)
    res.sendFile(file, (err) => {
      if (err) res.status(404).send('Overlay not found')
    })
  })

  // 오버레이 테스트 이벤트 엔드포인트 — 실제 방송 없이 미리보기 테스트용
  app.post('/api/overlay/test/:type', (req, res) => {
    const { type } = req.params
    if (type === 'donation') {
      io.emit('donation', { nickname: '테스트유저', amount: 1000, message: '테스트 후원입니다! 🧀' })
    } else if (type === 'follow') {
      io.emit('follow', { followerCount: 12345, prevFollowerCount: 12344 })
    } else if (type === 'chat') {
      io.emit('chat', {
        type: 'CHAT', userId: 'test', nickname: '테스트유저',
        message: '안녕하세요! 테스트 채팅입니다 👋', badges: [],
        timestamp: new Date().toISOString(),
      })
    } else if (type === 'roulette') {
      const { getRoulettConfig } = require('./routes/roulette')
      const cfg = getRoulettConfig()
      const items = cfg.items.length >= 2 ? cfg.items : [
        { id: '1', label: '항목 1', weight: 1 },
        { id: '2', label: '항목 2', weight: 1 },
        { id: '3', label: '항목 3', weight: 1 },
      ]
      io.emit('roulette:spin', {
        items,
        donation: { nickname: '테스트유저', amount: 100, message: '테스트 후원입니다! 🧀' },
      })
    } else {
      return res.status(400).json({ error: 'type must be donation | follow | chat | roulette' })
    }
    res.json({ ok: true })
  })

  // REST API 라우터 등록
  app.use('/auth', authRouter)           // 토큰 교환, 갱신, 상태, 자격증명
  app.use('/api/live', liveRouter)       // 방송 제목/카테고리 변경
  app.use('/api/chat', chatRouter)       // 채팅 관련
  app.use('/api/categories', categoryRouter) // 카테고리 검색
  app.use('/api/events', eventsRouter)   // 도네이션/구독/팔로우 조회·삭제
  app.use('/api/bot', botRouter)         // 봇 커맨드 CRUD
  app.use('/api/roulette', rouletteRouter) // 룰렛 설정

  app.get('/health', (_req, res) => res.json({ ok: true }))

  // 외부 이미지(CHZZK CDN) 프록시 — Electron 렌더러는 직접 외부 이미지 로드 시 차단될 수 있음
  app.get('/api/proxy/image', async (req, res) => {
    const url = req.query.url as string
    if (!url) return res.status(400).end()
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: { 'Referer': 'https://chzzk.naver.com' },
      })
      res.set('Content-Type', (response.headers['content-type'] as string) || 'image/jpeg')
      res.set('Cache-Control', 'public, max-age=86400')
      res.send(response.data)
    } catch {
      res.status(404).end()
    }
  })

  // CHZZK 세션 상태 확인 + 수동 재연결
  app.get('/api/session-status', (_req, res) => {
    res.json({ connected: chzzkSession !== null })
  })

  app.post('/api/session-reconnect', (_req, res) => {
    try {
      restoreSessionOnStartup()
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // 게임컴 → 송출컴 네트워크 접근용: 로컬 IPv4 주소 목록 반환
  app.get('/api/network-info', (_req, res) => {
    const ips: string[] = []
    for (const ifaces of Object.values(os.networkInterfaces())) {
      for (const iface of (ifaces ?? [])) {
        if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address)
      }
    }
    res.json({ ips, port })
  })

  setupSocket(io)

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Express listening on port ${port} (0.0.0.0)`)
    // 앱 재시작 시 저장된 토큰으로 세션 자동 복구
    restoreSessionOnStartup()
  })

  return { app, server, io }
}

// ─── CHZZK 세션 관리 ──────────────────────────────────────────────────────────

function secureGetFromStore(store: InstanceType<typeof Store>, key: string): string | null {
  const b64 = store.get(`secure_${key}`) as string | undefined
  if (b64) {
    try {
      return safeStorage.decryptString(Buffer.from(b64, 'base64'))
    } catch (e) {
      console.warn(`[Server] safeStorage decrypt failed for ${key}:`, e)
    }
  }
  // safeStorage 실패 또는 없을 때 plain 폴백
  return store.get(`secure_${key}_plain`) as string | null ?? null
}

function restoreSessionOnStartup() {
  try {
    const store = new Store()
    const channelId = store.get('channelId') as string | undefined
    if (!channelId) {
      console.log('[Server] Session restore skipped: no channelId stored')
      return
    }

    const accessToken = secureGetFromStore(store, 'accessToken')
    if (!accessToken) {
      console.log('[Server] Session restore skipped: accessToken decrypt failed → re-login required')
      return
    }

    const clientId = secureGetFromStore(store, 'clientId')
    const clientSecret = secureGetFromStore(store, 'clientSecret')

    console.log(`[Server] Restoring ChzzkSession (channelId=${channelId})...`)
    initChzzkSession(accessToken, channelId, clientId ?? '', clientSecret ?? '')
    if (clientId && clientSecret) {
      initPollService(accessToken, channelId, clientId, clientSecret)
    }
  } catch (err) {
    console.error('[Server] Session restore failed:', err)
  }
}

/**
 * CHZZK WebSocket 연결 시작 (로그인 성공 후 auth.ts에서 호출)
 * 기존 세션이 있으면 끊고 새로 시작 (토큰 갱신 시에도 사용)
 */
export function initChzzkSession(accessToken: string, channelId: string, clientId = '', clientSecret = '') {
  if (chzzkSession) {
    chzzkSession.disconnect()
  }
  chzzkSession = new ChzzkSession(accessToken, channelId, clientId, clientSecret, io)
  chzzkSession.connect().catch((err) => console.error('[ChzzkSession] Unhandled connect error:', err))
}

export function stopChzzkSession() {
  if (chzzkSession) {
    chzzkSession.disconnect()
    chzzkSession = null
  }
}

// ─── 폴링 서비스 관리 ──────────────────────────────────────────────────────────

/**
 * 팔로우 폴링 시작 (CHZZK WebSocket은 팔로우 이벤트를 실시간 제공 안 함)
 * 30초마다 채널 API를 폴링해 팔로워 수 증가를 감지
 */
export function initPollService(accessToken: string, channelId: string, clientId: string, clientSecret: string) {
  if (pollService) {
    pollService.stop()
  }
  pollService = new PollService(accessToken, channelId, clientId, clientSecret, io)
  pollService.start()
}

export function stopPollService() {
  if (pollService) {
    pollService.stop()
    pollService = null
  }
}
