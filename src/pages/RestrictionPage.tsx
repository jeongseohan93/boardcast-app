import { useEffect, useMemo, useState } from 'react'
import { Ban, Clock, RefreshCw, Search, ShieldBan, ShieldCheck, UserX } from 'lucide-react'
import { channelApi, chatApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

interface RestrictionRow {
  restrictedChannelId: string
  restrictedChannelName?: string
  createdDate?: string
  releaseDate?: string
}

function rowsFromResponse(data: unknown): RestrictionRow[] {
  const root = data as any
  const candidates = [
    root?.data,
    root?.content?.data,
    root?.content,
    root,
  ]
  const rows = candidates.find(Array.isArray) || []
  return rows
    .map((row: any) => ({
      restrictedChannelId: String(row?.restrictedChannelId || row?.targetChannelId || row?.channelId || ''),
      restrictedChannelName: row?.restrictedChannelName || row?.channelName || row?.nickname,
      createdDate: row?.createdDate,
      releaseDate: row?.releaseDate,
    }))
    .filter((row: RestrictionRow) => row.restrictedChannelId)
}

function nextFromResponse(data: unknown): string | undefined {
  const root = data as any
  return root?.page?.next || root?.content?.page?.next || root?.next || root?.content?.next
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function RestrictionPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [rows, setRows] = useState<RestrictionRow[]>([])
  const [next, setNext] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [targetChannelId, setTargetChannelId] = useState('')
  const [query, setQuery] = useState('')
  const [tempTargetId, setTempTargetId] = useState('')
  const [chatChannelId, setChatChannelId] = useState('')
  const [tempBusy, setTempBusy] = useState(false)

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      row.restrictedChannelId.toLowerCase().includes(q) ||
      (row.restrictedChannelName || '').toLowerCase().includes(q)
    )
  }, [query, rows])

  const load = async (cursor?: string, append = false) => {
    setLoading(true)
    try {
      const res = await channelApi.getRestrictions({ size: 30, next: cursor })
      const nextRows = rowsFromResponse(res.data)
      setRows((prev) => append ? [...prev, ...nextRows] : nextRows)
      setNext(nextFromResponse(res.data))
    } catch {
      addToast({ type: 'error', title: '활동 제한 목록 조회 실패' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    chatApi.getChatChannelId()
      .then(res => { if (res.data.chatChannelId) setChatChannelId(res.data.chatChannelId) })
      .catch(() => {})
  }, [])

  const addRestriction = async () => {
    const id = targetChannelId.trim()
    if (!id) return
    setBusyId(id)
    try {
      await channelApi.addRestriction(id)
      setTargetChannelId('')
      addToast({ type: 'info', title: '활동 제한 추가 완료' })
      await load()
    } catch {
      addToast({ type: 'error', title: '활동 제한 추가 실패' })
    } finally {
      setBusyId('')
    }
  }

  const addTempRestriction = async () => {
    const tid = tempTargetId.trim()
    const cid = chatChannelId.trim()
    if (!tid || !cid) return
    setTempBusy(true)
    try {
      await channelApi.addTemporaryRestriction({ targetChannelId: tid, chatChannelId: cid })
      setTempTargetId('')
      addToast({ type: 'info', title: `${tid} 임시제한 추가 완료` })
    } catch {
      addToast({ type: 'error', title: '임시제한 추가 실패' })
    } finally {
      setTempBusy(false)
    }
  }

  const removeTempRestriction = async () => {
    const tid = tempTargetId.trim()
    const cid = chatChannelId.trim()
    if (!tid || !cid) return
    setTempBusy(true)
    try {
      await channelApi.removeTemporaryRestriction(tid, cid)
      setTempTargetId('')
      addToast({ type: 'info', title: `${tid} 임시제한 해제 완료` })
    } catch {
      addToast({ type: 'error', title: '임시제한 해제 실패' })
    } finally {
      setTempBusy(false)
    }
  }

  const removeRestriction = async (row: RestrictionRow) => {
    setBusyId(row.restrictedChannelId)
    try {
      await channelApi.removeRestriction(row.restrictedChannelId)
      setRows((prev) => prev.filter((item) => item.restrictedChannelId !== row.restrictedChannelId))
      addToast({ type: 'info', title: `${row.restrictedChannelName || row.restrictedChannelId} 제한 해제` })
    } catch {
      addToast({ type: 'error', title: '활동 제한 해제 실패' })
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <ShieldBan size={18} className="text-accent-mint" />
        <div>
          <h1 className="text-base font-bold text-text-primary">활동 제한</h1>
          <p className="text-xs text-text-muted mt-0.5">치지직 활동 제한 목록을 조회하고 해제합니다</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Ban size={14} className="text-accent-danger" />
              <span className="text-sm font-semibold text-text-primary">제한된 사용자</span>
              <span className="text-xs text-text-muted">{rows.length}명</span>
              <div className="ml-auto relative w-56">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-bg-outer border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
                  placeholder="닉네임 또는 채널ID 검색"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-outer/60 text-text-muted">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">사용자</th>
                    <th className="text-left px-4 py-2.5 font-medium">채널 ID</th>
                    <th className="text-left px-4 py-2.5 font-medium">제한일</th>
                    <th className="text-left px-4 py-2.5 font-medium">해제 예정</th>
                    <th className="text-right px-4 py-2.5 font-medium">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.restrictedChannelId} className="border-t border-border/70 hover:bg-white/3">
                      <td className="px-4 py-3 text-text-primary font-medium">{row.restrictedChannelName || '-'}</td>
                      <td className="px-4 py-3 text-text-muted font-mono text-xs">{row.restrictedChannelId}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{formatDate(row.createdDate)}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{formatDate(row.releaseDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeRestriction(row)}
                          disabled={busyId === row.restrictedChannelId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-accent-success/30 text-accent-success hover:bg-accent-success/10 transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck size={12} /> 해제
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                        <UserX size={24} className="mx-auto mb-2 text-border" />
                        활동 제한 사용자가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {next && (
              <div className="p-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => load(next, true)}
                  disabled={loading}
                  className="w-full py-2 text-xs border border-border rounded-xl text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-50"
                >
                  더 불러오기
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldBan size={14} className="text-accent-mint" />
                <span className="text-sm font-semibold text-text-primary">활동 제한 추가</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed mb-3">
                채팅창에서 닉네임을 눌러 바로 활동제한할 수도 있습니다.
              </p>
              <div className="flex gap-2">
                <input
                  value={targetChannelId}
                  onChange={(e) => setTargetChannelId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRestriction()}
                  className="flex-1 bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
                  placeholder="채널 ID 입력"
                />
                <button
                  type="button"
                  onClick={addRestriction}
                  disabled={!targetChannelId.trim() || !!busyId}
                  className="px-3 bg-accent-mint text-bg-outer rounded-xl text-sm font-semibold hover:brightness-110 disabled:opacity-40 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-accent-warning" />
                <span className="text-sm font-semibold text-text-primary">임시 제한</span>
              </div>
              {!chatChannelId ? (
                <p className="text-xs text-text-muted leading-relaxed py-2">
                  라이브 중 채팅이 수신되면 자동으로 활성화됩니다.
                </p>
              ) : (
                <>
                  <p className="text-xs text-text-muted leading-relaxed mb-3">
                    채팅창에서 닉네임을 눌러도 바로 임시제한할 수 있습니다.
                  </p>
                  <div className="space-y-2">
                    <input
                      value={tempTargetId}
                      onChange={(e) => setTempTargetId(e.target.value)}
                      className="w-full bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-warning"
                      placeholder="제한할 사용자의 채널 ID"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={addTempRestriction}
                        disabled={!tempTargetId.trim() || tempBusy}
                        className="flex-1 py-2 text-xs rounded-xl border border-accent-warning/40 text-accent-warning hover:bg-accent-warning/10 disabled:opacity-40 transition-colors font-semibold"
                      >
                        임시제한 추가
                      </button>
                      <button
                        type="button"
                        onClick={removeTempRestriction}
                        disabled={!tempTargetId.trim() || tempBusy}
                        className="flex-1 py-2 text-xs rounded-xl border border-accent-success/30 text-accent-success hover:bg-accent-success/10 disabled:opacity-40 transition-colors font-semibold"
                      >
                        임시제한 해제
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
