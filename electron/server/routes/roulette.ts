import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import Store from 'electron-store'
import { io } from '../index'

const router = express.Router()
const store = new Store()

const SPIN_IDS_STORE_KEY = 'processedSpinIds'
const MAX_SPIN_IDS = 500

const processedSpinIds = new Set<string>(
  (store.get(SPIN_IDS_STORE_KEY) as string[] | undefined) || []
)

let testAffectsList = (store.get('testAffectsList') as boolean) ?? false

export interface RouletteItem {
  id: string
  label: string
  weight: number
}

export interface RouletteConfig {
  id: string
  name: string
  enabled: boolean
  triggerAmounts: number[]
  items: RouletteItem[]
  theme: string
  mode: 'wheel' | 'slot'
  listItemId?: string   // 연결된 룰렛 리스트 항목 ID
}

function normalizeRoulette(raw: Partial<RouletteConfig>, existingId?: string): RouletteConfig {
  return {
    id: existingId || raw.id || uuidv4(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 30) : '룰렛',
    enabled: !!raw.enabled,
    triggerAmounts: Array.isArray(raw.triggerAmounts)
      ? raw.triggerAmounts.map(Number).filter(n => n > 0)
      : [],
    items: Array.isArray(raw.items) ? raw.items : [],
    theme: typeof raw.theme === 'string' ? raw.theme : 'default',
    mode: raw.mode === 'slot' ? 'slot' : 'wheel',
    listItemId: typeof raw.listItemId === 'string' && raw.listItemId ? raw.listItemId : undefined,
  }
}

export function rememberSpinId(spinId: string) {
  processedSpinIds.add(spinId)
  if (processedSpinIds.size > MAX_SPIN_IDS) {
    const first = processedSpinIds.values().next().value as string | undefined
    if (first) processedSpinIds.delete(first)
  }
  store.set(SPIN_IDS_STORE_KEY, Array.from(processedSpinIds))
}

// ── 공개 헬퍼 ─────────────────────────────────────────────────────────────────
let migrated = false

export function getRoulettes(): RouletteConfig[] {
  if (!migrated) {
    migrated = true
    // 기존 단일 rouletteConfig → 배열 마이그레이션
    const legacy = store.get('rouletteConfig') as Partial<RouletteConfig> | undefined
    if (legacy) {
      const existing = (store.get('roulettes') as RouletteConfig[]) || []
      if (existing.length === 0) {
        store.set('roulettes', [normalizeRoulette({ ...legacy, id: uuidv4(), name: '기본 룰렛' })])
      }
      store.delete('rouletteConfig')
    }
  }
  return (store.get('roulettes') as RouletteConfig[]) || []
}

function saveRoulettes(roulettes: RouletteConfig[]) {
  store.set('roulettes', roulettes)
}

// ── 라우터 ────────────────────────────────────────────────────────────────────

router.get('/', (_req, res) => {
  res.json(getRoulettes())
})

router.post('/', (req, res) => {
  const roulettes = getRoulettes()
  const created = normalizeRoulette({ ...req.body, id: uuidv4() })
  roulettes.push(created)
  saveRoulettes(roulettes)
  res.json(created)
})

router.get('/test-list', (_req, res) => {
  res.json({ testAffectsList })
})

router.post('/test-list', (req, res) => {
  testAffectsList = !!req.body.enabled
  store.set('testAffectsList', testAffectsList)
  res.json({ testAffectsList })
})

router.get('/:id', (req, res) => {
  const roulette = getRoulettes().find(r => r.id === req.params.id)
  if (!roulette) return res.status(404).json({ error: 'Not found' })
  return res.json(roulette)
})

router.put('/:id', (req, res) => {
  const roulettes = getRoulettes()
  const idx = roulettes.findIndex(r => r.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })

  const prev = roulettes[idx]
  roulettes[idx] = normalizeRoulette({ ...prev, ...req.body }, prev.id)
  saveRoulettes(roulettes)

  try { io?.emit('roulette:config', { id: roulettes[idx].id, theme: roulettes[idx].theme, mode: roulettes[idx].mode }) } catch {}
  return res.json(roulettes[idx])
})

router.delete('/:id', (req, res) => {
  const roulettes = getRoulettes()
  const filtered = roulettes.filter(r => r.id !== req.params.id)
  if (filtered.length === roulettes.length) return res.status(404).json({ error: 'Not found' })
  saveRoulettes(filtered)
  return res.json({ ok: true })
})

// 룰렛 결과 처리 → 연결된 리스트 항목 업데이트
router.post('/result', async (req, res) => {
  const { spinId, rouletteId, winner, donation } = req.body as {
    spinId?: string
    rouletteId?: string
    winner?: Partial<RouletteItem>
    donation?: { nickname?: string }
  }

  if (!spinId) return res.status(400).json({ error: 'spinId required' })
  if (processedSpinIds.has(spinId)) return res.json({ ok: true, duplicate: true })

  rememberSpinId(spinId)

  if (spinId.startsWith('test-') && !testAffectsList) {
    return res.json({ ok: true, skipped: true, test: true })
  }

  const roulettes = getRoulettes()
  const roulette = rouletteId
    ? roulettes.find(r => r.id === rouletteId)
    : roulettes.find(r => r.enabled)

  if (!roulette?.listItemId || !winner?.label) {
    return res.json({ ok: true, skipped: true })
  }

  // 연결된 리스트 항목 업데이트는 rouletteList 라우터가 담당
  const { applyRouletteResult } = require('./rouletteList')
  const result = applyRouletteResult(roulette.listItemId, winner.label, donation?.nickname)

  try {
    io?.emit('rouletteList:update', result)
  } catch {}

  return res.json({ ok: true, result })
})

export default router
