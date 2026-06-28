/**
 * [VIP 등급 유틸리티]
 *
 * 후원 누적 치즈 금액을 기준으로 VIP 등급을 결정하는 유틸 모듈.
 *
 * ── VIP_TIERS (내림차순 정렬) ─────────────────────────────────────────────
 *   diamond(10만) → gold(5만) → silver(1만) → bronze(1천) 순으로 내림차순 정렬되어 있다.
 *   getVipTier 가 Array.find() 를 사용하므로 첫 번째 매칭이 가장 높은 등급이 된다.
 *   오름차순으로 정렬하면 항상 bronze 가 매칭되어버리기 때문에 내림차순이 필수다.
 *
 * ── getVipTier ────────────────────────────────────────────────────────────
 *   누적 치즈 금액(totalCheese)을 받아 해당하는 VipTier 를 반환한다.
 *   어떤 등급도 해당하지 않으면(1천 미만) null 을 반환해 뱃지를 표시하지 않는다.
 *
 * ── badgeClass / rowClass / nameClass ────────────────────────────────────
 *   각 등급별로 ChatPage 뱃지·행·닉네임에 적용할 Tailwind CSS 클래스를 포함한다.
 *   컴포넌트에서 조건부 className 계산 없이 tier 객체만 참조하면 스타일이 결정된다.
 */
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
