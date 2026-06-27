import Store from 'electron-store'
import { Server as SocketIOServer } from 'socket.io'

const store = new Store()

export interface VideoDonationConfig {
  enabled: boolean
  minAmount: number
  autoPlay: boolean
  maxSeconds: number
}

export interface VideoDonationItem {
  id: string
  nickname: string
  amount: number
  message: string
  url: string
  videoId: string
  status: 'pending' | 'playing' | 'played' | 'rejected'
  createdAt: string
  startedAt?: string
}

const DEFAULT_CONFIG: VideoDonationConfig = {
  enabled: true,
  minAmount: 0,
  autoPlay: false,
  maxSeconds: 90,
}

let stopTimer: ReturnType<typeof setTimeout> | null = null

export function getVideoDonationConfig(): VideoDonationConfig {
  return { ...DEFAULT_CONFIG, ...((store.get('videoDonationConfig') as Partial<VideoDonationConfig>) || {}) }
}

export function saveVideoDonationConfig(config: Partial<VideoDonationConfig>) {
  const next = { ...getVideoDonationConfig(), ...config }
  store.set('videoDonationConfig', next)
  return next
}

export function getVideoDonationQueue(): VideoDonationItem[] {
  return (store.get('videoDonationQueue') as VideoDonationItem[]) || []
}

function saveQueue(queue: VideoDonationItem[]) {
  store.set('videoDonationQueue', queue.slice(0, 100))
}

export function extractYouTubeVideo(input?: string): { url: string; videoId: string } | null {
  const text = String(input || '')
  const match = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^ \n]*v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})[^ \n]*/i)
  if (!match) return null
  return {
    url: match[0],
    videoId: match[1],
  }
}

export function isCurrentlyPlaying(): boolean {
  return getVideoDonationQueue().some((item) => item.status === 'playing')
}

export function addVideoDonation(input: {
  nickname: string
  amount: number
  message?: string
  donationType?: string
}) {
  const config = getVideoDonationConfig()
  const found = extractYouTubeVideo(input.message)
  if (!config.enabled || input.amount < config.minAmount || !found) return null

  const item: VideoDonationItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nickname: input.nickname || 'unknown',
    amount: input.amount || 0,
    message: input.message || '',
    url: found.url,
    videoId: found.videoId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  const queue = [item, ...getVideoDonationQueue()]
  saveQueue(queue)
  return item
}

export function setVideoDonationStatus(id: string, status: VideoDonationItem['status']) {
  const queue = getVideoDonationQueue()
  const next = queue.map((item) => (
    item.id === id ? { ...item, status, startedAt: status === 'playing' ? new Date().toISOString() : item.startedAt } : item
  ))
  saveQueue(next)
  return next.find((item) => item.id === id) || null
}

export function clearPlayedVideoDonations() {
  const next = getVideoDonationQueue().filter((item) => item.status === 'pending' || item.status === 'playing')
  saveQueue(next)
  return next
}

export function playVideoDonation(io: SocketIOServer, id?: string) {
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }

  let queue = getVideoDonationQueue()
  const current = queue.find((item) => item.status === 'playing')
  if (current) {
    queue = queue.map((item) => item.id === current.id ? { ...item, status: 'played' } : item)
    saveQueue(queue)
  }

  const target = id
    ? queue.find((item) => item.id === id)
    : [...queue].reverse().find((item) => item.status === 'pending')

  if (!target) {
    io.emit('videoDonation:stop')
    io.emit('videoDonation:queue', getVideoDonationQueue())
    return null
  }

  const playing = setVideoDonationStatus(target.id, 'playing')
  if (!playing) return null

  io.emit('videoDonation:play', {
    ...playing,
    maxSeconds: getVideoDonationConfig().maxSeconds,
  })
  io.emit('videoDonation:queue', getVideoDonationQueue())

  const maxMs = Math.max(5, getVideoDonationConfig().maxSeconds) * 1000
  stopTimer = setTimeout(() => {
    setVideoDonationStatus(playing.id, 'played')
    stopTimer = null
    if (getVideoDonationConfig().autoPlay) {
      playVideoDonation(io)
    } else {
      io.emit('videoDonation:stop')
      io.emit('videoDonation:queue', getVideoDonationQueue())
    }
  }, maxMs)

  return playing
}

export function stopVideoDonation(io: SocketIOServer) {
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  const queue = getVideoDonationQueue().map((item) => (
    item.status === 'playing' ? { ...item, status: 'played' as const } : item
  ))
  saveQueue(queue)
  io.emit('videoDonation:stop')
  io.emit('videoDonation:queue', queue)
  return queue
}
