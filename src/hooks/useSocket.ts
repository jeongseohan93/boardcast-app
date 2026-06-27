import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import { useAuthStore } from '../store/authStore'
import { useVoteStore } from '../store/voteStore'
import { useMissionStore } from '../store/missionStore'
import { getMissionStatusKind, getMissionStatusLabel, normalizeMissionStatus } from '../utils/missionStatus'

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

    socketInstance.on('mission', (data: any) => {
      const status = normalizeMissionStatus(data.status)
      const success = status === 'SUCCESS'
      const kind = getMissionStatusKind(status, success)

      useMissionStore.getState().addOrUpdate({
        missionDonationId: data.missionDonationId ?? '',
        missionText: data.missionText ?? '',
        status,
        success,
        durationTime: data.durationTime,
        missionCreatedTime: data.missionCreatedTime,
        missionEndTime: data.missionEndTime,
        payAmount: Number(data.payAmount ?? 0),
        donatorNickname: data.donatorNickname ?? 'unknown',
        donatorChannelId: data.donatorChannelId ?? '',
      })

      if (status === 'PENDING' || status === 'APPROVED') {
        useToastStore.getState().addToast({
          type: 'info',
          title: `미션 ${getMissionStatusLabel(status, success)}: ${data.missionText}`,
          message: `${data.donatorNickname} · ${Number(data.payAmount ?? 0).toLocaleString()} 치즈`,
        })
      } else if (kind === 'success' || kind === 'failed') {
        useToastStore.getState().addToast({
          type: 'info',
          title: `미션 ${getMissionStatusLabel(status, success)}: ${data.missionText}`,
          message: data.donatorNickname,
        })
      }
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
