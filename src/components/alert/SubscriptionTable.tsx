/**
 * [구독 테이블]
 *
 * 구독 이벤트 목록을 테이블 형태로 렌더링한다.
 * 닉네임·구독 기간·메시지·일시·삭제 버튼 5열 구성.
 * month 값이 없으면 '-' 표시 (치지직에서 기간 정보를 보내지 않는 경우).
 */

import { Star, Trash2 } from 'lucide-react'
import type { Subscription } from './types'
import { Avatar, DateCell, SectionHeader } from './AlertTableParts'

interface SubscriptionTableProps {
  rows: Subscription[]
  onDelete: (id: number) => void
}

export default function SubscriptionTable({ rows, onDelete }: SubscriptionTableProps) {
  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader
        icon={<Star size={13} className="text-accent-purple" />}
        title="구독"
        count={rows.length}
        accent="text-accent-purple"
      />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-40">닉네임</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">구독 기간</th>
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide">메시지</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-24">일시</th>
            <th className="px-4 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/30 hover:bg-white/[0.04] transition-colors group">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={row.nickname} />
                  <span className="text-sm font-semibold text-text-primary">{row.nickname}</span>
                </div>
              </td>
              <td className="px-4 py-2.5">
                {row.month ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-accent-purple/15 text-accent-purple border border-accent-purple/20">
                    {row.month}개월
                  </span>
                ) : (
                  <span className="text-xs text-text-muted/50">-</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-text-secondary max-w-xs">
                {row.message
                  ? <span className="line-clamp-1">{row.message}</span>
                  : <span className="text-text-muted/50">없음</span>}
              </td>
              <td className="px-4 py-2.5"><DateCell iso={row.created_at} /></td>
              <td className="px-4 py-2.5">
                <button
                  onClick={() => onDelete(row.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
