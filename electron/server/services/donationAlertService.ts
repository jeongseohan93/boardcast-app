/**
 * [금액별 후원 알림 규칙 서비스]
 *
 * 후원 금액 구간에 따라 서로 다른 이미지·사운드를 재생하는 규칙을 관리한다.
 *
 * ── 규칙 구조 (DonationAlertRule) ─────────────────────────────────────────
 *   minAmount    → 이 규칙이 적용되는 최소 후원 금액 (치즈, 포함).
 *                  0이면 "나머지 모든 금액"의 기본 규칙으로 활용할 수 있다.
 *   label        → 사용자 정의 레이블 ("소액", "VIP" 등). UI 표시용.
 *   imageDataUrl → base64 PNG/GIF data URL. 빈 문자열이면 이미지 없음.
 *   soundDataUrl → base64 MP3/WAV/OGG data URL. 빈 문자열이면 사운드 없음.
 *   soundVolume  → 0~1 사이 재생 볼륨. 기본 1.0.
 *   imageSize    → 오버레이 이미지 픽셀 크기. 기본 118.
 *
 * ── 매칭 로직 (matchDonationAlertRule) ───────────────────────────────────
 *   규칙을 minAmount 내림차순으로 정렬한 뒤 amount >= minAmount 인 첫 번째 규칙을 반환.
 *   금액이 클수록 우선 적용되며, minAmount=0 규칙이 모든 나머지를 받는다.
 *   매칭 규칙이 없으면 null → chzzkSession 이 전역 오버레이 설정을 fallback으로 사용.
 *
 * ── 저장소 ──────────────────────────────────────────────────────────────
 *   electron-store 키 'donationAlertRules'에 DonationAlertRule[] 형태로 저장.
 *   이미지·사운드는 base64 data URL 그대로 보관하며, 서버 파일시스템을 사용하지 않는다.
 */
import Store from 'electron-store'

export interface DonationAlertRule {
  id: string
  minAmount: number
  label: string
  imageDataUrl: string
  imageName: string
  imageSize: number
  soundDataUrl: string
  soundName: string
  soundVolume: number
}

export function getDonationAlertRules(): DonationAlertRule[] {
  const store = new Store()
  const saved = store.get('donationAlertRules')
  return Array.isArray(saved) ? (saved as DonationAlertRule[]) : []
}

export function saveDonationAlertRules(rules: DonationAlertRule[]) {
  const store = new Store()
  store.set('donationAlertRules', rules)
}

/**
 * 금액에 맞는 규칙을 반환한다. 없으면 null.
 * null 반환 시 호출부(chzzkSession)에서 전역 오버레이 설정을 사용한다.
 */
export function matchDonationAlertRule(amount: number): DonationAlertRule | null {
  const rules = getDonationAlertRules()
  const sorted = [...rules].sort((a, b) => b.minAmount - a.minAmount)
  return sorted.find((r) => amount >= r.minAmount) ?? null
}
