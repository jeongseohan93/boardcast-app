import { Router } from 'express'
import axios from 'axios'
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { io } from '../index'

const router = Router()
const store = new Store()

const PUBG_API = 'https://api.pubg.com/shards'
const PLATFORMS = new Set(['steam', 'kakao', 'psn', 'xbox'])

function secureGet(key: string): string | null {
  try {
    const b64 = store.get(`secure_${key}`) as string | undefined
    if (!b64) return store.get(`secure_${key}_plain`) as string | null ?? null
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return store.get(`secure_${key}_plain`) as string | null ?? null
  }
}

function secureSet(key: string, value: string) {
  try {
    const enc = safeStorage.encryptString(value)
    store.set(`secure_${key}`, enc.toString('base64'))
    store.delete(`secure_${key}_plain`)
  } catch {
    store.set(`secure_${key}_plain`, value)
  }
}

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/vnd.api+json',
  }
}

function normalizePlatform(value: unknown) {
  const platform = String(value || 'steam').toLowerCase()
  return PLATFORMS.has(platform) ? platform : 'steam'
}

function currentSeasonId(seasons: any): string | null {
  const rows = Array.isArray(seasons?.data) ? seasons.data : []
  return rows.find((row: any) => row?.attributes?.isCurrentSeason)?.id
    ?? rows.find((row: any) => !row?.attributes?.isOffseason)?.id
    ?? rows[0]?.id
    ?? null
}

function summarizeMatch(match: any, accountId: string) {
  const included = Array.isArray(match?.included) ? match.included : []
  const participants = included.filter((row: any) => row?.type === 'participant')
  const participant = included.find((row: any) =>
    row?.type === 'participant' && row?.attributes?.stats?.playerId === accountId
  )
  const participantId = participant?.id
  const roster = included.find((row: any) =>
    row?.type === 'roster'
    && Array.isArray(row?.relationships?.participants?.data)
    && row.relationships.participants.data.some((p: any) => p?.id === participantId)
  )
  const stats = participant?.attributes?.stats ?? {}
  const rosterParticipantIds = new Set(
    (roster?.relationships?.participants?.data ?? [])
      .map((p: any) => p?.id)
      .filter(Boolean)
  )
  const teammates = participants
    .filter((row: any) => rosterParticipantIds.has(row?.id))
    .map((row: any) => {
      const rowStats = row?.attributes?.stats ?? {}
      return {
        id: row?.id,
        playerId: rowStats.playerId,
        name: rowStats.name,
        isSearchedPlayer: rowStats.playerId === accountId,
        kills: rowStats.kills ?? 0,
        assists: rowStats.assists ?? 0,
        damageDealt: rowStats.damageDealt ?? 0,
        headshotKills: rowStats.headshotKills ?? 0,
        longestKill: rowStats.longestKill ?? 0,
        timeSurvived: rowStats.timeSurvived ?? 0,
        deathType: rowStats.deathType,
      }
    })

  return {
    id: match?.data?.id,
    createdAt: match?.data?.attributes?.createdAt,
    duration: match?.data?.attributes?.duration,
    gameMode: match?.data?.attributes?.gameMode,
    mapName: match?.data?.attributes?.mapName,
    matchType: match?.data?.attributes?.matchType,
    rank: roster?.attributes?.stats?.rank ?? stats.winPlace,
    teamId: roster?.attributes?.stats?.teamId,
    won: roster?.attributes?.won === 'true',
    kills: stats.kills ?? 0,
    assists: stats.assists ?? 0,
    damageDealt: stats.damageDealt ?? 0,
    headshotKills: stats.headshotKills ?? 0,
    longestKill: stats.longestKill ?? 0,
    timeSurvived: stats.timeSurvived ?? 0,
    deathType: stats.deathType,
    teammates,
  }
}

// ── PUBG 딜 추적 ──────────────────────────────────────────────────────────────

interface PubgTrackingConfig {
  name: string
  platform: string
  accountId?: string
  listItemId: string
  enabled: boolean
  includeTeamDamage: boolean   // 팀원 딜 합산 여부
  processedMatchIds: string[]
  lastPolledAt?: string
  lastError?: string
  lastApplied?: { matchId: string; damage: number; teamDamage?: number; appliedAt: string; gameMode?: string }
}

