export interface VoteOption { label: string; votes: number }
export interface VoteState {
  title: string
  options: VoteOption[]
  status: 'idle' | 'active' | 'ended'
  startedAt?: number
  endedAt?: number
}

interface InternalOption { label: string; votes: number; voters: Set<string> }
interface InternalPoll {
  title: string
  options: InternalOption[]
  status: 'idle' | 'active' | 'ended'
  startedAt?: number
  endedAt?: number
}

let poll: InternalPoll | null = null

export function startPoll(title: string, options: string[]): VoteState {
  poll = {
    title,
    options: options.map((label) => ({ label, votes: 0, voters: new Set() })),
    status: 'active',
    startedAt: Date.now(),
  }
  return getVoteState()
}

export function stopPoll(): VoteState {
  if (poll && poll.status === 'active') {
    poll.status = 'ended'
    poll.endedAt = Date.now()
  }
  return getVoteState()
}

export function clearPoll() {
  poll = null
}

export function vote(userId: string, choice: number): boolean {
  if (!poll || poll.status !== 'active') return false
  if (choice < 1 || choice > poll.options.length) return false

  // 이전 투표 취소
  for (const opt of poll.options) {
    if (opt.voters.has(userId)) {
      opt.voters.delete(userId)
      opt.votes = Math.max(0, opt.votes - 1)
      break
    }
  }

  poll.options[choice - 1].voters.add(userId)
  poll.options[choice - 1].votes++
  return true
}

export function isActive(): boolean {
  return poll?.status === 'active'
}

export function getVoteState(): VoteState {
  if (!poll) return { title: '', options: [], status: 'idle' }
  return {
    title:     poll.title,
    options:   poll.options.map((o) => ({ label: o.label, votes: o.votes })),
    status:    poll.status,
    startedAt: poll.startedAt,
    endedAt:   poll.endedAt,
  }
}
