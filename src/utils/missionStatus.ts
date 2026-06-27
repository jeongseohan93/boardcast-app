export type MissionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'SUCCESS'
  | 'FAIL'
  | 'REJECTED'
  | 'EXPIRED'

export type MissionStatusKind = 'waiting' | 'active' | 'success' | 'failed'

export function normalizeMissionStatus(value: unknown): MissionStatus {
  const status = String(value ?? '').trim().toUpperCase()

  if (status === 'APPROVE' || status === 'ACCEPTED' || status === 'ACTIVE' || status === 'RUNNING') {
    return 'APPROVED'
  }
  if (status === 'SUCCEEDED' || status === 'COMPLETE' || status === 'COMPLETED') {
    return 'SUCCESS'
  }
  if (status === 'FAILED' || status === 'FAILURE') {
    return 'FAIL'
  }
  if (status === 'CANCELLED' || status === 'CANCELED' || status === 'DENIED') {
    return 'REJECTED'
  }
  if (status === 'TIMEOUT' || status === 'TIMED_OUT') {
    return 'EXPIRED'
  }

  if (
    status === 'APPROVED' ||
    status === 'SUCCESS' ||
    status === 'FAIL' ||
    status === 'REJECTED' ||
    status === 'EXPIRED'
  ) {
    return status
  }

  return 'PENDING'
}

export function getMissionStatusKind(statusValue: unknown, success?: boolean): MissionStatusKind {
  const status = normalizeMissionStatus(statusValue)
  if (status === 'SUCCESS') return 'success'
  if (status === 'APPROVED') return 'active'
  if (status === 'PENDING') return 'waiting'
  return 'failed'
}

export function getMissionStatusLabel(statusValue: unknown, success?: boolean): string {
  const status = normalizeMissionStatus(statusValue)
  const kind = getMissionStatusKind(status, success)
  if (kind === 'success') return '성공'
  if (status === 'APPROVED') return '진행 중'
  if (status === 'REJECTED') return '거절'
  if (status === 'EXPIRED') return '만료'
  if (kind === 'failed') return '실패'
  return '수락 대기'
}

export function isMissionOpen(statusValue: unknown, success?: boolean): boolean {
  const kind = getMissionStatusKind(statusValue, success)
  return kind === 'waiting' || kind === 'active'
}
