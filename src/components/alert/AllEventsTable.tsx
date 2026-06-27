/**
 * [전체 이벤트 테이블]
 *
 * 후원·구독·팔로우·팔로우취소를 시간 역순으로 합쳐 하나의 테이블로 표시한다.
 *
 * ── 특이 사항 ─────────────────────────────────────────────────────────────
 *
 *  날짜 구분선:
 *    unified 배열에서 날짜가 바뀌는 지점마다 날짜 구분 행을 삽입한다.
 *
 *  팔로워 증감(delta):
 *    follow/unfollow 이벤트끼리만 비교해 delta를 계산한다.
 *    다른 이벤트(후원 등)가 중간에 끼어 있어도 팔로워 이벤트 인덱스 기준으로
 *    이전 항목과 비교하므로, 시간 역순 기준 이전 팔로워 이벤트 대비 증감이 맞다.
 *
 *  마일스톤 배지:
 *    MILESTONES 배열에 해당하는 팔로워 수 달성 시 황색 뱃지를 표시한다.
 */

import { Gift, Heart, HeartOff, History, Star, Trash2 } from 'lucide-react'
import type { Donation, FollowEvent, Subscription, UnifiedEvent } from './types'
import { MILESTONES, fmtDate } from './types'
import { Avatar, DateCell, SectionHeader } from './AlertTableParts'

interface AllEventsTableProps {
  donations: Donation[]
  subscriptions: Subscription[]
  followEvents: FollowEvent[]
  unfollowEvents: FollowEvent[]
  onDelete: (table: string, id: number) => void
}

