/**
 * [미션 스토어]
 *
 * 후원 미션의 전체 목록을 관리하는 Zustand 스토어.
 *
 * ── addOrUpdate 의 upsert 동작 ──────────────────────────────────────────
 *   동일한 missionDonationId 를 가진 항목이 이미 있으면 상태(status)만 갱신하고,
 *   없으면 새 미션으로 prepend(맨 앞에 삽입)한다.
 *   receivedAt 은 최초 삽입 시에만 설정된다. 이후 상태 변경(PENDING→APPROVED 등)에서는
 *   receivedAt 이 변하지 않아야 미션 카드의 타임스탬프가 안정적으로 유지된다.
 *
 * ── normalizeMissionStatus 중복 호출 이유 ─────────────────────────────
 *   소켓 이벤트의 status 문자열은 서버 버전에 따라 APPROVE/APPROVED/ACTIVE 등
 *   다양한 변형이 올 수 있다. 스토어 레벨에서 한 번 더 정규화해 컴포넌트가 항상
 *   표준 MissionStatus 값만 다루도록 보장한다.
 *
 * ── setAll ────────────────────────────────────────────────────────────
 *   페이지 초기 로드 시 REST API 응답을 통째로 교체할 때 사용한다.
 *   이 경우에도 status 를 다시 정규화해 서버 응답과 소켓 이벤트 간 일관성을 유지한다.
 */
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
