import axios from 'axios'

const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'
const BASE_URL = `http://${host}:3001`

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API]', err.response?.status, err.config?.url, err.response?.data)
    return Promise.reject(err)
  }
)

// Auth
export const authApi = {
  status: () => api.get('/auth/status'),
  token: (code: string, state: string) =>
    api.post('/auth/token', { code, state }),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  saveCredentials: (clientId: string, clientSecret: string) =>
    api.post('/auth/credentials', { clientId, clientSecret }),
  getCredentials: () => api.get('/auth/credentials'),
}

// Live
export const liveApi = {
  getSetting: () => api.get('/api/live/setting'),
  updateSetting: (data: { defaultLiveTitle?: string; categoryType?: string; categoryId?: string; tags?: string[] }) =>
    api.patch('/api/live/setting', data),
  getTitleHistory: () => api.get('/api/live/title-history'),
  getList: (params?: { size?: number; next?: string }) => api.get('/api/live/list', { params }),
}

// Channel
export const channelApi = {
  getStreamingRoles: () => api.get('/api/channel/streaming-roles'),
  getFollowers: (params?: { page?: number; size?: number }) =>
    api.get('/api/channel/followers', { params }),
  getSubscribers: (params?: { page?: number; size?: number; sort?: string }) =>
    api.get('/api/channel/subscribers', { params }),
  getRestrictions: (params?: { size?: number; next?: string }) =>
    api.get('/api/channel/restrictions', { params }),
  addRestriction: (targetChannelId: string) =>
    api.post('/api/channel/restrictions', { targetChannelId }),
  removeRestriction: (targetChannelId: string) =>
    api.delete(`/api/channel/restrictions/${encodeURIComponent(targetChannelId)}`),
  addTemporaryRestriction: (data: { targetChannelId: string; chatChannelId: string }) =>
    api.post('/api/channel/temporary-restrictions', data),
  removeTemporaryRestriction: (targetChannelId: string, chatChannelId: string) =>
    api.delete(`/api/channel/temporary-restrictions/${encodeURIComponent(targetChannelId)}`, { params: { chatChannelId } }),
}

// Chat
export const chatApi = {
  getChatChannelId: () => api.get<{ chatChannelId: string | null }>('/api/chat/channel-id'),
  send: (message: string) => api.post('/api/chat/send', { message }),
  notice: (body: { message?: string; messageId?: string }) => api.post('/api/chat/notice', body),
  blindMessage: (data: { chatChannelId: string; messageTime: number; senderChannelId: string }) =>
    api.post('/api/chat/blind-message', data),
  getSettings: () => api.get('/api/chat/settings'),
  updateSettings: (data: {
    chatAvailableCondition?: string
    chatAvailableGroup?: string
    minFollowerMinute?: number
    allowSubscriberInFollowerMode?: boolean
    chatSlowModeSec?: number
    chatEmojiMode?: boolean
  }) => api.put('/api/chat/settings', data),
}

// Categories
export const categoryApi = {
  search: (query: string) => api.get('/api/categories', { params: { query } }),
}

// Events
export const eventsApi = {
  donations: (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string }) =>
    api.get('/api/events/donations', { params }),
  subscriptions: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/events/subscriptions', { params }),
  follows: (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string; eventType?: 'FOLLOW' | 'UNFOLLOW' }) =>
    api.get('/api/events/follows', { params }),
  followerList: (params?: { limit?: number; offset?: number; search?: string }) =>
    api.get('/api/events/follower-list', { params }),
  summary: () => api.get('/api/events/summary'),
  debugDonations: (params?: { limit?: number }) =>
    api.get('/api/events/debug/donations', { params }),
  clearDebugDonations: () => api.delete('/api/events/debug/donations'),
  debugSession: (params?: { limit?: number }) =>
    api.get('/api/events/debug/session', { params }),
  clearDebugSession: () => api.delete('/api/events/debug/session'),
  debugWebhooks: (params?: { limit?: number }) =>
    api.get('/api/events/debug/webhooks', { params }),
  clearDebugWebhooks: () => api.delete('/api/events/debug/webhooks'),
  exportDb: () => api.get('/api/events/export'),
  importDb: (data: unknown) => api.post('/api/events/import', data),
  cleanupReconciledUnfollows: () => api.post('/api/events/cleanup/reconciled-unfollows'),
  deleteEvent: (table: string, id: number) =>
    api.delete(`/api/events/${table}/${id}`),
  deleteAll: () => api.delete('/api/events/all'),
}

