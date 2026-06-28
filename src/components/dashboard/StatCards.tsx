/**
 * [대시보드 통계 카드]
 *
 * 팔로워·오늘 치즈·구독·순 팔로우 4개의 숫자를 카드 형태로 표시한다.
 * 소켓 이벤트로 누적되는 실시간 증분(rtXxx)과 DB 집계값을 합산해 props로 받는다.
 *
 * 레이아웃: grid-cols-4, 각 카드는 아이콘 + 큰 숫자 + 라벨 구조.
 */

import { Users, Gift, Star, Heart } from 'lucide-react'

interface StatCardsProps {
  followerCount: number
  todayDonation: number
  todaySubscription: number
  /** 순 팔로우 (팔로우 - 언팔로우). 음수면 빨간색 표시 */
  todayFollow: number
}

/**
 * 개별 통계 카드.
 * 아이콘 배경색·텍스트색은 칼라 계열을 props로 받아 재사용성 확보.
 */
function StatCard({
  icon,
  value,
  label,
  iconCls,
  bgCls,
}: {
  icon: React.ReactNode
  value: string
  label: string
  iconCls: string
  bgCls: string
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-3.5 flex flex-col gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bgCls}`}>
        <span className={iconCls}>{icon}</span>
      </div>
      <div>
        <p className="text-xl font-bold text-text-primary tabular-nums leading-none">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function StatCards({ followerCount, todayDonation, todaySubscription, todayFollow }: StatCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 shrink-0">
      <StatCard
        icon={<Users size={15} />}
        value={followerCount.toLocaleString()}
        label="팔로워"
        iconCls="text-accent-mint"
        bgCls="bg-accent-mint/10"
      />
      <StatCard
        icon={<Gift size={15} />}
        value={todayDonation.toLocaleString()}
        label="오늘 치즈"
        iconCls="text-yellow-400"
        bgCls="bg-yellow-400/10"
      />
      <StatCard
        icon={<Star size={15} />}
        value={String(todaySubscription)}
        label="구독"
        iconCls="text-purple-400"
        bgCls="bg-purple-400/10"
      />
      <StatCard
        icon={<Heart size={15} />}
        value={`${todayFollow >= 0 ? '+' : ''}${todayFollow}`}
        label="순 팔로우"
        iconCls={todayFollow >= 0 ? 'text-pink-400' : 'text-red-400'}
        bgCls={todayFollow >= 0 ? 'bg-pink-400/10' : 'bg-red-400/10'}
      />
    </div>
  )
}
