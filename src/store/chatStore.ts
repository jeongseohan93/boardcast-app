import { create } from 'zustand'

export interface ChatMessage {
  id: string
  type: 'CHAT' | 'SYSTEM'
  userId?: string
  nickname: string
  message: string
  emojis?: Record<string, string>
  badges?: unknown[]
  timestamp: string
}

interface ChatState {
  messages: ChatMessage[]
  unread: number
  isAtBottom: boolean
  addMessage: (msg: ChatMessage) => void
  setAtBottom: (v: boolean) => void
  markRead: () => void
  clear: () => void
}

const MAX_MESSAGES = 1000

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  unread: 0,
  isAtBottom: true,

  addMessage: (msg) =>
    set((state) => {
      const messages = [...state.messages, msg]
      if (messages.length > MAX_MESSAGES) messages.shift()
      return {
        messages,
        unread: state.isAtBottom ? 0 : state.unread + 1,
      }
    }),

  setAtBottom: (v) => set({ isAtBottom: v, unread: v ? 0 : undefined as unknown as number }),

  markRead: () => set({ unread: 0 }),

  clear: () => set({ messages: [], unread: 0 }),
}))