// Bot
export const botApi = {
  list: () => api.get('/api/bot'),
  create: (data: object) => api.post('/api/bot', data),
  update: (id: string, data: object) => api.put(`/api/bot/${id}`, data),
  delete: (id: string) => api.delete(`/api/bot/${id}`),
}

// Auto Notice
export const autoNoticeApi = {
  list: () => api.get('/api/auto-notice'),
  create: (data: object) => api.post('/api/auto-notice', data),
  update: (id: string, data: object) => api.put(`/api/auto-notice/${id}`, data),
  delete: (id: string) => api.delete(`/api/auto-notice/${id}`),
}

// Roulette
export const rouletteApi = {
  list: () => api.get('/api/roulette'),
  create: (data: object) => api.post('/api/roulette', data),
  update: (id: string, data: object) => api.put(`/api/roulette/${encodeURIComponent(id)}`, data),
  delete: (id: string) => api.delete(`/api/roulette/${encodeURIComponent(id)}`),
  test: (rouletteId?: string) => api.post('/api/overlay/test/roulette', { rouletteId }),
  getTestList: () => api.get('/api/roulette/test-list'),
  setTestList: (enabled: boolean) => api.post('/api/roulette/test-list', { enabled }),
}

// Roulette List (당첨 결과 리스트 항목)
export const rouletteListApi = {
  list: () => api.get('/api/roulette-list'),
  create: (data: { name: string; type: 'numeric' | 'count' }) =>
    api.post('/api/roulette-list', data),
  update: (id: string, data: { name?: string; type?: 'numeric' | 'count' }) =>
    api.put(`/api/roulette-list/${encodeURIComponent(id)}`, data),
  setTotal: (id: string, total: number) =>
    api.put(`/api/roulette-list/${encodeURIComponent(id)}`, { total }),
  reset: (id: string) => api.post(`/api/roulette-list/${encodeURIComponent(id)}/reset`),
  delete: (id: string) => api.delete(`/api/roulette-list/${encodeURIComponent(id)}`),
}

export const tamagotchiApi = {
  getState: () => api.get('/api/tamagotchi'),
  reset: () => api.post('/api/tamagotchi/reset'),
  setTheme: (theme: 'classic' | 'pixel' | 'slime' | 'space') => api.post('/api/tamagotchi/theme', { theme }),
  test: () => api.post('/api/overlay/test/tamagotchi'),
}

export const pubgApi = {
  getSettings: () => api.get('/api/pubg/settings'),
  saveApiKey: (apiKey: string) => api.post('/api/pubg/settings', { apiKey }),
  searchPlayer: (params: { platform: string; name: string }) =>
    api.get('/api/pubg/player', { params }),
  getTracking: () => api.get('/api/pubg/tracking'),
  setTracking: (data: { name?: string; platform?: string; listItemId?: string; enabled?: boolean; includeTeamDamage?: boolean }) =>
    api.post('/api/pubg/tracking', data),
  pollNow: () => api.post('/api/pubg/tracking/poll'),
}

export const missionApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/mission', { params }),
  update: (data: { missionDonationId: string; status: string; success: boolean; missionText?: string; payAmount?: number; donatorNickname?: string; donatorChannelId?: string; durationTime?: number; missionCreatedTime?: string; missionEndTime?: string }) =>
    api.post('/api/mission/update', data),
}

export const videoDonationApi = {
  get: () => api.get('/api/video-donation'),
  updateConfig: (data: { enabled?: boolean; minAmount?: number; autoPlay?: boolean; maxSeconds?: number }) =>
    api.put('/api/video-donation/config', data),
  addManual: (data: { nickname?: string; amount?: number; url: string; message?: string }) =>
    api.post('/api/video-donation/manual', data),
  play: (id: string) => api.post(`/api/video-donation/${encodeURIComponent(id)}/play`),
  playNext: () => api.post('/api/video-donation/play-next'),
  stop: () => api.post('/api/video-donation/stop'),
  reject: (id: string) => api.post(`/api/video-donation/${encodeURIComponent(id)}/reject`),
  clearPlayed: () => api.post('/api/video-donation/clear-played'),
}
