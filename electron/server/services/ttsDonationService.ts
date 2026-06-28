/**
 * [후원 TTS 설정 서비스]
 *
 * 후원 메시지를 OBS 브라우저 소스의 Web Speech API로 읽어주는 기능의 설정을 관리한다.
 *
 * ── TTS 동작 흐름 ─────────────────────────────────────────────────────────
 *   1. donation 이벤트 수신 시 TTS 설정을 확인 (30초 캐시)
 *   2. enabled=true 이고 amount >= minAmount 이면 template으로 텍스트 조합
 *   3. skipNoMessage=true 면 메시지 없는 후원은 건너뜀
 *   4. SpeechSynthesisUtterance 큐에 추가 → 순서대로 재생
 *
 * ── template 플레이스홀더 ─────────────────────────────────────────────────
 *   {nickname} → 후원자 닉네임
 *   {amount}   → 후원 금액 (천 단위 쉼표 포함, 예: 1,000)
 *   {message}  → 후원 메시지 (없으면 빈 문자열)
 *
 * ── 저장소 ────────────────────────────────────────────────────────────────
 *   electron-store 키 'ttsDonationSettings' 에 저장.
 */
import Store from 'electron-store'

export interface TtsDonationSettings {
  enabled: boolean
  minAmount: number
  rate: number              // 0.5 ~ 2.0 (기본 1.0)
  pitch: number             // 0.5 ~ 2.0 (기본 1.0)
  volume: number            // 0.0 ~ 1.0 (기본 1.0)
  template: string          // {nickname}, {amount}, {message} 플레이스홀더
  skipNoMessage: boolean    // 메시지 없는 후원 건너뛰기
}

const DEFAULTS: TtsDonationSettings = {
  enabled: false,
  minAmount: 0,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  template: '{nickname}님 {amount}치즈 후원! {message}',
  skipNoMessage: false,
}

export function getTtsDonationSettings(): TtsDonationSettings {
  const store = new Store()
  const saved = store.get('ttsDonationSettings') as Partial<TtsDonationSettings> | undefined
  return { ...DEFAULTS, ...(saved ?? {}) }
}

export function saveTtsDonationSettings(settings: Partial<TtsDonationSettings>) {
  const store = new Store()
  store.set('ttsDonationSettings', { ...getTtsDonationSettings(), ...settings })
}
