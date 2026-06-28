/**
 * [금액별 후원 알림 규칙 API]
 *
 * 후원 금액 구간별 이미지·사운드 규칙을 조회·저장하는 클라이언트.
 */
import { api } from './base'

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

export const donationAlertApi = {
  getRules: () => api.get<DonationAlertRule[]>('/api/donation-alert/rules'),
  saveRules: (rules: DonationAlertRule[]) =>
    api.post<{ ok: boolean }>('/api/donation-alert/rules', rules),
}
