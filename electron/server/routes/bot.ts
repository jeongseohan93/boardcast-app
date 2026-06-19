import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getCommands, saveCommands, BotCommand } from '../services/botService'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getCommands())
})

router.post('/', (req, res) => {
  const commands = getCommands()
  const newCmd: BotCommand = {
    id: uuidv4(),
    trigger: req.body.trigger,
    response: req.body.response,
    cooldown: req.body.cooldown ?? 5,
    permission: req.body.permission ?? 'everyone',
    enabled: req.body.enabled ?? true,
  }
  commands.push(newCmd)
  saveCommands(commands)
  res.json(newCmd)
})

router.put('/:id', (req, res) => {
  const commands = getCommands()
  const idx = commands.findIndex((c) => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  commands[idx] = { ...commands[idx], ...req.body, id: req.params.id }
  saveCommands(commands)
  return res.json(commands[idx])
})

router.delete('/:id', (req, res) => {
  const commands = getCommands()
  const filtered = commands.filter((c) => c.id !== req.params.id)
  saveCommands(filtered)
  res.json({ ok: true })
})

export default router
