import { Router } from 'express'
import {
  addVideoDonation,
  clearPlayedVideoDonations,
  getVideoDonationConfig,
  getVideoDonationQueue,
  playVideoDonation,
  saveVideoDonationConfig,
  setVideoDonationStatus,
  stopVideoDonation,
} from '../services/videoDonationService'
import { io } from '../index'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    config: getVideoDonationConfig(),
    queue: getVideoDonationQueue(),
  })
})

router.put('/config', (req, res) => {
  const config = saveVideoDonationConfig({
    enabled: typeof req.body.enabled === 'boolean' ? req.body.enabled : undefined,
    autoPlay: typeof req.body.autoPlay === 'boolean' ? req.body.autoPlay : undefined,
    minAmount: req.body.minAmount !== undefined ? Math.max(0, Number(req.body.minAmount) || 0) : undefined,
    maxSeconds: req.body.maxSeconds !== undefined ? Math.max(5, Number(req.body.maxSeconds) || 90) : undefined,
  })
  res.json(config)
})

router.post('/manual', (req, res) => {
  const item = addVideoDonation({
    nickname: String(req.body.nickname || 'manual'),
    amount: Number(req.body.amount || 0),
    message: String(req.body.message || req.body.url || ''),
    donationType: 'VIDEO',
  })
  if (!item) return res.status(400).json({ error: 'valid YouTube URL required' })
  io.emit('videoDonation:queue', getVideoDonationQueue())
  res.json(item)
})

router.post('/:id/play', (req, res) => {
  const item = playVideoDonation(io, req.params.id)
  if (!item) return res.status(404).json({ error: 'not found' })
  res.json(item)
})

router.post('/play-next', (_req, res) => {
  const item = playVideoDonation(io)
  res.json(item || { ok: false })
})

router.post('/stop', (_req, res) => {
  res.json(stopVideoDonation(io))
})

router.post('/:id/reject', (req, res) => {
  const item = setVideoDonationStatus(req.params.id, 'rejected')
  if (!item) return res.status(404).json({ error: 'not found' })
  io.emit('videoDonation:queue', getVideoDonationQueue())
  res.json(item)
})

router.post('/clear-played', (_req, res) => {
  const queue = clearPlayedVideoDonations()
  io.emit('videoDonation:queue', queue)
  res.json(queue)
})

export default router