const TYPE_CFG = {
  donation:     { icon: <Gift size={11} />,     label: '후원',        badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/25',             bar: 'bg-yellow-400' },
  subscription: { icon: <Star size={11} />,     label: '구독',        badge: 'bg-accent-purple/10 text-accent-purple border-accent-purple/25',   bar: 'bg-accent-purple' },
  follow:       { icon: <Heart size={11} />,    label: '팔로우',      badge: 'bg-pink-400/10 text-pink-400 border-pink-400/25',                   bar: 'bg-pink-400' },
  unfollow:     { icon: <HeartOff size={11} />, label: '팔로우 취소', badge: 'bg-red-400/10 text-red-400 border-red-400/25',                      bar: 'bg-red-400' },
} as const

/** 이벤트 종류 → DB 테이블 이름 매핑 (deleteEvent 호출 시 사용) */
const TABLE_MAP = {
  donation:     'donations',
  subscription: 'subscriptions',
  follow:       'follows',
  unfollow:     'follows',
} as const

export default function AllEventsTable({
  donations, subscriptions, followEvents, unfollowEvents, onDelete,
}: AllEventsTableProps) {
  const unified: UnifiedEvent[] = [
    ...donations.map((d) => ({ kind: 'donation'     as const, id: d.id, created_at: d.created_at, data: d })),
    ...subscriptions.map((s) => ({ kind: 'subscription' as const, id: s.id, created_at: s.created_at, data: s })),
    ...followEvents.map((f) => ({ kind: 'follow'       as const, id: f.id, created_at: f.created_at, data: f })),
    ...unfollowEvents.map((f) => ({ kind: 'unfollow'    as const, id: f.id, created_at: f.created_at, data: f })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  /* 팔로워 관련 이벤트만 추출해 증감 맵 구성 */
  const followerEvts = unified.filter((e) => e.kind === 'follow' || e.kind === 'unfollow')
  const followerDeltaMap = new Map<string, number | null>()
  followerEvts.forEach((ev, i) => {
    const key = `${ev.kind}-${ev.id}`
    if (i === followerEvts.length - 1) { followerDeltaMap.set(key, null); return }
    const curr = (ev.data as FollowEvent).follower_count
    const prev = (followerEvts[i + 1].data as FollowEvent).follower_count
    followerDeltaMap.set(key, curr - prev)
  })

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader
        icon={<History size={13} className="text-accent-mint" />}
        title="전체 이벤트"
        count={unified.length}
        accent="text-accent-mint"
      />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-32">타입</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-44">닉네임</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide">내용</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">일시</th>
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {unified.map((ev, idx) => {
            const cfg        = TYPE_CFG[ev.kind]
            const dateLabel  = fmtDate(ev.created_at)
            const prevDate   = idx > 0 ? fmtDate(unified[idx - 1].created_at) : null
            const showSep    = dateLabel !== prevDate
            const nickname   = ev.kind === 'donation' || ev.kind === 'subscription'
              ? ev.data.nickname
              : ev.data.nickname || '-'
            const evKey      = `${ev.kind}-${ev.id}`
            const delta      = followerDeltaMap.get(evKey) ?? null
            const count      = (ev.kind === 'follow' || ev.kind === 'unfollow')
              ? (ev.data as FollowEvent).follower_count
              : 0
            const isMilestone = (ev.kind === 'follow' || ev.kind === 'unfollow') && MILESTONES.includes(count)

            return [
              showSep && (
                <tr key={`sep-${evKey}`}>
                  <td
                    colSpan={5}
                    className="px-4 py-1.5 text-[10px] font-bold text-text-muted/50 bg-bg-outer/40 border-t border-b border-border/40 tracking-widest uppercase select-none"
                  >
                    {dateLabel}
                  </td>
                </tr>
              ),
              <tr key={evKey} className="border-b border-border/30 hover:bg-white/[0.04] transition-colors group">

                {/* 타입 배지 + 왼쪽 색상 accent bar */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-[3px] h-6 rounded-full shrink-0 ${cfg.bar} opacity-70`} />
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${cfg.badge}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>
                </td>

                {/* 닉네임 */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={nickname} />
                    <span className="text-sm font-semibold text-text-primary truncate max-w-[120px]">{nickname}</span>
                  </div>
                </td>

                {/* 이벤트 내용 — 종류별로 다른 UI */}
                <td className="px-4 py-2.5">
                  {ev.kind === 'donation' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-yellow-400">{ev.data.amount.toLocaleString()}</span>
                        <span className="text-xs text-text-muted">치즈</span>
                      </div>
                      {ev.data.message
                        ? <span className="text-xs text-text-secondary bg-bg-outer border border-border rounded-lg px-2 py-0.5 truncate max-w-[220px]">{ev.data.message}</span>
                        : <span className="text-[11px] text-text-muted/40">메시지 없음</span>}
                    </div>
                  )}
                  {ev.kind === 'subscription' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {ev.data.month
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-accent-purple/15 text-accent-purple border border-accent-purple/20">{ev.data.month}개월</span>
                        : <span className="text-xs font-semibold text-accent-purple">신규 구독</span>}
                      {ev.data.message
                        ? <span className="text-xs text-text-secondary bg-bg-outer border border-border rounded-lg px-2 py-0.5 truncate max-w-[220px]">{ev.data.message}</span>
                        : <span className="text-[11px] text-text-muted/40">메시지 없음</span>}
                    </div>
                  )}
                  {(ev.kind === 'follow' || ev.kind === 'unfollow') && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-base font-bold ${ev.kind === 'follow' ? 'text-pink-400' : 'text-red-400'}`}>
                          {count.toLocaleString()}
                        </span>
                        <span className="text-xs text-text-muted">팔로워</span>
                      </div>
                      {delta !== null && delta !== 0 && (
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-sm font-bold ${delta > 0 ? 'text-pink-400' : 'text-red-400'}`}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                          <span className="text-[10px] text-text-muted">변화</span>
                        </div>
                      )}
                      {isMilestone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-yellow-400/10 border border-yellow-400/25 text-yellow-400">
                          ★ {count.toLocaleString()} 달성
                        </span>
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-2.5"><DateCell iso={ev.created_at} /></td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => onDelete(TABLE_MAP[ev.kind], ev.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>,
            ]
          })}
        </tbody>
      </table>
    </section>
  )
}
