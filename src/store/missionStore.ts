import { create } from 'zustand'
import { normalizeMissionStatus, type MissionStatus } from '../utils/missionStatus'

export interface Mission {
  missionDonationId: string
  missionText: string
  status: MissionStatus
  success: boolean
  durationTime?: number       // 초
  missionCreatedTime?: string
  missionEndTime?: string
  payAmount: number
  donatorNickname: string
  donatorChannelId: string
  receivedAt: string
}

interface MissionState {
  missions: Mission[]
  addOrUpdate: (m: Omit<Mission, 'receivedAt'>) => void
  setAll: (ms: Mission[]) => void
  clear: () => void
}

export const useMissionStore = create<MissionState>((set) => ({
  missions: [],

  addOrUpdate: (incoming) =>
    set((state) => {
      const status = normalizeMissionStatus(incoming.status)
      const normalized = {
        ...incoming,
        status,
        success: status === 'SUCCESS',
      }
      const idx = state.missions.findIndex(
        (m) => m.missionDonationId === normalized.missionDonationId,
      )
      if (idx >= 0) {
        const next = [...state.missions]
        next[idx] = { ...next[idx], ...normalized }
        return { missions: next }
      }
      const mission: Mission = { ...normalized, receivedAt: new Date().toISOString() }
      return { missions: [mission, ...state.missions] }
    }),

  setAll: (ms) => set({
    missions: ms.map((mission) => ({
      ...mission,
      status: normalizeMissionStatus(mission.status),
      success: normalizeMissionStatus(mission.status) === 'SUCCESS',
    })),
  }),

  clear: () => set({ missions: [] }),
}))
