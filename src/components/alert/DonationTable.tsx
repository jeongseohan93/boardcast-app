/**
 * [후원 테이블]
 *
 * 후원 이벤트 목록을 테이블 형태로 렌더링한다.
 * 닉네임·치즈 수·메시지·일시·삭제 버튼 5열 구성.
 */

import { Gift, Trash2 } from 'lucide-react'
import type { Donation } from './types'
import { Avatar, DateCell, SectionHeader } from './AlertTableParts'

interface DonationTableProps {
  rows: Donation[]
  onDelete: (id: number) => void
}

export default function DonationTable({ rows, onDelete }: DonationTableProps) {
  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <SectionHeader
        icon={<Gift size={13} className="text-yellow-400" />}
        title="후원"
        count={rows.length}
        accent="text-yellow-400"
      />
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-bg-outer/50">
            <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-40">닉네임</th>
            <th className="text-right px-4 py-2 text-[11px] font-semibold text-text-muted tracking-wide w-32">후원 치즈</th>
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
              <td className="px-4 py-2.5 text-right">
                <span className="text-sm font-bold text-yellow-400">{row.amount.toLocaleString()}</span>
                <span className="text-xs text-text-muted ml-1">치즈</span>
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
