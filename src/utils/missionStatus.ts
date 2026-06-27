/**
 * [미션 상태 유틸리티]
 *
 * 후원 미션의 상태 문자열을 정규화하고, 상태 종류·레이블을 반환하는 유틸 모듈.
 *
 * ── MissionStatus (표준 상태 타입) ───────────────────────────────────────
 *   앱 내부에서 사용하는 표준 미션 상태 리터럴 타입.
 *   PENDING  → 대기 중 (후원자가 미션 요청, 스트리머 수락 전)
 *   APPROVED → 수락됨 (스트리머가 미션 시작)
 *   SUCCESS  → 성공 (미션 완료 처리)
 *   FAIL     → 실패 (스트리머가 실패 처리)
 *   REJECTED → 거절 (스트리머가 미션 거절)
 *   EXPIRED  → 만료 (시간 초과)
 *
 * ── normalizeMissionStatus ────────────────────────────────────────────────
 *   Chzzk API 버전에 따라 status 문자열이 다양한 변형으로 올 수 있다.
 *   APPROVE  → APPROVED, ACTIVE → APPROVED, SUCCEEDED → SUCCESS
 *   FAILED   → FAIL, CANCELLED → REJECTED, TIMEOUT → EXPIRED
 *   알 수 없는 값은 PENDING 으로 폴백한다.
 *   소켓 이벤트와 REST API 응답 모두 이 함수를 거쳐 표준화된다.
 *
 * ── getMissionStatusKind ──────────────────────────────────────────────────
 *   표준 상태를 4가지 UI 카테고리(waiting / active / success / failed)로 매핑한다.
 *   MissionCard 의 색상·아이콘 결정에 사용된다.
 *
 * ── isMissionOpen ─────────────────────────────────────────────────────────
 *   미션이 아직 진행 중(waiting 또는 active)인지 여부를 반환한다.
 *   종료된 미션에 타이머를 표시하지 않거나 추가 액션을 비활성화할 때 사용한다.
 */
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
