/**
 * [출석 체크 페이지]
 *
 * 채팅 키워드 기반 출석 체크 기능의 설정과 기록을 관리하는 페이지.
 *
 * ── 기능 흐름 ────────────────────────────────────────────────────────────
 *   1. 스트리머가 키워드 설정 (예: "제하")
 *   2. 시청자가 채팅에 키워드 입력 → 서버가 감지
 *   3. 첫 번째 출석이면 INSERT, 이미 왔으면 UPDATE (오늘 기준)
 *   4. 봇이 "{nickname} 출석 완료! ({count}번째)" 채팅 전송
 *   5. 소켓 'attendance' 이벤트로 프론트엔드에 실시간 알림
 *
 * ── 오늘/전체 탭 ─────────────────────────────────────────────────────────
 *   오늘 탭: 오늘 출석한 사람 목록 (last_attended_date == 오늘)
 *   전체 탭: 전체 누적 출석 기록 (total_count 기준 정렬)
 *
 * ── 실시간 업데이트 (useSocket) ──────────────────────────────────────────
 *   'attendance' 소켓 이벤트를 수신하면 stats 와 목록을 자동 갱신한다.
 *   이렇게 하면 시청자가 출석 키워드를 입력하는 즉시 UI 가 반영된다.
 *
 * ── {nickname} / {count} 플레이스홀더 ────────────────────────────────────
 *   응답 메시지 템플릿에서 {nickname} 은 시청자 닉네임으로,
 *   {count} 는 누적 출석 횟수로 교체된다.
 */

import { useEffect, useRef, useState } from 'react'
import { CalendarCheck, RefreshCw, RotateCcw, Search, Settings2, Trash2 } from 'lucide-react'
import { attendanceApi, AttendanceRow, AttendanceSettings } from '../api/attendance'
import { useToastStore } from '../store/toastStore'
import { useSocket } from '../hooks/useSocket'

const LIMIT = 50

