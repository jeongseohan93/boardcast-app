/**
 * [알림 테이블 공통 UI 조각]
 *
 * AlertHistoryPage 하위 테이블 컴포넌트(DonationTable, SubscriptionTable,
 * FollowTable, AllEventsTable) 전체가 공유하는 소형 컴포넌트.
 *
 *   Avatar          — 닉네임 첫 글자 기반 아바타 (색상 결정론적 순환)
 *   DateCell        — 날짜·시간 2줄 표시 셀
 *   SectionHeader   — 테이블 상단 아이콘 + 제목 + 건수 헤더
 *   RestrictionButton — 팔로우 취소 테이블의 활동제한·해제 버튼
 */

import { ShieldBan, ShieldCheck } from 'lucide-react'

/** 닉네임 첫 글자 + charCode % 5 로 배경색을 결정론적으로 선택 */
export function Avatar({ name }: { name: string }) {
  const char = (name || '?')[0].toUpperCase()
  const palettes = [
    'bg-accent-mint/20 text-accent-mint',
    'bg-accent-purple/20 text-accent-purple',
    'bg-blue-400/20 text-blue-400',
    'bg-orange-400/20 text-orange-400',
    'bg-pink-400/20 text-pink-400',
  ]
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${palettes[char.charCodeAt(0) % palettes.length]}`}>
      {char}
    </div>
  )
}

/** 날짜·시간을 "6월 12일 / 오전 11:30" 형식의 2줄 셀로 표시 */
export function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="text-right leading-tight">
      <p className="text-xs text-text-secondary">{date}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{time}</p>
    </div>
  )
}

/** 각 테이블 상단에 아이콘 + 제목 + 건수를 가로로 나열하는 헤더 행 */
export function SectionHeader({
  icon, title, count, accent,
}: {
  icon: React.ReactNode
  title: string
  count: number
  accent: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
      {icon}
      <span className="text-sm font-bold text-text-primary">{title}</span>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/5 border border-border ${accent}`}>{count}</span>
    </div>
  )
}

/**
 * 팔로우 취소 테이블 전용 활동제한 버튼.
 * restricted=true 이면 "제한 해제" / false 이면 "활동제한" 상태로 표시.
 * disabled — target_channel_id가 없는 구버전 레코드에 비활성화.
 */
export function RestrictionButton({
  restricted, busy, disabled, onClick,
}: {
  restricted: boolean
  busy: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={disabled ? '기존 기록에는 대상 채널 ID가 없습니다' : undefined}
      className={`inline-flex items-center justify-center gap-1.5 min-w-[76px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${restricted
          ? 'border-accent-mint/30 bg-accent-mint/10 text-accent-mint hover:bg-accent-mint/20'
          : 'border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20'}`}
    >
      {restricted ? <ShieldCheck size={12} /> : <ShieldBan size={12} />}
      {busy ? '처리 중…' : restricted ? '제한 해제' : '활동제한'}
    </button>
  )
}
