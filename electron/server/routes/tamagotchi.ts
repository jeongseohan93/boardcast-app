import { Router } from 'express'
import { getTamagotchiState, resetTamagotchi, setTamagotchiTheme } from '../services/tamagotchiService'
import { io } from '../index'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getTamagotchiState())
})

router.post('/reset', (_req, res) => {
  res.json(resetTamagotchi(io))
})

router.post('/theme', (req, res) => {
  const theme = req.body?.theme
  if (!['classic', 'pixel', 'slime', 'space'].includes(theme)) {
    return res.status(400).json({ error: 'invalid theme' })
  }
  res.json(setTamagotchiTheme(theme, io))
})

export default router
