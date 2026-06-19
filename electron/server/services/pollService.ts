/**
 * [팔로우 폴링 서비스]
 *
 * CHZZK WebSocket API는 팔로우 이벤트를 실시간으로 제공하지 않는다.
 * 대신 30초마다 채널 정보 API를 호출해 팔로워 수 증가를 감지한다.
 *
 * 감지 방식:
 *   - 첫 폴링 시 현재 팔로워 수를 기준값으로 저장
 *   - 이후 폴링에서 숫자가 늘었으면 → DB 저장 + Socket.IO emit
 *   - 줄었으면 조용히 업데이트 (언팔은 이벤트 발생 안 함)
 */

import { Server as SocketIOServer } from 'socket.io'
import Store from 'electron-store'
import { getDB } from '../db/index'
import { getChannelInfo } from './chzzkApi'

const store = new Store()

export class PollService {
  private channelId: string
  private clientId: string
  private clientSecret: string
  private io: SocketIOServer
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastFollowerCount: number = -1  // -1: 아직 기준값 없음 (첫 폴링 전)
  private readonly INTERVAL = 30_000      // 30초

  // accessToken은 Client 인증으로 대체돼 불필요하지만 시그니처 호환을 위해 유지
  constructor(_accessToken: string, channelId: string, clientId: string, clientSecret: string, io: SocketIOServer) {
    this.channelId = channelId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.io = io
  }

  start() {
    // 시작하자마자 즉시 1회 폴링 (기준값 설정)
    this.poll()
    this.intervalId = setInterval(() => this.poll(), this.INTERVAL)
    console.log('[PollService] Started')
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('[PollService] Stopped')
  }

  private async poll() {
    try {
      // 채널 정보는 Client 인증 API 사용 (Bearer 아님)
      const channelInfo = await getChannelInfo(this.clientId, this.clientSecret, this.channelId)
      const followerCount: number = channelInfo?.followerCount ?? 0

      // 매 폴링마다 store 갱신 — auth/status가 항상 최신 값을 반환할 수 있도록
      store.set('followerCount', followerCount)

      // 첫 폴링: 기준값만 저장하고 이벤트는 발생시키지 않음
      // (앱 시작할 때마다 팔로우 알림 뜨는 것을 방지)
      if (this.lastFollowerCount === -1) {
        this.lastFollowerCount = followerCount
        return
      }

      if (followerCount > this.lastFollowerCount) {
        // 팔로워 증가 → DB 기록 + 실시간 알림
        const db = getDB()
        const now = new Date().toISOString()

        const stmt = db.prepare(
          `INSERT INTO follows (channel_id, follower_count, created_at) VALUES (?, ?, ?)`
        )
        const result = stmt.run(this.channelId, followerCount, now)

        const event = {
          id: result.lastInsertRowid,
          type: 'FOLLOW',
          channelId: this.channelId,
          followerCount,
          prevFollowerCount: this.lastFollowerCount, // 이전 값 (증가량 계산용)
          createdAt: now,
        }

        this.io.emit('follow', event)   // 팔로우 전용 채널
        this.io.emit('event', event)    // 통합 이벤트 채널

        console.log(`[PollService] New followers: ${this.lastFollowerCount} → ${followerCount}`)
      }

      // 증가/감소 모두 기준값 업데이트
      this.lastFollowerCount = followerCount
    } catch (err) {
      console.error('[PollService] Poll error:', err)
    }
  }
}
