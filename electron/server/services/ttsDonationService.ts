import Store from 'electron-store'

const store = new Store()

export interface TtsDonationSettings {
  enabled: boolean
  minAmount: number
  rate: number
  pitch: number
  volume: number
  template: string
  skipNoMessage: boolean
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
  const saved = store.get('ttsDonationSettings') as Partial<TtsDonationSettings> | undefined
  return { ...DEFAULTS, ...(saved ?? {}) }
}

export function saveTtsDonationSettings(settings: Partial<TtsDonationSettings>) {
  store.set('ttsDonationSettings', { ...getTtsDonationSettings(), ...settings })
}
