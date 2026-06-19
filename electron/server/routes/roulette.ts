import express from 'express'
import Store from 'electron-store'

const router = express.Router()
const store = new Store()

export interface RouletteItem {
  id: string
  label: string
  weight: number
}

export interface RouletteConfig {
  enabled: boolean
  triggerAmounts: number[]
  items: RouletteItem[]
}

const DEFAULT_CONFIG: RouletteConfig = {
  enabled: false,
  triggerAmounts: [100, 1000],
  items: [
    { id: '1', label: '항목 1', weight: 1 },
    { id: '2', label: '항목 2', weight: 1 },
    { id: '3', label: '항목 3', weight: 1 },
  ],
}

router.get('/', (_req, res) => {
  const config = (store.get('rouletteConfig') ?? DEFAULT_CONFIG) as RouletteConfig
  res.json(config)
})

router.post('/', (req, res) => {
  const { enabled, triggerAmounts, items } = req.body as RouletteConfig
  const config: RouletteConfig = {
    enabled: !!enabled,
    triggerAmounts: Array.isArray(triggerAmounts) ? triggerAmounts.map(Number).filter(n => n > 0) : [],
    items: Array.isArray(items) ? items : [],
  }
  store.set('rouletteConfig', config)
  res.json({ ok: true })
})

export function getRoulettConfig(): RouletteConfig {
  return (store.get('rouletteConfig') ?? DEFAULT_CONFIG) as RouletteConfig
}

export default router
