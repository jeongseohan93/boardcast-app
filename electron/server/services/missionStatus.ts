export const MISSION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SUCCESS: 'SUCCESS',
  FAIL: 'FAIL',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const

export type MissionStatus = typeof MISSION_STATUS[keyof typeof MISSION_STATUS]

export function normalizeMissionStatus(value: unknown): MissionStatus {
  const status = String(value ?? '').trim().toUpperCase()

  if (status === 'APPROVE' || status === 'ACCEPTED' || status === 'ACTIVE' || status === 'RUNNING') {
    return MISSION_STATUS.APPROVED
  }
  if (status === 'SUCCEEDED' || status === 'COMPLETE' || status === 'COMPLETED') {
    return MISSION_STATUS.SUCCESS
  }
  if (status === 'FAILED' || status === 'FAILURE') {
    return MISSION_STATUS.FAIL
  }
  if (status === 'CANCELLED' || status === 'CANCELED' || status === 'DENIED') {
    return MISSION_STATUS.REJECTED
  }
  if (status === 'TIMEOUT' || status === 'TIMED_OUT') {
    return MISSION_STATUS.EXPIRED
  }

  if (
    status === MISSION_STATUS.APPROVED ||
    status === MISSION_STATUS.SUCCESS ||
    status === MISSION_STATUS.FAIL ||
    status === MISSION_STATUS.REJECTED ||
    status === MISSION_STATUS.EXPIRED
  ) {
    return status
  }

  return MISSION_STATUS.PENDING
}

export function missionSuccessFromStatus(status: MissionStatus, fallback?: unknown): boolean {
  if (status === MISSION_STATUS.SUCCESS) return true
  if (status === MISSION_STATUS.FAIL || status === MISSION_STATUS.REJECTED || status === MISSION_STATUS.EXPIRED) {
    return false
  }
  return false
}
