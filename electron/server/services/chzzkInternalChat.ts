/**
 * 치지직 내부 채팅 WebSocket 연결
 *
 * 공식 오픈 API(openapi.chzzk.naver.com)가 아닌,
 * 치지직 웹앱이 실제로 사용하는 내부 WebSocket(kr-ss*.chat.naver.com)에 직접 연결한다.
 * 오픈 API에 없는 미션 이벤트(donationType: "MISSION")를 수신하기 위해 사용.
 *
 * 연결 흐름:
 *   1. chatChannelId → serverId 계산 (charCode 합산 % 9 + 1)
 *   2. comm-api.game.naver.com 에서 익명 access token 발급
 *      (NID 쿠키 있으면 인증 토큰, 없으면 READ 전용 게스트 토큰)
 *   3. wss://kr-ss{n}.chat.naver.com/chat 에 WebSocket 연결
 *   4. cmd:100 CONNECT 패킷 전송
 *   5. cmd:93102 DONATION 이벤트에서 donationType "MISSION" 파싱
 */

import axios from 'axios'
import { missionSuccessFromStatus, normalizeMissionStatus } from './missionStatus'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WS = require('ws') as typeof import('ws').WebSocket

const CMD = {
  PING:      0,
  PONG:      10000,
  CONNECT:   100,
  CONNECTED: 10100,
  DONATION:  93102,
  EVENT:     93006,
}

export interface MissionDonation {
  missionDonationId: string
  missionText: string
  status: string          // PENDING | APPROVED | REJECTED | EXPIRED | SUCCESS | FAIL
  success: boolean
  durationTime?: number
  missionCreatedTime?: string
  missionEndTime?: string
  payAmount: number
  donatorNickname: string
  donatorChannelId?: string
}

// chatChannelId 문자코드 합산 % 9 + 1 → 1~9 서버 번호
function getServerId(chatChannelId: string): number {
  let sum = 0
  for (const ch of chatChannelId) sum += ch.charCodeAt(0)
  return (Math.abs(sum) % 9) + 1
}

