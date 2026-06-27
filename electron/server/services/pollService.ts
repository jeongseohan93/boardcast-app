import { Server as SocketIOServer } from 'socket.io'
import Store from 'electron-store'
import { getDB } from '../db/index'
import { getChannelFollowers, getChannelInfo, getMyChannel } from './chzzkApi'
import { applyTamagotchiFollow } from './tamagotchiService'

const store = new Store()

interface Follower {
  channelId: string
  channelName: string
  createdDate?: string
}

type FollowEventType = 'FOLLOW' | 'UNFOLLOW'

interface FollowerDiff {
  follower_channel_id: string
  nickname: string
}

export class PollService {
  private accessToken: string
  private channelId: string
  private clientId: string
  private clientSecret: string
  private io: SocketIOServer
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isPolling = false
  private tokenMatchesChannel: boolean | null = null
  private lastCount = -1
  private readonly INTERVAL = 10_000
  private readonly PAGE_SIZE = 50

  constructor(accessToken: string, channelId: string, clientId: string, clientSecret: string, io: SocketIOServer) {
    this.accessToken = accessToken
    this.channelId = channelId
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.io = io
  }

  start() {
    void this.poll()
    this.intervalId = setInterval(() => void this.poll(), this.INTERVAL)
    console.log('[PollService] Started')
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('[PollService] Stopped')
  }

  private async getAllFollowers(): Promise<Follower[]> {
    const all: Follower[] = []
    let page = 0

    while (true) {
      const result = await getChannelFollowers(this.accessToken, { page, size: this.PAGE_SIZE })
      const batch: Follower[] = result?.data ?? []
      all.push(...batch)

      if (batch.length < this.PAGE_SIZE) break
      page += 1
    }

    return all
  }

  private saveFollowerRows(table: 'follower_list' | 'follower_list_staging', followers: Follower[]) {
    const db = getDB()
    const upsert = db.prepare(
      `INSERT OR REPLACE INTO ${table} (channel_id, follower_channel_id, nickname, followed_at) VALUES (?, ?, ?, ?)`
    )
    const now = new Date().toISOString()

    db.transaction(() => {
      db.prepare(`DELETE FROM ${table} WHERE channel_id = ?`).run(this.channelId)
      for (const follower of followers) {
        if (!follower.channelId) continue
        upsert.run(this.channelId, follower.channelId, follower.channelName, follower.createdDate ?? now)
      }
    })()

    console.log(`[PollService] ${table} saved: ${followers.length}`)
  }

  private saveFollowerList(followers: Follower[]) {
    this.saveFollowerRows('follower_list', followers)
  }

  private saveFollowerStaging(followers: Follower[]) {
    this.saveFollowerRows('follower_list_staging', followers)
  }

  private getDiffFromStaging() {
    const db = getDB()
    const newFollowers = db.prepare(`
      SELECT s.follower_channel_id, s.nickname
      FROM follower_list_staging s
      LEFT JOIN follower_list f
        ON f.channel_id = s.channel_id
       AND f.follower_channel_id = s.follower_channel_id
      WHERE s.channel_id = ?
        AND f.follower_channel_id IS NULL
    `).all(this.channelId) as FollowerDiff[]

    const removedFollowers = db.prepare(`
      SELECT f.follower_channel_id, f.nickname
      FROM follower_list f
      LEFT JOIN follower_list_staging s
        ON s.channel_id = f.channel_id
       AND s.follower_channel_id = f.follower_channel_id
      WHERE f.channel_id = ?
        AND s.follower_channel_id IS NULL
    `).all(this.channelId) as FollowerDiff[]

    return { newFollowers, removedFollowers }
  }

  private promoteStagingToFollowerList() {
    const db = getDB()

    db.transaction(() => {
      db.prepare(`DELETE FROM follower_list WHERE channel_id = ?`).run(this.channelId)
      db.prepare(`
        INSERT INTO follower_list (channel_id, follower_channel_id, nickname, followed_at)
        SELECT channel_id, follower_channel_id, nickname, followed_at
        FROM follower_list_staging
        WHERE channel_id = ?
      `).run(this.channelId)
    })()
  }

  private hasExpectedFollowerList(followers: Follower[], followerCount: number) {
    if (followers.length === followerCount) return true

    console.warn(
      `[PollService] follower list count mismatch. targetCount=${followerCount}, listCount=${followers.length}. ` +
      'Skip diff/update because the access token may belong to another channel.'
    )
    return false
  }

