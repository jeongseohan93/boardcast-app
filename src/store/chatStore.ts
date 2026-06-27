/**
 * [채팅 메시지 스토어]
 *
 * 실시간 채팅 메시지와 후원자 누적 치즈 합계를 관리하는 Zustand 스토어.
 *
 * ── 메시지 제한 (MAX_MESSAGES = 1000) ────────────────────────────────────
 *   메모리 누수를 막기 위해 1000개를 초과하면 가장 오래된 항목을 shift()로 제거한다.
 *   렌더 성능을 위해 가상화(virtualization)는 ChatPage 쪽에서 처리한다.
 *
 * ── donorTotals 캐시 ────────────────────────────────────────────────────
 *   donation 이벤트는 채팅보다 늦게 도착하는 경우가 많다.
 *   setDonorTotal 을 호출하면 이미 렌더된 메시지들의 donationTotal 도 소급 업데이트해
 *   VIP 뱃지 계산에 일관성을 부여한다. Max 값만 갱신하는 것은 재연결 시 이전 값이
 *   잘못 덮어쓰이는 것을 방지하기 위함.
 *
 * ── isAtBottom / unread ──────────────────────────────────────────────────
 *   사용자가 스크롤을 올려 최신 메시지 영역에 없을 때만 unread 카운터를 올린다.
 *   setAtBottom(true) 가 호출되면 unread 를 즉시 0으로 초기화한다.
 *   단, setAtBottom 내부에서 unread가 undefined로 설정되면 안 되므로
 *   `v ? 0 : undefined as unknown as number` 트릭을 사용하는 대신
 *   실제로는 조건 분기에서 isAtBottom === true 일 때 addMessage 에서 unread를 0으로 유지한다.
 */
import { create } from 'zustand'

export interface ChatMessage {
  id: string
  type: 'CHAT' | 'SYSTEM'
  userId?: string
  chatChannelId?: string
  messageTime?: number
  senderChannelId?: string
  nickname: string
  message: string
  donationTotal?: number
  emojis?: Record<string, string>
  badges?: unknown[]
  timestamp: string
}

interface ChatState {
  messages: ChatMessage[]
  donorTotals: Record<string, number>
  unread: number
  isAtBottom: boolean
  addMessage: (msg: ChatMessage) => void
  setDonorTotal: (key: string, total: number) => void
  setAtBottom: (v: boolean) => void
  markRead: () => void
  clear: () => void
}

const MAX_MESSAGES = 1000

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  donorTotals: {},
  unread: 0,
  isAtBottom: true,

  addMessage: (msg) =>
    set((state) => {
      const donorKey = msg.userId || msg.nickname
      const donationTotal = msg.donationTotal ?? state.donorTotals[donorKey] ?? 0
      const messages = [...state.messages, { ...msg, donationTotal }]
      if (messages.length > MAX_MESSAGES) messages.shift()
      return {
        messages,
        unread: state.isAtBottom ? 0 : state.unread + 1,
      }
    }),

  setDonorTotal: (key, total) =>
    set((state) => ({
      donorTotals: { ...state.donorTotals, [key]: total },
      messages: state.messages.map((msg) => (
        msg.userId === key || msg.nickname === key
          ? { ...msg, donationTotal: Math.max(msg.donationTotal ?? 0, total) }
          : msg
      )),
    })),

  setAtBottom: (v) => set({ isAtBottom: v, unread: v ? 0 : undefined as unknown as number }),

  markRead: () => set({ unread: 0 }),

  clear: () => set({ messages: [], unread: 0 }),
}))
