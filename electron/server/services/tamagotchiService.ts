import Store from 'electron-store'
import type { Server as SocketIOServer } from 'socket.io'

export interface TamagotchiState {
  level: number
  exp: number
  expToNext: number
  cheese: number
  follows: number
  mood: number
  hunger: number
  energy: number
  stage: 'egg' | 'baby' | 'teen' | 'star'
  theme: 'classic' | 'pixel' | 'slime' | 'space'
  lastEvent?: {
    type: 'donation' | 'follow' | 'reset'
    nickname?: string
    amount?: number
    message: string
    at: string
  }
  updatedAt: string
}

const store = new Store()
const KEY = 'tamagotchiState'

function expToNext(level: number) {
  return 80 + level * 35
}

function stageFor(level: number): TamagotchiState['stage'] {
  if (level >= 12) return 'star'
  if (level >= 6) return 'teen'
  if (level >= 2) return 'baby'
  return 'egg'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function freshState(): TamagotchiState {
  const now = new Date().toISOString()
  return {
    level: 1,
    exp: 0,
    expToNext: expToNext(1),
    cheese: 0,
    follows: 0,
    mood: 65,
    hunger: 45,
    energy: 80,
    stage: 'egg',
    theme: 'classic',
    updatedAt: now,
  }
}

function normalize(raw: unknown): TamagotchiState {
  const base = freshState()
  if (!raw || typeof raw !== 'object') return base
  const state = raw as Partial<TamagotchiState>
  const level = Math.max(1, Number(state.level ?? base.level))
  return {
    ...base,
    ...state,
    level,
    exp: Math.max(0, Number(state.exp ?? base.exp)),
    expToNext: expToNext(level),
    cheese: Math.max(0, Number(state.cheese ?? base.cheese)),
    follows: Math.max(0, Number(state.follows ?? base.follows)),
    mood: clamp(Number(state.mood ?? base.mood), 0, 100),
    hunger: clamp(Number(state.hunger ?? base.hunger), 0, 100),
    energy: clamp(Number(state.energy ?? base.energy), 0, 100),
    stage: stageFor(level),
    theme: ['classic', 'pixel', 'slime', 'space'].includes(String(state.theme)) ? state.theme as TamagotchiState['theme'] : base.theme,
    updatedAt: state.updatedAt ?? base.updatedAt,
  }
}

function levelUp(state: TamagotchiState) {
  while (state.exp >= state.expToNext) {
    state.exp -= state.expToNext
    state.level += 1
    state.expToNext = expToNext(state.level)
  }
  state.stage = stageFor(state.level)
}

function save(state: TamagotchiState) {
  store.set(KEY, state)
  return state
}

export function getTamagotchiState() {
  return normalize(store.get(KEY))
}

export function resetTamagotchi(io?: SocketIOServer) {
  const prev = getTamagotchiState()
  const state = { ...freshState(), theme: prev.theme }
  state.lastEvent = {
    type: 'reset',
    message: '다마고치가 새로 태어났어요',
    at: state.updatedAt,
  }
  save(state)
  io?.emit('tamagotchi:update', state)
  return state
}

export function setTamagotchiTheme(theme: TamagotchiState['theme'], io?: SocketIOServer) {
  const state = getTamagotchiState()
  state.theme = theme
  state.updatedAt = new Date().toISOString()
  save(state)
  io?.emit('tamagotchi:update', state)
  return state
}

export function applyTamagotchiDonation(amount: number, nickname: string | undefined, io: SocketIOServer) {
  const state = getTamagotchiState()
  const safeAmount = Math.max(0, Number(amount || 0))
  const gainedExp = Math.max(5, Math.floor(safeAmount / 100))

  state.cheese += safeAmount
  state.exp += gainedExp
  state.mood = clamp(state.mood + Math.min(18, Math.ceil(safeAmount / 1000)), 0, 100)
  state.hunger = clamp(state.hunger - Math.min(10, Math.ceil(safeAmount / 3000)), 0, 100)
  state.energy = clamp(state.energy + 2, 0, 100)
  state.updatedAt = new Date().toISOString()
  state.lastEvent = {
    type: 'donation',
    nickname,
    amount: safeAmount,
    message: `${nickname || '시청자'} 님의 ${safeAmount.toLocaleString()} 치즈로 성장했어요`,
    at: state.updatedAt,
  }

  levelUp(state)
  save(state)
  io.emit('tamagotchi:update', state)
  io.emit('tamagotchi:action', { type: 'donation', amount: safeAmount, nickname, state })
  return state
}

export function applyTamagotchiFollow(nickname: string | undefined, io: SocketIOServer) {
  const state = getTamagotchiState()

  state.follows += 1
  state.exp += 25
  state.mood = clamp(state.mood + 10, 0, 100)
  state.energy = clamp(state.energy + 4, 0, 100)
  state.updatedAt = new Date().toISOString()
  state.lastEvent = {
    type: 'follow',
    nickname,
    message: `${nickname || '새 팔로워'} 님이 찾아와서 기분이 좋아졌어요`,
    at: state.updatedAt,
  }

  levelUp(state)
  save(state)
  io.emit('tamagotchi:update', state)
  io.emit('tamagotchi:action', { type: 'follow', nickname, state })
  return state
}