  private async ensureAccessTokenMatchesChannel() {
    if (this.tokenMatchesChannel !== null) return this.tokenMatchesChannel

    try {
      const me = await getMyChannel(this.accessToken)
      this.tokenMatchesChannel = me.channelId === this.channelId

      if (!this.tokenMatchesChannel) {
        console.warn(
          `[PollService] accessToken channel mismatch. tokenChannelId=${me.channelId}, targetChannelId=${this.channelId}. ` +
          'Skip follower-list polling to avoid checking the wrong channel.'
        )
      }

      return this.tokenMatchesChannel
    } catch (error) {
      this.tokenMatchesChannel = false
      console.error('[PollService] failed to verify accessToken channel:', error)
      return false
    }
  }

  private insertFollowEvent(
    type: FollowEventType,
    targetChannelId: string | null,
    nickname: string | null,
    followerCount: number,
    createdAt: string
  ) {
    const db = getDB()
    let rowId: number | bigint = Date.now()
    let removedUnfollowCount = 0

    try {
      if (type === 'FOLLOW' && targetChannelId) {
        const deleted = db.prepare(`
          DELETE FROM follows
          WHERE channel_id = ?
            AND event_type = 'UNFOLLOW'
            AND target_channel_id = ?
        `).run(this.channelId, targetChannelId)
        removedUnfollowCount = deleted.changes
      }

      const row = db.prepare(
        `INSERT INTO follows (channel_id, event_type, target_channel_id, nickname, follower_count, created_at) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(this.channelId, type, targetChannelId, nickname, followerCount, createdAt)
      rowId = row.lastInsertRowid
    } catch (error) {
      console.error(`[PollService] follows INSERT(${type}) error:`, error)
    }

    const event = {
      id: rowId,
      type,
      channelId: this.channelId,
      targetChannelId: targetChannelId ?? undefined,
      nickname: nickname ?? undefined,
      followerCount,
      createdAt,
      removedUnfollowCount,
    }

    this.io.emit(type === 'FOLLOW' ? 'follow' : 'unfollow', event)
    this.io.emit('event', event)
    if (type === 'FOLLOW') {
      applyTamagotchiFollow(nickname ?? undefined, this.io)
    }
    return event
  }

  private emitCountOnlyEvent(type: FollowEventType, followerCount: number, createdAt: string) {
    const event = this.insertFollowEvent(type, null, null, followerCount, createdAt)
    console.log(`[PollService] ${type}: count-only event (total=${followerCount})`)
    return event
  }

  private async poll() {
    if (this.isPolling) return
    this.isPolling = true

    try {
      const tokenOk = await this.ensureAccessTokenMatchesChannel()
      if (!tokenOk) return

      const channelInfo = await getChannelInfo(this.clientId, this.clientSecret, this.channelId)
      const followerCount = channelInfo?.followerCount ?? 0
      store.set('followerCount', followerCount)

      if (this.lastCount === -1) {
        const followers = await this.getAllFollowers()
        if (!this.hasExpectedFollowerList(followers, followerCount)) return
        this.saveFollowerList(followers)
        this.lastCount = followerCount
        console.log(`[PollService] Baseline: count=${followerCount}, saved=${followers.length}`)
        return
      }

      const delta = followerCount - this.lastCount
      console.log(`[PollService] poll: ${this.lastCount} -> ${followerCount} (delta=${delta})`)

      if (delta === 0) {
        this.lastCount = followerCount
        return
      }

      let currentFollowers: Follower[] | null = null
      try {
        currentFollowers = await this.getAllFollowers()
      } catch (error) {
        const now = new Date().toISOString()
        this.emitCountOnlyEvent(delta > 0 ? 'FOLLOW' : 'UNFOLLOW', followerCount, now)
        this.lastCount = followerCount
        console.error('[PollService] follower list fetch failed; emitted count-only event:', error)
        return
      }

      if (!this.hasExpectedFollowerList(currentFollowers, followerCount)) return

      this.saveFollowerStaging(currentFollowers)
      const { newFollowers, removedFollowers } = this.getDiffFromStaging()
      const now = new Date().toISOString()

      console.log(`[PollService] diff: follow=${newFollowers.length}, unfollow=${removedFollowers.length}`)

      for (const follower of newFollowers) {
        this.insertFollowEvent('FOLLOW', follower.follower_channel_id, follower.nickname, followerCount, now)
        console.log(`[PollService] Follow: ${follower.nickname} (total=${followerCount})`)
      }

      for (const follower of removedFollowers) {
        this.insertFollowEvent('UNFOLLOW', follower.follower_channel_id, follower.nickname, followerCount, now)
        console.log(`[PollService] Unfollow: ${follower.nickname} (total=${followerCount})`)
      }

      if (newFollowers.length === 0 && removedFollowers.length === 0) {
        this.emitCountOnlyEvent(delta > 0 ? 'FOLLOW' : 'UNFOLLOW', followerCount, now)
      }

      this.promoteStagingToFollowerList()
      this.lastCount = followerCount
    } catch (error) {
      console.error('[PollService] Poll error:', error)
    } finally {
      this.isPolling = false
    }
  }
}
