/**
 * [Express + Socket.IO ??類ㅼ뮅]
 *
 * Electron 嶺뚮∥????熬곣뫁夷?筌뤾쑬裕????고뱺??localhost:3001 ??類ㅼ뮅???熬곣뫗???
 * React ????????????類ㅼ뮅??HTTP ??븐슙??Axios)??WebSocket(Socket.IO)???곌랜?亦??
 *
 * ??Electron ????????類ㅼ뮅???????
 *   - React ????????Node.js ??얜∥???釉띾쐝? ??DB, ???逾??戮?츩??戮곕굵 嶺뚯쉳?????????怨몃쾳
 *   - IPC??嶺뚮ㅄ維獄?濾?嶺뚳퐣瑗???濡?듆 ?곌랜踰???怨몄뗀
 *   - Express?????????????React?띠럾? ??怨쀫틮 HTTP API嶺뚳퐣瑗???????띠럾??? *
 * ???곕뻣?????繹???????
 *   CHZZK WebSocket ??ChzzkSession ??Socket.IO emit ??React useSocket() ?? */

import express, { Request, Response, NextFunction } from 'express'
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
import channelRouter from './routes/channel'
import eventsRouter from './routes/events'
import botRouter from './routes/bot'
import autoNoticeRouter from './routes/autoNotice'
import { initAutoNotices } from './services/autoNoticeService'
import rouletteRouter from './routes/roulette'
import rouletteListRouter from './routes/rouletteList'
import tamagotchiRouter from './routes/tamagotchi'
import votingRouter from './routes/voting'
import pubgRouter, { initPubgTracking } from './routes/pubg'
import videoDonationRouter from './routes/videoDonation'
import attendanceRouter from './routes/attendance'
import donationAlertRouter from './routes/donationAlert'
import ttsDonationRouter from './routes/ttsDonation'
import { setupSocket } from './socket/index'
import { ChzzkSession } from './services/chzzkSession'
import { PollService } from './services/pollService'
import { applyTamagotchiDonation, applyTamagotchiFollow } from './services/tamagotchiService'
import { addVideoDonation, getVideoDonationQueue, playVideoDonation } from './services/videoDonationService'
import { recordChzzkWebhookEvent } from './services/chzzkWebhookDebugService'

// Socket.IO ??類ㅼ뮅 ?筌뤾쑬裕??怨룸츩 ?????섎?嶺뚮ㅄ維獄?????import??怨댄맋 emit??????
export let io: SocketIOServer

// CHZZK WebSocket ?筌뤾쑬?????β돦裕?????connect(), ?β돦裕??熬곣뫗????disconnect()
export let chzzkSession: ChzzkSession | null = null

// ??븐뼚夷?????壤???類λ룴????30?貫?꾢퐲??嶺??х몭??筌먲퐢沅??嶺뚳퐢?얍칰????븐뼚夷??嶺뚯빘鍮? ?띠룆흮?
export let pollService: PollService | null = null

