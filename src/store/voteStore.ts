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
