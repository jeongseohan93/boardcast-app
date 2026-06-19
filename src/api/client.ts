import axios from 'axios'

const BASE_URL = 'http://localhost:3001'

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
}

// Chat
export const chatApi = {
  send: (message: string) => api.post('/api/chat/send', { message }),
  notice: (body: { message?: string; messageId?: string }) => api.post('/api/chat/notice', body),
  blindMessage: (data: { chatChannelId: string; messageTime: number; senderChannelId: string }) =>
    api.post('/api/chat/blind-message', data),
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
  follows: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/events/follows', { params }),
  summary: () => api.get('/api/events/summary'),
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

// Roulette
export const rouletteApi = {
  getConfig: () => api.get('/api/roulette'),
  saveConfig: (data: { enabled: boolean; triggerAmounts: number[]; items: { id: string; label: string; weight: number }[] }) =>
    api.post('/api/roulette', data),
  test: () => api.post('/api/overlay/test/roulette'),
}
