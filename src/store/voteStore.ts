/**
 * [투표(폴) 스토어]
 *
 * 채팅 기반 실시간 투표(Poll) 상태를 관리하는 Zustand 스토어.
 *
 * ── 데이터 흐름 ────────────────────────────────────────────────────────────
 *   서버는 pollUpdate 소켓 이벤트로 VoteState 전체를 전송한다.
 *   useSocket.ts 의 'pollUpdate' 핸들러가 setPoll 을 호출해 상태를 통째로 교체하므로
 *   스토어 레벨에서 별도 병합 로직이 필요 없다.
 *
 * ── status 의미 ────────────────────────────────────────────────────────────
 *   idle   → 투표가 시작되지 않은 초기 상태
 *   active → 투표 진행 중 (옵션별 실시간 카운트 업데이트)
 *   ended  → 투표 종료 (결과 확정, UI는 최고득표 항목을 강조)
 *
 * ── startedAt / endedAt ───────────────────────────────────────────────────
 *   Unix 밀리초 타임스탬프. VotePage 에서 경과 시간 표시 및 진행바 계산에 사용.
 *   optional 인 이유: idle 상태에서는 아직 결정되지 않을 수 있음.
 */
import { create } from 'zustand'

export interface VoteOption { label: string; votes: number }
export interface VoteState {
  title: string
  options: VoteOption[]
  status: 'idle' | 'active' | 'ended'
  startedAt?: number
  endedAt?: number
}

interface VoteStore {
  poll: VoteState
  setPoll: (state: VoteState) => void
}

export const useVoteStore = create<VoteStore>((set) => ({
  poll: { title: '', options: [], status: 'idle' },
  setPoll: (poll) => set({ poll }),
}))
