/**
 * [소켓 싱글턴 훅]
 *
 * Socket.IO 연결을 앱 전역에서 단 하나만 유지하기 위한 모듈 레벨 싱글턴 패턴.
 *
 * ── 왜 모듈 변수로 관리하는가 ─────────────────────────────────────────────
 *   React Hook은 컴포넌트가 마운트될 때마다 실행되므로, useState / useRef 만으로는
 *   여러 컴포넌트가 동시에 마운트될 경우 소켓이 중복 생성될 수 있다.
 *   `socketInstance`, `isInitialized`, `mountCount` 를 모듈 스코프 변수로 두면
 *   컴포넌트 인스턴스와 무관하게 프로세스 생애 주기 동안 하나의 소켓만 존재한다.
 *
 * ── 이벤트 핸들러 등록 전략 ──────────────────────────────────────────────
 *   첫 번째 마운트에서만 `socketInstance.on(...)` 을 등록한다.
 *   이후 마운트는 기존 소켓 인스턴스를 반환만 하고 리스너를 추가하지 않아 중복 처리를 방지한다.
 *
 * ── 이벤트 → 스토어 매핑 ──────────────────────────────────────────────────
 *   chat        → chatStore.addMessage   (donationTotal 은 donorTotals 캐시와 병합)
 *   donation    → chatStore.setDonorTotal + toastStore
 *   subscription → toastStore
 *   follow       → authStore.setFollowerCount + toastStore
 *   unfollow     → authStore.setFollowerCount + toastStore
 *   pollUpdate   → voteStore.setPoll
 *
 * ── 정리 (cleanup) ────────────────────────────────────────────────────────
 *   mountCount 가 0이 될 때만 소켓을 실제로 끊는다.
 *   레이아웃 리마운트(React StrictMode 이중 실행 포함)에서 불필요한 재연결을 막기 위함.
 */
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import { useAuthStore } from '../store/authStore'
import { useVoteStore } from '../store/voteStore'

let socketInstance: Socket | null = null
let isInitialized = false
let mountCount = 0

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(socketInstance)

  useEffect(() => {
    mountCount++
    if (isInitialized) {
      setSocket(socketInstance)
      return () => { mountCount-- }
    }

    isInitialized = true
    const host = window.location.hostname || 'localhost'
    socketInstance = io(`http://${host}:3001`, { transports: ['websocket'] })
    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected')
    })

    socketInstance.on('chat', (data: any) => {
      useChatStore.getState().addMessage({
        id: Math.random().toString(36).slice(2),
        type: 'CHAT',
        userId: data.userId,
        chatChannelId: data.chatChannelId,
        messageTime: data.messageTime,
        senderChannelId: data.senderChannelId,
        nickname: data.nickname || 'unknown',
        message: data.message,
        donationTotal: data.donationTotal ?? 0,
        emojis: data.emojis || {},
        badges: data.badges,
        timestamp: data.timestamp || new Date().toISOString(),
      })
    })

    socketInstance.on('donation', (data: any) => {
      const donorKey = data.userId || data.nickname
      if (donorKey && typeof data.donationTotal === 'number') {
        useChatStore.getState().setDonorTotal(donorKey, data.donationTotal)
      }

      useToastStore.getState().addToast({
        type: 'donation',
        title: `${data.nickname} ${Number(data.amount ?? 0).toLocaleString()} 치즈`,
        message: data.message,
      })
    })

    socketInstance.on('subscription', (data: any) => {
      useToastStore.getState().addToast({
        type: 'subscription',
        title: `${data.nickname} 구독!`,
        message: data.month ? `${data.month}개월째 구독 중` : undefined,
      })
    })

    socketInstance.on('follow', (data: any) => {
      useAuthStore.getState().setFollowerCount(data.followerCount)
      useToastStore.getState().addToast({
        type: 'follow',
        title: data.nickname ? `${data.nickname} 님이 팔로우했습니다` : '새 팔로우',
        message: `팔로워 ${Number(data.followerCount ?? 0).toLocaleString()}명`,
      })
    })

    socketInstance.on('unfollow', (data: any) => {
      useAuthStore.getState().setFollowerCount(data.followerCount)
      useToastStore.getState().addToast({
        type: 'follow',
        title: data.nickname ? `${data.nickname} 님이 팔로우를 취소했습니다` : '팔로우 취소',
        message: `팔로워 ${Number(data.followerCount ?? 0).toLocaleString()}명`,
      })
    })

    socketInstance.on('pollUpdate', (data: any) => {
      useVoteStore.getState().setPoll(data)
    })

    return () => {
      mountCount--
      if (mountCount === 0) {
        socketInstance?.disconnect()
        socketInstance = null
        setSocket(null)
        isInitialized = false
      }
    }
  }, [])

  return socket
}
