import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import { useAuthStore } from '../store/authStore'

let socketInstance: Socket | null = null
let isInitialized = false  // 모듈 레벨 flag — 컴포넌트가 여러 개여도 1번만 초기화

export function useSocket() {
  useEffect(() => {
    if (isInitialized) return
    isInitialized = true

    const host = window.location.hostname || 'localhost'
    socketInstance = io(`http://${host}:3001`, {
      transports: ['websocket'],
    })

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected')
    })

    socketInstance.on('chat', (data: any) => {
      useChatStore.getState().addMessage({
        id: Math.random().toString(36).slice(2),
        type: 'CHAT',
        userId: data.userId,
        nickname: data.nickname || '익명',
        message: data.message,
        emojis: data.emojis || {},
        badges: data.badges,
        timestamp: data.timestamp || new Date().toISOString(),
      })
    })

    socketInstance.on('donation', (data: any) => {
      useToastStore.getState().addToast({
        type: 'donation',
        title: `🧀 ${data.nickname} — ${data.amount.toLocaleString()} 치즈`,
        message: data.message,
      })
    })

    socketInstance.on('subscription', (data: any) => {
      useToastStore.getState().addToast({
        type: 'subscription',
        title: `⭐ ${data.nickname} 구독!`,
        message: data.month ? `${data.month}개월째 구독 중` : undefined,
      })
    })

    socketInstance.on('follow', (data: any) => {
      useAuthStore.getState().setFollowerCount(data.followerCount)
      useToastStore.getState().addToast({
        type: 'follow',
        title: `❤️ 새 팔로우!`,
        message: `팔로워 ${data.followerCount.toLocaleString()}명`,
      })
    })

    return () => {
      socketInstance?.disconnect()
      socketInstance = null
      isInitialized = false
    }
  }, [])

  return socketInstance
}