function safeJson(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, unknown>
  try { return JSON.parse(String(value)) } catch { return {} }
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

function toInt(value: unknown): number {
  const parsed = parseInt(String(value ?? '0').replace(/[^\d-]/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeInternalMissionStatus(
  value: unknown,
  options: { finalStatus?: boolean } = {},
): ReturnType<typeof normalizeMissionStatus> {
  const rawStatus = String(value ?? '').trim().toUpperCase()
  const normalized = normalizeMissionStatus(rawStatus)

  // The internal chat socket reports mission accept/action success as SUCCESS
  // while CHZZK still leaves final success/fail buttons available.
  if (!options.finalStatus && normalized === 'SUCCESS' && rawStatus === 'SUCCESS') return 'APPROVED'
  return normalized
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

// NID 쿠키 없이도 READ 전용 토큰 발급 가능 (일반 방송)
// NID 쿠키 있으면 인증 토큰으로 업그레이드 (19+ 방송도 가능)
async function getAccessToken(
  chatChannelId: string,
  nidAuth?: string,
  nidSession?: string,
): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }
  if (nidAuth && nidSession) {
    headers['Cookie'] = `NID_AUT=${nidAuth}; NID_SES=${nidSession}`
  }

  const res = await axios.get('https://comm-api.game.naver.com/nng_main/v1/chats/access-token', {
    params: { channelId: chatChannelId, chatType: 'STREAMING' },
    headers,
    timeout: 8000,
  })
  return res.data?.content?.accessToken ?? ''
}

// Electron session 에서 NID 쿠키 추출 (main 프로세스에서만 가능)
async function getNidFromElectron(): Promise<{ nidAuth: string; nidSession: string } | null> {
  try {
    const { session } = await import('electron')
    const cookies = await session.defaultSession.cookies.get({ domain: '.naver.com' })
    const nidAuth    = cookies.find(c => c.name === 'NID_AUT')?.value
    const nidSession = cookies.find(c => c.name === 'NID_SES')?.value
    if (nidAuth && nidSession) return { nidAuth, nidSession }
  } catch {}
  return null
}

export class ChzzkInternalChat {
  private ws: InstanceType<typeof WS> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  constructor(
    private chatChannelId: string,
    private onMission: (data: MissionDonation) => void,
    private onRawDonation?: (raw: unknown) => void,
  ) {}

  async connect() {
    if (this.destroyed) return

    const nid = await getNidFromElectron()
    let accessToken = ''
    try {
      accessToken = await getAccessToken(this.chatChannelId, nid?.nidAuth, nid?.nidSession)
    } catch (err) {
      console.error('[InternalChat] access token 발급 실패:', err)
    }

    const serverId = getServerId(this.chatChannelId)
    const url = `wss://kr-ss${serverId}.chat.naver.com/chat`
    console.log(`[InternalChat] 연결 시도: ${url} | NID: ${nid ? 'O' : 'X'} | token: ${accessToken ? 'O' : 'X'}`)

    const ws = new WS(url)
    this.ws = ws

    ws.on('open', () => {
      console.log('[InternalChat] WebSocket 연결됨, CONNECT 패킷 전송')
      ws.send(JSON.stringify({
        bdy: {
          accTkn: accessToken,
          auth: 'READ',
          devType: 2001,
          uid: null,
        },
        cmd: CMD.CONNECT,
        tid: 1,
        cid: this.chatChannelId,
        svcid: 'game',
        ver: '2',
      }))

      // 서버 PING에 응답하거나 20초마다 직접 PING
      this.pingTimer = setInterval(() => {
        if (ws.readyState === WS.OPEN) {
          ws.send(JSON.stringify({ cmd: CMD.PING, ver: '2' }))
        }
      }, 20000)
    })

    ws.on('message', (raw: Buffer) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }

      const cmd = msg.cmd as number

      // PONG 응답
      if (cmd === CMD.PING) {
        ws.send(JSON.stringify({ cmd: CMD.PONG, ver: '2' }))
        return
      }

      if (cmd === CMD.CONNECTED) {
        console.log('[InternalChat] CONNECTED 확인')
        return
      }

      if (cmd === CMD.PONG) return

      // cmd 번호와 상관없이 bdy 안에 있는 모든 항목을 처리
      // (내부 API에서 어떤 cmd로 후원/미션이 오는지 확인하기 위해 전체 수신)
      const items = Array.isArray(msg.bdy) ? msg.bdy : (msg.bdy ? [msg.bdy] : [])

      for (const item of items as Record<string, unknown>[]) {
        const extras = safeJson(item.extras)
        const msgTypeCode = item.msgTypeCode as number | undefined

        // 텍스트 채팅(msgTypeCode 1)은 디버그에서 제외, 나머지(후원/구독/미션 등)는 전달
        const isPlainText = msgTypeCode === 1 && !extras.donationType
        if (!isPlainText && this.onRawDonation) {
          this.onRawDonation({ _cmd: cmd, ...item })
        }

        // 미션 이벤트 파싱. 결과/정산 쪽 이벤트가 donationType 없이 올 수도 있어서
        // missionDonationId/missionText 계열 키가 있으면 미션으로 본다.
        const donationType = String(extras.donationType ?? '').toUpperCase()
        const hasMissionShape = Boolean(
          donationType === 'MISSION' ||
          extras.missionDonationId ||
          extras.missionText ||
          extras.missionStatus ||
          extras.missionType,
        )
        if (!hasMissionShape) continue

        const profile = safeJson(item.profile ?? item.serviceProfile)
        const missionStatusValue =
          extras.missionStatus ??
          extras.mission_status ??
          extras.missionState ??
          extras.mission_state ??
          item.missionStatus ??
          item.mission_status
        const hasFinalStatus = hasValue(missionStatusValue)
        const status = normalizeInternalMissionStatus(
          hasFinalStatus ? missionStatusValue : (extras.status ?? item.status),
          { finalStatus: hasFinalStatus },
        )
        const payAmount = toInt(extras.payAmount ?? item.payAmount ?? item.msg)

        const mission: MissionDonation = {
          missionDonationId: firstString(
            extras.missionDonationId,
            extras.donationId,
            extras.missionId,
            item.id,
            item.msgId,
          ),
          missionText:        firstString(extras.missionText, extras.title, extras.content),
          status,
          success:            missionSuccessFromStatus(status, extras.success),
          durationTime:       toInt(extras.durationTime) || undefined,
          missionCreatedTime: firstString(extras.missionCreatedTime, extras.createdAt) || undefined,
          missionEndTime:     firstString(extras.missionEndTime, extras.endAt) || undefined,
          payAmount,
          donatorNickname:    firstString(profile.nickname, item.nick, item.nickname, item.uid, 'unknown'),
          donatorChannelId:   firstString(item.uid, extras.donatorChannelId),
        }

        if (!mission.missionDonationId) {
          console.log('[InternalChat] MISSION skipped: missing missionDonationId', { _cmd: cmd, extras, item })
          continue
        }

        console.log('[InternalChat] MISSION event:', {
          ...mission,
          rawStatus: extras.status ?? item.status ?? null,
          rawMissionStatus: missionStatusValue ?? null,
        })
        this.onMission(mission)
      }
    })

    ws.on('close', (code: number) => {
      console.log(`[InternalChat] WebSocket 종료 (code: ${code}), 5초 후 재연결`)
      this.cleanup()
      if (!this.destroyed) {
        this.reconnectTimer = setTimeout(() => this.connect(), 5000)
      }
    })

    ws.on('error', (err: Error) => {
      console.error('[InternalChat] WebSocket 오류:', err.message)
    })
  }

  private cleanup() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null }
  }

  destroy() {
    this.destroyed = true
    this.cleanup()
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    this.ws?.close()
    this.ws = null
  }
}
