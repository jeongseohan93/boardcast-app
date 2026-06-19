import axios, { AxiosInstance } from 'axios'

// CHZZK Open API 공식 도메인 (api.chzzk.naver.com 이 아님)
const BASE_URL = 'https://openapi.chzzk.naver.com'

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

// ── 유저 ─────────────────────────────────────────────────────────────────────
// 응답: { channelId, channelName } 만 반환 (이미지/팔로워는 채널 API에서 별도 조회)
export async function getMyChannel(accessToken: string) {
  const client = createChzzkClient(accessToken)
  const res = await client.get('/open/v1/users/me')
  return res.data.content as { channelId: string; channelName: string }
}

// ── 채널 ─────────────────────────────────────────────────────────────────────
// Client 인증 사용 (Bearer 아님), channelIds 쿼리 파라미터
export async function getChannelInfo(clientId: string, clientSecret: string, channelId: string) {
  const client = createChzzkClient(undefined, clientId, clientSecret)
  const res = await client.get('/open/v1/channels', { params: { channelIds: channelId } })
  const list: unknown[] = res.data.content?.data ?? []
  return list[0] as { channelId: string; channelName: string; channelImageUrl?: string; followerCount?: number } | undefined
}

// ── 라이브 ───────────────────────────────────────────────────────────────────
export async function getLiveSetting(accessToken: string) {
  const client = createChzzkClient(accessToken)
  const res = await client.get('/open/v1/lives/setting')
  return res.data.content
}

// 방송 설정 변경 — PUT이 아닌 PATCH, categoryType + tags 포함
export async function updateLiveSetting(
  accessToken: string,
  data: { defaultLiveTitle?: string; categoryType?: string; categoryId?: string; tags?: string[] }
) {
  const client = createChzzkClient(accessToken)
  const res = await client.patch('/open/v1/lives/setting', data)
  return res.data.content
}

// ── 카테고리 ─────────────────────────────────────────────────────────────────
// Client 인증 사용 (Bearer 아님), /categories/search 경로, 응답은 content.data 배열
export async function searchCategories(clientId: string, clientSecret: string, query: string, size = 20) {
  const client = createChzzkClient(undefined, clientId, clientSecret)
  const res = await client.get('/open/v1/categories/search', { params: { query, size } })
  return (res.data.content?.data ?? []) as unknown[]
}

// ── 채팅 ─────────────────────────────────────────────────────────────────────
// 채팅 전송 — body에 channelId 없음 (docs 기준)
export async function sendChat(accessToken: string, message: string) {
  const client = createChzzkClient(accessToken)
  const res = await client.post('/open/v1/chats/send', { message })
  return res.data.content
}

// 공지 등록 — /chats/notice (단수), message 또는 messageId 중 하나
export async function sendNotice(accessToken: string, body: { message?: string; messageId?: string }) {
  const client = createChzzkClient(accessToken)
  const res = await client.post('/open/v1/chats/notice', body)
  return res.data.content
}

// 채팅 메시지 숨기기
export async function blindMessage(
  accessToken: string,
  data: { chatChannelId: string; messageTime: number; senderChannelId: string }
) {
  const client = createChzzkClient(accessToken)
  const res = await client.post('/open/v1/chats/blind-message', data)
  return res.data.content
}

// ── 세션 ─────────────────────────────────────────────────────────────────────
export async function getSessionAuth(accessToken: string, clientId?: string) {
  const client = createChzzkClient(accessToken, clientId)
  const res = await client.get('/open/v1/sessions/auth')
  return res.data.content
}

// Client 인증 기반 세션 (채널 지정 구독 가능, 방송 오프라인에서도 동작)
export async function getClientSessionAuth(clientId: string, clientSecret: string) {
  const client = createChzzkClient(undefined, clientId, clientSecret)
  const res = await client.get('/open/v1/sessions/auth/client')
  return res.data.content as { url: string }
}

// ── 활동 제한 ────────────────────────────────────────────────────────────────
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
