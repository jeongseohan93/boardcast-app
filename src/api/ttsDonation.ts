/**
 * [후원 TTS 설정 API]
 *
 * OBS 브라우저 소스에서 Web Speech API로 후원 메시지를 읽어주는 기능의 설정 클라이언트.
 */
import { api } from './base'

export interface TtsDonationSettings {
  enabled: boolean
  minAmount: number
  rate: number
  pitch: number
  volume: number
  template: string
  skipNoMessage: boolean
}

export const ttsDonationApi = {
  getSettings: () => api.get<TtsDonationSettings>('/api/tts-donation/settings'),
  saveSettings: (s: Partial<TtsDonationSettings>) =>
    api.post<{ ok: boolean }>('/api/tts-donation/settings', s),
}