let pollTimer: ReturnType<typeof setInterval> | null = null

function getTracking(): PubgTrackingConfig {
  const saved = (store.get('pubgTracking') as Partial<PubgTrackingConfig>) || {}
  return {
    name: saved.name ?? '',
    platform: saved.platform ?? 'steam',
    listItemId: saved.listItemId ?? '',
    enabled: saved.enabled ?? false,
    includeTeamDamage: saved.includeTeamDamage ?? false,
    processedMatchIds: saved.processedMatchIds ?? [],
    accountId: saved.accountId,
    lastPolledAt: saved.lastPolledAt,
    lastError: saved.lastError,
    lastApplied: saved.lastApplied,
  }
}

function saveTracking(config: PubgTrackingConfig) {
  store.set('pubgTracking', config)
}

async function doPoll() {
  const config = getTracking()
  if (!config.enabled || !config.name || !config.listItemId) return

  const apiKey = secureGet('pubgApiKey')
  if (!apiKey) return

  const platform = normalizePlatform(config.platform)
  const client = axios.create({
    baseURL: `${PUBG_API}/${platform}`,
    timeout: 15000,
    headers: getHeaders(apiKey),
  })

  try {
    const playerRes = await client.get('/players', { params: { 'filter[playerNames]': config.name } })
    const player = Array.isArray(playerRes.data?.data) ? playerRes.data.data[0] : null
    if (!player) {
      saveTracking({ ...config, lastError: '플레이어를 찾을 수 없음', lastPolledAt: new Date().toISOString() })
      return
    }

    const accountId = player.id
    const recentMatchIds: string[] = (player.relationships?.matches?.data ?? []).map((m: any) => m.id)
    const processed = new Set(config.processedMatchIds || [])
    const newIds = recentMatchIds.filter(id => !processed.has(id)).slice(0, 5)

    let updatedConfig: PubgTrackingConfig = { ...config, accountId, lastPolledAt: new Date().toISOString(), lastError: undefined }

    if (newIds.length > 0) {
      const { applyDelta } = require('./rouletteList')
      let updatedProcessedIds = [...(config.processedMatchIds || [])]

      for (const matchId of newIds) {
        try {
          const matchRes = await client.get(`/matches/${matchId}`)
          const match = summarizeMatch(matchRes.data, accountId)
          const myDamage = Math.round(match.damageDealt ?? 0)

          // 팀원 딜 합산 (본인 제외)
          const teamDamage = config.includeTeamDamage
            ? (match.teammates ?? [])
                .filter((t: any) => !t.isSearchedPlayer)
                .reduce((sum: number, t: any) => sum + Math.round(t.damageDealt ?? 0), 0)
            : 0

          const totalDamage = myDamage + teamDamage

          if (totalDamage > 0) {
            const label = config.includeTeamDamage ? 'PUBG 팀딜' : 'PUBG 딜'
            const result = applyDelta(config.listItemId, -totalDamage, label)
            if (result) {
              try { io?.emit('rouletteList:update', result) } catch {}
              updatedConfig.lastApplied = {
                matchId,
                damage: myDamage,
                ...(config.includeTeamDamage ? { teamDamage } : {}),
                appliedAt: new Date().toISOString(),
                gameMode: match.gameMode,
              }
            }
          }
        } catch {}

        updatedProcessedIds.push(matchId)
        if (updatedProcessedIds.length > 100) updatedProcessedIds = updatedProcessedIds.slice(-100)
      }

      updatedConfig.processedMatchIds = updatedProcessedIds
    }

    saveTracking(updatedConfig)
  } catch (err: any) {
    const msg = err?.response?.data?.errors?.[0]?.detail || err?.message || '알 수 없는 오류'
    saveTracking({ ...config, lastPolledAt: new Date().toISOString(), lastError: msg })
  }
}

export function initPubgTracking() {
  const config = getTracking()
  if (config.enabled) {
    pollTimer = setInterval(doPoll, 5 * 60 * 1000)
  }
}

router.get('/tracking', (_req, res) => {
  res.json(getTracking())
})