export async function startExpressServer(port: number) {
  // 1??節띉? SQLite DB ?貫?껆뵳??(???逾????怨몃さ嶺???諛댁뎽)
  initDB()

  const app = express()
  const store = new Store()
  const server = http.createServer(app)

  // Socket.IO ??類ㅼ뮅 ??諛댁뎽. CORS * ???깅뮔: ??????5173)?? OBS ???댁뮅???깅턄(???逾??熬곣뫁夷??ル“留????????얜∥??
  io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  app.use(cors({ origin: '*' }))

  // 민감 엔드포인트는 localhost 에서만 접근 허용
  const localOnly = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.socket.remoteAddress || ''
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next()
    return res.status(403).json({ error: 'Local access only' })
  }
  app.use(['/api/events/import', '/api/events/export', '/api/events/all'], localOnly)
  app.post('/api/webhook/chzzk', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}))
    const entry = recordChzzkWebhookEvent({
      headers: req.headers,
      rawBody,
      remoteAddress: req.ip,
    })
    console.log('[ChzzkWebhook] captured:', {
      id: entry.id,
      messageId: entry.messageId,
      dataType: entry.dataType,
    })
    try { io?.emit('debug:chzzkWebhook', entry) } catch {}
    res.status(204).end()
  })
  app.use(express.json({ limit: '50mb' }))

  // OBS ???댁뮅???깅턄 HTML ?筌먦끉????類λ뭶 (donation.html ??嶺뚯쉳?????얜∥???
  app.use('/overlay', express.static(path.join(__dirname, 'overlay')))

  // clean URL ??源녿뮡?? /overlay/donation ??donation.html (?筌먦끉?????紐꾩끋 嶺뚯솘???
  const ALLOWED_OVERLAYS = new Set([
    'donation', 'follow', 'chat', 'roulette', 'roulette-list',
    'avachat', 'emote', 'slot-roulette', 'tamagotchi',
    'video-donation', 'vote',
  ])
  app.get('/overlay/:name', (req, res) => {
    const name = req.params.name
    if (!ALLOWED_OVERLAYS.has(name)) return res.status(404).send('Overlay not found')
    const file = path.join(__dirname, 'overlay', `${name}.html`)
    res.sendFile(file, (err) => {
      if (err) res.status(404).send('Overlay not found')
    })
  })

  // ???댁뮅???깅턄 ???裕?????繹????븐뼔援??????????깆젷 ?꾩렮維????怨몃턄 亦껋꼶梨?怨?돦??⒱뵛 ???裕?筌뤾쑴??
  app.post('/api/overlay/test/:type', (req, res) => {
    const { type } = req.params
    if (type === 'donation') {
      const overlaySettings = (store.get('overlaySettings') || {}) as any
      const donationSettings = overlaySettings.donation || {}
      io.emit('donation', {
        nickname: 'testuser',
        amount: 1000,
        message: 'test donation',
        imageDataUrl: typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : donationSettings.imageDataUrl,
        imageSize: Number(req.body?.imageSize || donationSettings.imageSize || 118),
      })
    } else if (type === 'follow') {
      const overlaySettings = (store.get('overlaySettings') || {}) as any
      const followSettings = overlaySettings.follow || {}
      io.emit('follow', {
        nickname: 'testuser',
        followerCount: 12345,
        prevFollowerCount: 12344,
        imageDataUrl: typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : followSettings.imageDataUrl,
        imageSize: Number(req.body?.imageSize || followSettings.imageSize || 118),
      })
    } else if (type === 'chat') {
      io.emit('chat', {
        type: 'CHAT', userId: 'test', nickname: 'testuser',
        message: 'test chat message',
        badges: [{ badgeType: 'STREAMER', imageUrl: 'https://ssl.pstatic.net/static/nng/glive/icon/favicon.png' }],
        timestamp: new Date().toISOString(),
      })
      io.emit('notice', {
        message: 'test notice message',
        timestamp: new Date().toISOString(),
      })
    } else if (type === 'roulette') {
      const { getRoulettes, rememberSpinId } = require('./routes/roulette')
      const roulettes = getRoulettes()
      const requestedId = req.body?.rouletteId as string | undefined
      const cfg = (requestedId ? roulettes.find((r: { id: string }) => r.id === requestedId) : null) || roulettes[0] || {}
      const items = (cfg.items || []).length >= 2 ? cfg.items : [
        { id: '1', label: 'Item 1', weight: 1 },
        { id: '2', label: 'Item 2', weight: 1 },
        { id: '3', label: 'Item 3', weight: 1 },
      ]
      const spinId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
      io.emit('roulette:spin', {
        spinId,
        rouletteId: cfg.id,
        items,
        theme: cfg.theme || 'default',
        mode: cfg.mode || 'wheel',
        donation: { nickname: 'testuser', amount: 100, message: 'test donation' },
      })
      // testAffectsList ON이면 오버레이 없이도 직접 결과 적용
      const testAffectsListVal = (store.get('testAffectsList') as boolean) ?? false
      if (testAffectsListVal && cfg.listItemId) {
        const { applyRouletteResult } = require('./routes/rouletteList')
        const totalWeight = items.reduce((s: number, it: { weight?: number }) => s + (it.weight || 1), 0)
        let rand = Math.random() * totalWeight
        let winner = items[items.length - 1]
        for (const it of items) {
          rand -= (it.weight || 1)
          if (rand <= 0) { winner = it; break }
        }
        // spinId 등록 → 오버레이가 나중에 보내도 중복 적용 방지
        rememberSpinId(spinId)
        const result = applyRouletteResult(cfg.listItemId, winner.label, 'testuser')
        if (result) {
          try { io.emit('rouletteList:update', result) } catch {}
        }
      }
    } else if (type === 'tamagotchi') {
      applyTamagotchiDonation(500, 'testuser', io)
      applyTamagotchiFollow('testuser', io)
    } else if (type === 'vote') {
      io.emit('pollUpdate', {
        status: 'active',
        title: 'Test vote',
        options: [
          { label: 'Game', votes: 42 },
          { label: 'Music', votes: 27 },
          { label: 'Talk', votes: 18 },
        ],
      })
    } else if (type === 'emote') {
      const sampleEmoji = 'party'
      io.emit('chat', {
        type: 'CHAT', userId: 'test', nickname: 'testuser',
        message: `{:${sampleEmoji}:} emote party test`,
        emojis: { [sampleEmoji]: 'https://ssl.pstatic.net/static/nng/glive/icon/favicon.png' },
        emojiItems: [{ key: sampleEmoji, url: 'https://ssl.pstatic.net/static/nng/glive/icon/favicon.png' }],
        badges: [],
        timestamp: new Date().toISOString(),
      })
    } else if (type === 'avachat') {
      io.emit('chat', {
        type: 'CHAT',
        userId: 'test',
        nickname: 'avatar-test',
        message: 'avatar chat test message',
        badges: [],
        timestamp: new Date().toISOString(),
      })
    } else if (type === 'video-donation') {
      const item = addVideoDonation({
        nickname: 'video-test',
        amount: 1000,
        message: 'https://youtu.be/dQw4w9WgXcQ',
        donationType: 'VIDEO',
      })
      io.emit('videoDonation:queue', getVideoDonationQueue())
      if (item) playVideoDonation(io, item.id)
    } else {
      return res.status(400).json({ error: 'unknown type' })
    }
    res.json({ ok: true })
  })

  app.get('/api/overlay/settings', (_req, res) => {
    res.json(store.get('overlaySettings') || {})
  })

  // 오버레이 테마 — 서버가 현재 테마를 보관하고 소켓으로 실시간 전파
  let overlayThemes: Record<string, number> = (store.get('overlayThemes') as Record<string, number>) || {}
  app.get('/api/overlay/themes', (_req, res) => {
    res.json(overlayThemes)
  })
  app.post('/api/overlay/themes', (req, res) => {
    const { key, id } = req.body as { key: string; id: number }
    if (key && typeof id === 'number') {
      overlayThemes = { ...overlayThemes, [key]: id }
      store.set('overlayThemes', overlayThemes)
      io.emit('theme:update', overlayThemes)
    }
    res.json({ ok: true })
  })

  // REST API ??源녿뮡???繹먮굞夷?
  app.use('/auth', authRouter)           // ??ルㅎ荑?????? ?띠룄??? ??⑤객臾? ???遊꾤춯?밸퉾筌?
  app.use('/api/live', liveRouter)       // ?꾩렮維????類쏄콬/?곸궠??誘ㅒ?μ쪚???곌떠??? ??源녿턄??嶺뚮ㅄ維뽨빳?
  app.use('/api/chat', chatRouter)       // 嶺??????㉱?? 嶺???????깆젧
  app.use('/api/categories', categoryRouter) // ?곸궠??誘ㅒ?μ쪚???롪틵???  app.use('/api/channel', channelRouter) // 嶺??х몭???㉱?洹먮봿????븐뼚夷????뚮맧利???브퀗???
  app.use('/api/channel', channelRouter)
  app.use('/api/events', eventsRouter)   // ?熬곣몿???怨력???뚮맧利???븐뼚夷???브퀗???좎?????
  app.use('/api/bot', botRouter)         // ????ｋ걞???CRUD
  app.use('/api/auto-notice', autoNoticeRouter) // ???吏???ㅻ쾴?
  app.use('/api/roulette', rouletteRouter) // ?猷고?????깆젧
  app.use('/api/roulette-list', rouletteListRouter)
  app.use('/api/tamagotchi', tamagotchiRouter)
  app.use('/api/voting', votingRouter)    // ??筌?
  app.use('/api/pubg', pubgRouter)
  app.use('/api/video-donation', videoDonationRouter)
  app.use('/api/attendance', attendanceRouter)
  app.use('/api/donation-alert', donationAlertRouter)
  app.use('/api/tts-donation', ttsDonationRouter)

  initPubgTracking()

  app.get('/health', (_req, res) => res.json({ ok: true }))


  // ?筌? ????嶺뚯솘?(CHZZK CDN) ?熬곣뫁夷????Electron ????????嶺뚯쉳????筌? ????嶺뚯솘? ?β돦裕녻キ???嶺뚢뼰維????????깅쾳
  app.get('/api/proxy/image', async (req, res) => {
    const url = req.query.url as string
    if (!url) return res.status(400).end()
    try {
      const parsed = new URL(url)
      if (!/^https?:$/.test(parsed.protocol)) return res.status(400).end()
      const host = parsed.hostname.toLowerCase()
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|0\.0\.0\.0$)/.test(host)) {
        return res.status(400).end()
      }
    } catch {
      return res.status(400).end()
    }
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

  // CHZZK session status + manual reconnect
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

  // ?롪퍓???㉱??????띾?????덈콦??怨뚯씩 ??얜∥??? ?β돦裕뉛쭚?IPv4 ?낅슣???嶺뚮ㅄ維뽨빳??꾩룇瑗??
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
    restoreSessionOnStartup()
    initAutoNotices()
  })

  return { app, server, io }
}

