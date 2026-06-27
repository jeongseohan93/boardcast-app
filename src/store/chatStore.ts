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