router.post('/tracking', async (req, res) => {
  const { name, platform, listItemId, enabled, includeTeamDamage } = req.body
  const config = getTracking()
  const wasEnabled = config.enabled

  const next: PubgTrackingConfig = {
    ...config,
    ...(typeof name === 'string' ? { name: name.trim() } : {}),
    ...(platform !== undefined ? { platform: normalizePlatform(platform) } : {}),
    ...(typeof listItemId === 'string' ? { listItemId } : {}),
    ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
    ...(includeTeamDamage !== undefined ? { includeTeamDamage: Boolean(includeTeamDamage) } : {}),
  }

  // 활성화 시: 현재 경기들을 처리 완료로 표시 (소급 차감 방지)
  if (!wasEnabled && next.enabled && next.name) {
    try {
      const apiKey = secureGet('pubgApiKey')
      if (apiKey) {
        const plt = normalizePlatform(next.platform)
        const client = axios.create({ baseURL: `${PUBG_API}/${plt}`, timeout: 12000, headers: getHeaders(apiKey) })
        const playerRes = await client.get('/players', { params: { 'filter[playerNames]': next.name } })
        const player = Array.isArray(playerRes.data?.data) ? playerRes.data.data[0] : null
        if (player) {
          const currentIds: string[] = (player.relationships?.matches?.data ?? []).map((m: any) => m.id)
          const existing = new Set(next.processedMatchIds)
          currentIds.slice(0, 50).forEach(id => existing.add(id))
          next.processedMatchIds = [...existing].slice(-100)
          next.accountId = player.id
        }
      }
    } catch {}
  }

  saveTracking(next)

  if (next.enabled) {
    if (pollTimer) clearInterval(pollTimer)
    doPoll()
    pollTimer = setInterval(doPoll, 5 * 60 * 1000)
  } else {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  }

  res.json(next)
})

// 수동 폴링 트리거
router.post('/tracking/poll', async (_req, res) => {
  await doPoll()
  res.json(getTracking())
})

// ── API 키 설정 ───────────────────────────────────────────────────────────────

router.get('/settings', (_req, res) => {
  res.json({ hasApiKey: Boolean(secureGet('pubgApiKey')) })
})

router.post('/settings', (req, res) => {
  const apiKey = String(req.body?.apiKey || '').trim()
  if (!apiKey) return res.status(400).json({ error: 'API key is required' })
  secureSet('pubgApiKey', apiKey)
  res.json({ ok: true, hasApiKey: true })
})

router.get('/player', async (req, res) => {
  const apiKey = secureGet('pubgApiKey')
  if (!apiKey) return res.status(428).json({ error: 'PUBG API key is required' })

  const platform = normalizePlatform(req.query.platform)
  const name = String(req.query.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Player name is required' })

  try {
    const client = axios.create({
      baseURL: `${PUBG_API}/${platform}`,
      timeout: 12000,
      headers: getHeaders(apiKey),
    })

    const [playerRes, seasonsRes] = await Promise.all([
      client.get('/players', { params: { 'filter[playerNames]': name } }),
      client.get('/seasons'),
    ])

    const player = Array.isArray(playerRes.data?.data) ? playerRes.data.data[0] : null
    if (!player) return res.status(404).json({ error: 'Player not found' })

    const seasonId = currentSeasonId(seasonsRes.data)
    const accountId = player.id
    const recentMatches = player.relationships?.matches?.data ?? []

    const [lifetimeRes, rankedRes] = await Promise.all([
      client.get(`/players/${accountId}/seasons/lifetime`).catch((err) => ({ data: null, error: err })),
      seasonId
        ? client.get(`/players/${accountId}/seasons/${seasonId}/ranked`).catch((err) => ({ data: null, error: err }))
        : Promise.resolve({ data: null }),
    ])

    const recentMatchDetails = await Promise.all(
      recentMatches.slice(0, 10).map((match: any) =>
        client.get(`/matches/${match.id}`)
          .then((matchRes) => summarizeMatch(matchRes.data, accountId))
          .catch(() => null)
      )
    )

    res.json({
      platform,
      player,
      currentSeasonId: seasonId,
      recentMatches: recentMatches.slice(0, 14),
      recentMatchDetails: recentMatchDetails.filter(Boolean),
      lifetime: lifetimeRes.data,
      ranked: rankedRes.data,
    })
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      return res.status(err.response?.status || 500).json({
        error: err.response?.data?.errors?.[0]?.detail || err.response?.data?.error || err.message,
      })
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
