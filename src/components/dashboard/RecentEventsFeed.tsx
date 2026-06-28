/**
 * [최근 이벤트 피드]
 *
 * 최근 후원·구독·팔로우·언팔로우 이벤트를 시간 역순으로 리스트로 표시한다.
 * 소켓 이벤트를 받아 DashboardPage에서 업데이트된 summary를 props로 전달받는다.
 *
 * 레이아웃 편집:
 *   layoutEditing=true 일 때 ← → 버튼이 나타나, 피드를 왼쪽·오른쪽으로 이동할 수 있다.
 *   (eventSide, onToggleEventSide는 DashboardPage가 관리)
 */

import { Gift, Star, Heart, X, ArrowLeft, ArrowRight } from 'lucide-react'
import type { Summary } from './types'

interface RecentEventsFeedProps {
  summary: Summary | null
  layoutEditing: boolean
  eventSide: 'left' | 'right'
  onToggleEventSide: () => void
}

/** 이벤트 타입별 아이콘·색상·라벨 설정 */
const EVENT_CONFIG = {
  donation:     { icon: <Gift size={14} />,  bg: 'bg-yellow-400/15', color: 'text-yellow-400',  label: (e: { amount?: number }) => `${e.amount?.toLocaleString() ?? 0} 치즈 후원` },
  subscription: { icon: <Star size={14} />,  bg: 'bg-purple-400/15', color: 'text-purple-400', label: (e: { month?: number })  => `구독${e.month ? ` ${e.month}개월` : ''}` },
  follow:       { icon: <Heart size={14} />, bg: 'bg-pink-400/15',   color: 'text-pink-400',   label: () => '팔로우' },
  unfollow:     { icon: <X size={14} />,     bg: 'bg-gray-500/15',   color: 'text-gray-400',   label: () => '팔로우 취소' },
} as const

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

export default function RecentEventsFeed({
  summary,
  layoutEditing,
  eventSide,
  onToggleEventSide,
}: RecentEventsFeedProps) {
  return (
    <div className="flex-[2] min-w-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold text-text-primary">최근 이벤트</span>
        <div className="flex items-center gap-1.5">
          {summary?.recentEvents.length ? (
            <span className="text-xs text-text-muted bg-bg-outer px-1.5 py-0.5 rounded-md">
              {summary.recentEvents.length}
            </span>
          ) : null}
          {/* 레이아웃 편집 모드에서만 표시 */}
          {layoutEditing && (
            <button
              onClick={onToggleEventSide}
              title={eventSide === 'right' ? '왼쪽으로 이동' : '오른쪽으로 이동'}
              className="w-6 h-6 flex items-center justify-center rounded-md border border-accent-mint/30 text-accent-mint hover:bg-accent-mint/10 transition-colors"
            >
              {eventSide === 'right' ? <ArrowLeft size={11} /> : <ArrowRight size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* 이벤트 목록 */}
      <div className="flex-1 overflow-y-auto">
        {summary?.recentEvents.length ? (
          summary.recentEvents.map((e) => {
            const cfg  = EVENT_CONFIG[e.eventType]
            const name = e.nickname || (e.follower_count ? `팔로워 ${e.follower_count.toLocaleString()}명` : '—')
            return (
              <div
                key={`${e.eventType}-${e.id}`}
                className="flex items-start gap-3 px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-white/3 transition-colors"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                  <span className={cfg.color}>{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate leading-tight">{name}</p>
                  <p className={`text-xs font-medium mt-0.5 ${cfg.color}`}>
                    {cfg.label(e as any)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">{formatTime(e.created_at)}</p>
                </div>
              </div>
            )
          })
        ) : (
          /* 이벤트 없음 빈 상태 */
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-10">
            <div className="w-10 h-10 rounded-xl bg-bg-outer border border-border flex items-center justify-center mb-3">
              <Star size={18} className="text-border" />
            </div>
            <p className="text-sm text-text-muted">이벤트 없음</p>
            <p className="text-xs text-text-muted/60 mt-1 leading-relaxed">
              후원·구독·팔로우가<br />발생하면 표시됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
