/**
 * [팔로우 / 팔로우 취소 테이블]
 *
 * tone='follow' 이면 팔로우 목록, tone='unfollow' 이면 팔로우 취소 목록을 렌더링.
 * 두 케이스는 구조가 거의 동일하므로 하나의 컴포넌트로 처리한다.
 *
 * 차이점:
 *   - tone='follow'  → 팔로워 추이(증감) 열 표시, 활동제한 버튼 없음
 *   - tone='unfollow'→ 활동제한 버튼 열 표시 (restrictedIds·busyIds로 상태 제어)
 *
 * 날짜 구분선:
 *   최신순 정렬 기준으로 날짜가 바뀌면 날짜 구분 행(separator)을 삽입한다.
 *
 * 마일스톤 배지:
 *   MILESTONES 배열에 해당하는 팔로워 수 달성 시 황색 뱃지를 표시한다.
 */

import { Trash2 } from 'lucide-react'
import type { FollowEvent } from './types'
import { MILESTONES, fmtDate } from './types'
import { Avatar, DateCell, SectionHeader, RestrictionButton } from './AlertTableParts'

interface FollowTableProps {
  title: string
  icon: React.ReactNode
  rows: FollowEvent[]
  tone: 'follow' | 'unfollow'
  restrictedIds?: Set<string>
  busyIds?: Set<string>
  onRestriction?: (row: FollowEvent) => void
  onDelete: (id: number) => void
}

export default function FollowTable({
  title, icon, rows, tone, restrictedIds, busyIds, onRestriction, onDelete,
}: FollowTableProps) {
  const isUnfollow = tone === 'unfollow'
  const accentClass = isUnfollow ? 'text-red-400' : 'text-pink-400'

  /* 최신순 rows 배열에서 이전 이벤트 대비 팔로워 증감 계산 */
  const deltas: (number | null)[] = rows.map((row, idx) => {
    if (idx === rows.length - 1) return null
    return row.follower_count - rows[idx + 1].follower_count
  })

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader icon={icon} title={title} count={rows.length} accent={accentClass} />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-44">닉네임</th>
            {!isUnfollow
              ? <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide">팔로워 추이</th>
              : <th className="px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide" />}
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-28">팔로워 수</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">일시</th>
            {isUnfollow && <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-28">활동제한</th>}
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const targetId    = row.target_channel_id ?? ''
            const restricted  = targetId ? !!restrictedIds?.has(targetId) : false
            const busy        = targetId ? !!busyIds?.has(targetId) : false
            const dateLabel   = fmtDate(row.created_at)
            const prevDate    = idx > 0 ? fmtDate(rows[idx - 1].created_at) : null
            const showSep     = dateLabel !== prevDate
            const delta       = deltas[idx]
            const isMilestone = MILESTONES.includes(row.follower_count)

            return [
              showSep && (
                <tr key={`sep-${row.id}`}>
                  <td
                    colSpan={6}
                    className="px-4 py-1.5 text-[10px] font-bold text-text-muted/50 bg-bg-outer/40 border-t border-b border-border/40 tracking-widest uppercase select-none"
                  >
                    {dateLabel}
                  </td>
                </tr>
              ),
              <tr key={row.id} className="border-b border-border/30 hover:bg-white/[0.04] transition-colors group">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.nickname || '?'} />
                    <span className="text-sm font-semibold text-text-primary">{row.nickname || '-'}</span>
                  </div>
                </td>

                {/* 팔로워 추이 / 마일스톤 셀 */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    {isMilestone && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-yellow-400/10 border border-yellow-400/25 text-yellow-400">
                        ★ {row.follower_count.toLocaleString()} 달성
                      </span>
                    )}
                    {!isUnfollow && delta !== null && delta !== 0 && (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-base font-bold leading-none ${delta > 0 ? 'text-pink-400' : 'text-red-400'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                        <span className="text-[10px] text-text-muted">팔로워</span>
                      </div>
                    )}
                  </div>
                </td>

                <td className={`px-4 py-2.5 text-right text-sm font-semibold ${isUnfollow ? 'text-red-400' : 'text-pink-400'}`}>
                  {row.follower_count.toLocaleString()}
                </td>
                <td className="px-4 py-2.5"><DateCell iso={row.created_at} /></td>
                {isUnfollow && (
                  <td className="px-4 py-2.5 text-right">
                    <RestrictionButton
                      restricted={restricted}
                      busy={busy}
                      disabled={!targetId}
                      onClick={() => onRestriction?.(row)}
                    />
                  </td>
                )}
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => onDelete(row.id)}
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
