import Store from 'electron-store'

const store = new Store()

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
  const saved = store.get('donationAlertRules')
  return Array.isArray(saved) ? (saved as DonationAlertRule[]) : []
}

export function saveDonationAlertRules(rules: DonationAlertRule[]) {
  store.set('donationAlertRules', rules)
}

// 금액 내림차순으로 정렬 후 amount >= minAmount 인 첫 번째 규칙 반환. 없으면 null.
export function matchDonationAlertRule(amount: number): DonationAlertRule | null {
  const rules = getDonationAlertRules()
  const sorted = [...rules].sort((a, b) => b.minAmount - a.minAmount)
  return sorted.find((r) => amount >= r.minAmount) ?? null
}