export default function AttendancePage() {
  const addToast = useToastStore((s) => s.addToast)
  const socket = useSocket()

  const [viewTab,   setViewTab]   = useState<'today' | 'all'>('today')
  const [rows,      setRows]      = useState<AttendanceRow[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(0)
  const [search,    setSearch]    = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading,   setLoading]   = useState(false)

  const [settings,      setSettings]      = useState<AttendanceSettings>({ enabled: false, keyword: '', replyTemplate: '{nickname} 출석 완료! ({count}번째)' })
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStats = async () => {
    try {
      const res = await attendanceApi.stats()
      setTodayCount(res.data.todayCount)
      setTotalCount(res.data.totalCount)
    } catch {}
  }

  const loadList = async (p = page) => {
    setLoading(true)
    try {
      const res = await attendanceApi.list({
        search: search || undefined,
        todayOnly: viewTab === 'today',
        limit: LIMIT,
        offset: p * LIMIT,
      })
      setRows(res.data.rows)
      setTotal(res.data.total)
    } catch {
      addToast({ type: 'error', title: '출석 목록 로드 실패' })
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await attendanceApi.getSettings()
      setSettings(res.data)
    } catch {}
  }

  useEffect(() => { void loadSettings() }, [])
  useEffect(() => { void loadStats() }, [])

  // 탭·검색어 변경 시 페이지 리셋
  useEffect(() => { setPage(0) }, [viewTab, search])
  useEffect(() => { void loadList(0) }, [viewTab, search])
  useEffect(() => { void loadList(page) }, [page])

  // 실시간 출석 이벤트 → stats + 목록 갱신
  useEffect(() => {
    if (!socket) return
    const handler = () => {
      void loadStats()
      void loadList(0)
      setPage(0)
    }
    socket.on('attendance', handler)
    return () => { socket.off('attendance', handler) }
  }, [socket, viewTab, search])

  const handleSettingsChange = (patch: Partial<AttendanceSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setSettingsDirty(true)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      await attendanceApi.saveSettings(settings)
      setSettingsDirty(false)
      addToast({ type: 'info', title: '출석 체크 설정 저장됨' })
    } catch {
      addToast({ type: 'error', title: '설정 저장 실패' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('출석 기록을 전부 초기화할까요? 되돌릴 수 없습니다.')) return
    try {
      await attendanceApi.reset()
      setRows([])
      setTotal(0)
      setTodayCount(0)
      setTotalCount(0)
      addToast({ type: 'info', title: '출석 기록이 초기화되었습니다' })
    } catch {
      addToast({ type: 'error', title: '초기화 실패' })
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* ── 헤더 ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <CalendarCheck size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">출석 체크</h1>

        <div className="ml-auto flex items-center gap-2">
          {/* 오늘/전체 카운터 뱃지 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-accent-mint/10 border border-accent-mint/20">
            <span className="text-xs font-bold text-accent-mint">{todayCount}명</span>
            <span className="text-[10px] text-text-muted">오늘</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-border">
            <span className="text-xs font-bold text-text-primary">{totalCount}명</span>
            <span className="text-[10px] text-text-muted">전체</span>
          </div>

          <button
            onClick={() => { void loadStats(); void loadList(page) }}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-white/5"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`p-1.5 transition-colors rounded-lg ${showSettings ? 'text-accent-mint bg-accent-mint/10' : 'text-text-muted hover:text-text-primary hover:bg-white/5'}`}
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {/* ── 설정 패널 ─────────────────────────────────────────────── */}
      {showSettings && (
        <div className="px-5 py-4 border-b border-border bg-bg-card shrink-0 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 활성화 토글 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => handleSettingsChange({ enabled: !settings.enabled })}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${settings.enabled ? 'bg-accent-mint' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-text-secondary font-medium">
                {settings.enabled ? '활성화' : '비활성화'}
              </span>
            </label>

            {/* 키워드 입력 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted shrink-0">출석 키워드</span>
              <input
                value={settings.keyword}
                onChange={(e) => handleSettingsChange({ keyword: e.target.value })}
                placeholder="예: 제하, 안녕, ㅎㅇ"
                className="w-32 px-2.5 py-1.5 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint/60"
              />
            </div>
          </div>

          {/* 응답 메시지 */}
          <div className="flex items-start gap-2">
            <span className="text-xs text-text-muted shrink-0 mt-1.5">응답 메시지</span>
            <div className="flex-1">
              <input
                value={settings.replyTemplate}
                onChange={(e) => handleSettingsChange({ replyTemplate: e.target.value })}
                placeholder="{nickname} 출석 완료! ({count}번째)"
                className="w-full px-2.5 py-1.5 text-xs bg-bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint/60"
              />
              <p className="text-[10px] text-text-muted mt-1">
                <span className="text-accent-mint font-mono">{'{nickname}'}</span> = 닉네임,&nbsp;
                <span className="text-accent-mint font-mono">{'{count}'}</span> = 누적 출석 횟수
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSettings}
              disabled={saving || !settingsDirty}
              className="px-3 py-1.5 text-xs font-medium bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? '저장 중...' : '설정 저장'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
            >
              <RotateCcw size={11} /> 기록 초기화
            </button>
          </div>
        </div>
      )}

      {/* ── 탭 + 검색 ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-bg-card">
        <div className="flex gap-0.5 bg-bg-outer border border-border rounded-xl p-1">
          {(['today', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setViewTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewTab === t ? 'bg-accent-mint text-bg-outer shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {t === 'today' ? '오늘 출석' : '전체 기록'}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => {
              const v = e.target.value
              if (searchTimer.current) clearTimeout(searchTimer.current)
              searchTimer.current = setTimeout(() => setSearch(v), 300)
            }}
            placeholder="닉네임 검색"
            className="pl-7 pr-3 py-1.5 text-xs bg-bg-outer border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint/60 w-36"
          />
        </div>
      </div>

      {/* ── 테이블 ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-14 h-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-3">
              <CalendarCheck size={24} className="text-border" />
            </div>
            <p className="text-sm font-medium text-text-muted">
              {settings.keyword ? '아직 출석한 시청자가 없습니다' : '키워드를 먼저 설정하세요'}
            </p>
            {!settings.keyword && (
              <p className="text-xs text-text-muted/60 mt-1">⚙️ 버튼을 눌러 출석 키워드를 등록하세요</p>
            )}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-card border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-text-muted font-medium">#</th>
                <th className="text-left px-4 py-2.5 text-text-muted font-medium">닉네임</th>
                <th className="text-center px-4 py-2.5 text-text-muted font-medium">출석 횟수</th>
                <th className="text-left px-4 py-2.5 text-text-muted font-medium">마지막 출석</th>
                <th className="text-left px-4 py-2.5 text-text-muted font-medium">첫 출석</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2.5 text-text-muted tabular-nums">
                    {page * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{row.nickname}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md bg-accent-mint/10 text-accent-mint font-bold tabular-nums">
                      {row.total_count}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">{fmt(row.last_attended_at)}</td>
                  <td className="px-4 py-2.5 text-text-muted">{fmt(row.first_attended_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 페이지네이션 ─────────────────────────────────────────── */}
      {total > LIMIT && (
        <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg hover:border-accent-mint/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          <span className="text-xs text-text-muted px-2 py-1 bg-bg-card border border-border rounded-lg">
            {page + 1} / {Math.ceil(total / LIMIT)} 페이지
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * LIMIT >= total}
            className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg hover:border-accent-mint/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
