import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import Store from 'electron-store'
import { io } from '../index'

const router = Router()
const store = new Store()

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface RouletteListEntry {
  label: string   // 항목 이름 (예: "차 타지 않기")
  count: number   // 등장 횟수
  value: number   // count 타입일 때는 count와 동일, numeric 타입일 때는 누적합
}

export interface RouletteListItem {
  id: string
  name: string                   // 리스트 이름 (예: "딜", "방해")
  type: 'numeric' | 'count'     // numeric: 숫자 누적, count: 항목 횟수
  total: number                  // numeric 타입의 누적 합계 (또는 count 타입의 전체 횟수)
  entries: RouletteListEntry[]   // count 타입의 항목별 집계
}

// ── 스토어 헬퍼 ───────────────────────────────────────────────────────────────

export function getRouletteListItems(): RouletteListItem[] {
  return (store.get('rouletteListItems') as RouletteListItem[]) || []
}

function saveRouletteListItems(items: RouletteListItem[]) {
  store.set('rouletteListItems', items)
}

function normalizeItem(raw: Partial<RouletteListItem>, existingId?: string): RouletteListItem {
  return {
    id: existingId || raw.id || uuidv4(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 30) : '리스트',
    type: raw.type === 'count' ? 'count' : 'numeric',
    total: typeof raw.total === 'number' ? raw.total : 0,
    entries: Array.isArray(raw.entries) ? raw.entries : [],
  }
}

function extractNumber(label: string): number | null {
  const match = label.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const n = Number(match[0])
  return Number.isFinite(n) ? Math.trunc(n) : null
}

// ── 룰렛 결과 적용 (roulette.ts /result 에서 호출) ────────────────────────────

export function applyRouletteResult(
  listItemId: string,
  winnerLabel: string,
  _nickname?: string
): RouletteListItem | null {
  const items = getRouletteListItems()
  const idx = items.findIndex(i => i.id === listItemId)
  if (idx === -1) return null

  const item = { ...items[idx], entries: [...items[idx].entries] }

  if (item.type === 'numeric') {
    // 숫자 누적: label에서 숫자 추출해서 더하거나 뺌
    const value = extractNumber(winnerLabel)
    if (value !== null) {
      item.total = item.total + value

      // entries에도 기록 (히스토리)
      const existingIdx = item.entries.findIndex(e => e.label === winnerLabel)
      if (existingIdx >= 0) {
        item.entries[existingIdx] = {
          ...item.entries[existingIdx],
          count: item.entries[existingIdx].count + 1,
          value: item.entries[existingIdx].value + value,
        }
      } else {
        item.entries.push({ label: winnerLabel, count: 1, value })
      }
    }
  } else {
    // 횟수 카운트: label 그대로 카운팅
    item.total += 1
    const existingIdx = item.entries.findIndex(e => e.label === winnerLabel)
    if (existingIdx >= 0) {
      item.entries[existingIdx] = {
        ...item.entries[existingIdx],
        count: item.entries[existingIdx].count + 1,
        value: item.entries[existingIdx].count + 1,
      }
    } else {
      item.entries.push({ label: winnerLabel, count: 1, value: 1 })
    }
  }

  items[idx] = item
  saveRouletteListItems(items)
  return item
}

// ── 직접 값 적용 (PUBG 딜 추적 등 외부 시스템에서 사용) ──────────────────────────

export function applyDelta(
  listItemId: string,
  delta: number,
  entryLabel: string
): RouletteListItem | null {
  const items = getRouletteListItems()
  const idx = items.findIndex(i => i.id === listItemId)
  if (idx === -1) return null

  const item = { ...items[idx], entries: [...items[idx].entries] }

  if (item.type === 'numeric') {
    item.total = item.total + delta
    const existingIdx = item.entries.findIndex(e => e.label === entryLabel)
    if (existingIdx >= 0) {
      item.entries[existingIdx] = {
        ...item.entries[existingIdx],
        count: item.entries[existingIdx].count + 1,
        value: item.entries[existingIdx].value + delta,
      }
    } else {
      item.entries.push({ label: entryLabel, count: 1, value: delta })
    }
    items[idx] = item
    saveRouletteListItems(items)
  }

  return item
}

// ── 라우터 ────────────────────────────────────────────────────────────────────

// 전체 목록
router.get('/', (_req, res) => {
  res.json(getRouletteListItems())
})

// 새 항목 생성
router.post('/', (req, res) => {
  const items = getRouletteListItems()
  const created = normalizeItem({ ...req.body, id: uuidv4() })
  items.push(created)
  saveRouletteListItems(items)
  try { io?.emit('rouletteList:update', created) } catch {}
  res.json(created)
})

// 특정 항목 수정 (이름/타입 변경)
router.put('/:id', (req, res) => {
  const items = getRouletteListItems()
  const idx = items.findIndex(i => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })

  items[idx] = normalizeItem({ ...items[idx], ...req.body }, items[idx].id)
  saveRouletteListItems(items)
  try { io?.emit('rouletteList:update', items[idx]) } catch {}
  return res.json(items[idx])
})

// 항목 초기화 (값만 0으로, 항목은 유지)
router.post('/:id/reset', (req, res) => {
  const items = getRouletteListItems()
  const idx = items.findIndex(i => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })

  items[idx] = { ...items[idx], total: 0, entries: [] }
  saveRouletteListItems(items)
  try { io?.emit('rouletteList:update', items[idx]) } catch {}
  return res.json(items[idx])
})

// 항목 삭제
router.delete('/:id', (req, res) => {
  const items = getRouletteListItems()
  const filtered = items.filter(i => i.id !== req.params.id)
  if (filtered.length === items.length) return res.status(404).json({ error: 'Not found' })
  saveRouletteListItems(filtered)
  try { io?.emit('rouletteList:deleted', { id: req.params.id }) } catch {}
  return res.json({ ok: true })
})

// 전체 상태 (오버레이 초기 로드용)
router.get('/state', (_req, res) => {
  res.json(getRouletteListItems())
})

export default router