// ?????? CHZZK ?筌뤾쑬????㉱??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

function secureGetFromStore(store: InstanceType<typeof Store>, key: string): string | null {
  const b64 = store.get(`secure_${key}`) as string | undefined
  if (b64) {
    try {
      return safeStorage.decryptString(Buffer.from(b64, 'base64'))
    } catch (e) {
      console.warn(`[Server] safeStorage decrypt failed for ${key}:`, e)
    }
  }
  // safeStorage ???덉넮 ???裕???怨몃굵 ??plain ???揶?
  return store.get(`secure_${key}_plain`) as string | null ?? null
}

function secureSetInStore(store: InstanceType<typeof Store>, key: string, value: string) {
  try {
    const enc = safeStorage.encryptString(value)
    store.set(`secure_${key}`, enc.toString('base64'))
  } catch {
    store.set(`secure_${key}_plain`, value)
  }
}

async function tryRefreshToken(): Promise<string | null> {
  const store = new Store()
  const refreshToken = secureGetFromStore(store, 'refreshToken')
  const clientId = secureGetFromStore(store, 'clientId')
  const clientSecret = secureGetFromStore(store, 'clientSecret')

  if (!refreshToken || !clientId || !clientSecret) {
    console.log('[Server] Token refresh skipped: missing refreshToken or credentials')
    return null
  }

  try {
    console.log('[Server] Refreshing access token...')
    const res = await axios.post('https://chzzk.naver.com/auth/v1/token', {
      grantType: 'refresh_token',
      clientId,
      clientSecret,
      refreshToken,
    }, { headers: { 'Content-Type': 'application/json' } })

    const d = res.data.content ?? res.data
    const newAccessToken: string = d.access_token ?? d.accessToken
    const newRefreshToken: string | undefined = d.refresh_token ?? d.refreshToken
    const expiresIn: number = d.expires_in ?? d.expiresIn ?? 3600

    if (!newAccessToken) {
      console.error('[Server] Token refresh failed: no access_token in response', res.data)
      return null
    }

    secureSetInStore(store, 'accessToken', newAccessToken)
    if (newRefreshToken) secureSetInStore(store, 'refreshToken', newRefreshToken)
    store.set('tokenExpiresAt', Date.now() + expiresIn * 1000)

    console.log('[Server] Token refreshed successfully')
    return newAccessToken
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? `HTTP ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
      : String(err)
    console.error('[Server] Token refresh API failed:', detail)
    return null
  }
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
      console.log('[Server] Session restore skipped: accessToken decrypt failed ??re-login required')
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
 * CHZZK WebSocket ??⑤슡????戮곗굚 (?β돦裕????繹먭퍓沅???auth.ts??????筌뤾쑵??
 * ?リ옇????筌뤾쑬??????깅さ嶺???袁ぢ????됱Ŧ ??戮곗굚 (??ルㅎ荑??띠룄?????戮?뱺??????
 */
export function initChzzkSession(accessToken: string, channelId: string, clientId = '', clientSecret = '') {
  if (chzzkSession) {
    chzzkSession.disconnect()
  }
  chzzkSession = new ChzzkSession(accessToken, channelId, clientId, clientSecret, io, tryRefreshToken)
  chzzkSession.connect().catch((err) => console.error('[ChzzkSession] Unhandled connect error:', err))
}

export function stopChzzkSession() {
  if (chzzkSession) {
    chzzkSession.disconnect()
    chzzkSession = null
  }
}

// ?????? ???壤???類λ룴????㉱??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????

/**
 * ??븐뼚夷?????壤???戮곗굚 (CHZZK WebSocket?? ??븐뼚夷?????繹?筌? ???곕뻣????蹂κ텢 ????
 * 30?貫?꾢퐲??嶺??х몭?API?????壤????븐뼚夷????嶺뚯빘鍮????띠룆흮?
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
