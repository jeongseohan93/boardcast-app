export interface VipTier {
  key: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond'
  label: string
  minCheese: number
  badgeClass: string
  rowClass: string
  nameClass: string
}

export const VIP_TIERS: VipTier[] = [
  {
    key: 'diamond',
    label: 'VIP DIAMOND',
    minCheese: 100_000,
    badgeClass: 'bg-cyan-300/15 text-cyan-200 border-cyan-300/30',
    rowClass: 'bg-cyan-300/10 border border-cyan-300/20',
    nameClass: 'text-cyan-200',
  },
  {
    key: 'gold',
    label: 'VIP GOLD',
    minCheese: 50_000,
    badgeClass: 'bg-yellow-300/15 text-yellow-200 border-yellow-300/30',
    rowClass: 'bg-yellow-300/10 border border-yellow-300/20',
    nameClass: 'text-yellow-200',
  },
  {
    key: 'silver',
    label: 'VIP SILVER',
    minCheese: 10_000,
    badgeClass: 'bg-slate-200/15 text-slate-100 border-slate-200/30',
    rowClass: 'bg-slate-200/10 border border-slate-200/20',
    nameClass: 'text-slate-100',
  },
  {
    key: 'bronze',
    label: 'VIP BRONZE',
    minCheese: 1_000,
    badgeClass: 'bg-orange-300/15 text-orange-200 border-orange-300/30',
    rowClass: 'bg-orange-300/10 border border-orange-300/20',
    nameClass: 'text-orange-200',
  },
]

export function getVipTier(cheese = 0): VipTier | null {
  return VIP_TIERS.find((tier) => cheese >= tier.minCheese) ?? null
}
