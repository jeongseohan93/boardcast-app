import axios, { AxiosInstance } from 'axios'

const BASE_URL = 'https://openapi.chzzk.naver.com'

function mask(value?: string) {
  if (!value) return 'missing'
  if (value.length <= 8) return `${value.slice(0, 2)}***`
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

export function createChzzkClient(accessToken?: string, clientId?: string, clientSecret?: string): AxiosInstance {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  if (clientId) {
    headers['Client-Id'] = clientId
  }

  if (clientSecret) {
    headers['Client-Secret'] = clientSecret
  }

  const client = axios.create({
    baseURL: BASE_URL,
    headers,
    timeout: 10000,
  })

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      console.error('[ChzzkAPI] Error:', err.response?.status, err.response?.data)
      return Promise.reject(err)
    }
  )

  return client
}

export async function getMyChannel(accessToken: string) {
  const client = createChzzkClient(accessToken)
  const res = await client.get('/open/v1/users/me')
  return res.data.content as { channelId: string; channelName: string }
}

export async function getChannelInfo(clientId: string, clientSecret: string, channelId: string) {
  const client = createChzzkClient(undefined, clientId, clientSecret)
  const res = await client.get('/open/v1/channels', { params: { channelIds: channelId } })
  const list: unknown[] = res.data.content?.data ?? []
  return list[0] as { channelId: string; channelName: string; channelImageUrl?: string; followerCount?: number } | undefined
}

export async function getLiveSetting(accessToken: string) {
  const client = createChzzkClient(accessToken)
  const res = await client.get('/open/v1/lives/setting')
  return res.data.content
}

export async function updateLiveSetting(
  accessToken: string,
  data: { defaultLiveTitle?: string; categoryType?: string; categoryId?: string; tags?: string[] }
) {
  const client = createChzzkClient(accessToken)
  const res = await client.patch('/open/v1/lives/setting', data)
  return res.data.content
}

export async function searchCategories(clientId: string, clientSecret: string, query: string, size = 20) {
  const client = createChzzkClient(undefined, clientId, clientSecret)
  const res = await client.get('/open/v1/categories/search', { params: { query, size } })
  return (res.data.content?.data ?? []) as unknown[]
}

export async function sendChat(accessToken: string, message: string, clientId?: string) {
  const client = createChzzkClient(accessToken, clientId)
  const body = { message }

  console.log('[ChzzkAPI] sendChat request:', JSON.stringify({
    endpoint: '/open/v1/chats/send',
    messageLength: message.length,
    hasClientId: !!clientId,
    clientId: mask(clientId),
  }))

  try {
    const res = await client.post('/open/v1/chats/send', body)
    console.log('[ChzzkAPI] sendChat response:', JSON.stringify({
      status: res.status,
      data: res.data,
    }))
    return res.data.content
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('[ChzzkAPI] sendChat failed:', JSON.stringify({
        status: err.response?.status ?? null,
        data: err.response?.data ?? null,
        message: err.message,
        hasClientId: !!clientId,
      }))
    } else {
      console.error('[ChzzkAPI] sendChat failed:', err)
    }
    throw err
  }
}


export async function sendNotice(accessToken: string, body: { message?: string; messageId?: string }) {
  const client = createChzzkClient(accessToken)
  const res = await client.post('/open/v1/chats/notice', body)
  return res.data.content
}

export async function blindMessage(
  accessToken: string,
  data: { chatChannelId: string; messageTime: number; senderChannelId: string }
) {
  const client = createChzzkClient(accessToken)
  const res = await client.post('/open/v1/chats/blind-message', data)
  return res.data.content
}

export async function getSessionAuth(accessToken: string, clientId?: string) {
  const client = createChzzkClient(accessToken, clientId)
  const res = await client.get('/open/v1/sessions/auth')
  return res.data.content
}

export async function getClientSessionAuth(clientId: string, clientSecret: string) {
  const client = createChzzkClient(undefined, clientId, clientSecret)
  const res = await client.get('/open/v1/sessions/auth/client')
  return res.data.content as { url: string }
}

export async function addRestriction(accessToken: string, targetChannelId: string) {
  const client = createChzzkClient(accessToken)
  const res = await client.post('/open/v1/restrict-channels', { targetChannelId })
  return res.data
}

export async function removeRestriction(accessToken: string, targetChannelId: string) {
  const client = createChzzkClient(accessToken)
  const res = await client.delete('/open/v1/restrict-channels', { data: { targetChannelId } })
  return res.data
}

export async function getRestrictions(accessToken: string, params?: { size?: number; next?: string }) {
  const client = createChzzkClient(accessToken)
  const res = await client.get('/open/v1/restrict-channels', { params })
  return res.data.content
}

export async function addTemporaryRestriction(
  accessToken: string,
  data: { targetChannelId: string; chatChannelId: string }
) {
  const client = createChzzkClient(accessToken)
  const res = await client.post('/open/v1/temporary-restrict-channels', data)
  return res.data
}

export async function removeTemporaryRestriction(
  accessToken: string,
  data: { targetChannelId: string; chatChannelId: string }
) {
  const client = createChzzkClient(accessToken)
  const res = await client.delete('/open/v1/temporary-restrict-channels', { data })
  return res.data
}
