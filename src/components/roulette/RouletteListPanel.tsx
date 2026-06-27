/**
 * [룰렛 목록 패널] — 왼쪽 사이드 패널
 *
 * 세 개의 카드로 구성된다:
 *
 *   1. 룰렛 목록 카드
 *      - 룰렛 추가(+) / 선택 / 이름 인라인 편집 / 삭제
 *      - 점(●)을 클릭하면 enabled 토글 즉시 저장
 *      - OBS 브라우저 소스 URL 표시
 *
 *   2. 리스트 항목 카드
 *      - 룰렛 결과 누적을 위한 항목 목록 (numeric: 숫자, count: 횟수)
 *      - 이름 인라인 편집 / 수치 인라인 편집 / 초기화 / 삭제
 *      - 새 항목 추가 폼 (이름 + 타입 + 추가 버튼)
 *
 *   3. 배그 딜 연동 카드 (pubgTracking이 null이면 렌더링하지 않음)
 *      - 플레이어 닉네임·플랫폼, 차감 리스트 항목 선택
 *      - 팀원 딜 합산 토글
 *      - 활성/비활성 토글 + 즉시 폴링(↻) 버튼
 *
 * 상태 분리 전략:
 *   - 인라인 편집(renamingId, renameValue 등) 같은 UI 전용 상태는 이 컴포넌트가 내부적으로 관리
 *   - roulettes, listItems 같은 공유 데이터는 props로 받아 콜백으로만 변경을 알린다
 */

import { useState } from 'react'
import {
  Dices, Gamepad2, Link, List, Pencil, Plus, RefreshCw, RotateCcw,
  ToggleLeft, ToggleRight, Trash2,
} from 'lucide-react'
import { pubgApi, rouletteListApi } from '../../api/client'
import { useToastStore } from '../../store/toastStore'
import type { RouletteConfig, RouletteListItem } from './types'

interface PubgTracking {
  name: string
  platform: string
  listItemId: string
  enabled: boolean
  includeTeamDamage: boolean
  lastPolledAt?: string
  lastError?: string
  lastApplied?: { damage: number; teamDamage?: number; appliedAt: string; gameMode?: string }
}

interface RouletteListPanelProps {
  roulettes: RouletteConfig[]
  selectedId: string | null
  listItems: RouletteListItem[]
  saving: boolean
  initialPubgTracking: PubgTracking | null
  onSelectId: (id: string) => void
  onCreateRoulette: () => void
  onDeleteRoulette: (id: string) => void
  /** roulette 하나를 즉시 저장 — enabled 토글 / 이름 변경 등에 사용 */
  onSaveSelected: (r: RouletteConfig) => Promise<void>
  /** listItems 전체 배열을 교체 — 목록 수정 결과를 부모에게 반영 */
  onUpdateListItems: (items: RouletteListItem[]) => void
}

export default function RouletteListPanel({
  roulettes, selectedId, listItems, saving, initialPubgTracking,
  onSelectId, onCreateRoulette, onDeleteRoulette, onSaveSelected, onUpdateListItems,
}: RouletteListPanelProps) {
  const addToast = useToastStore((s) => s.addToast)

  /* 룰렛 이름 인라인 편집 */
  const [renamingId, setRenamingId]       = useState<string | null>(null)
  const [renameValue, setRenameValue]     = useState('')

  /* 리스트 항목 이름 인라인 편집 */
  const [renamingListId, setRenamingListId]     = useState<string | null>(null)
  const [renameListValue, setRenameListValue]   = useState('')

  /* 리스트 항목 수치 인라인 편집 */
  const [editingTotalId, setEditingTotalId]     = useState<string | null>(null)
  const [editingTotalValue, setEditingTotalValue] = useState('')

  /* 리스트 항목 추가 폼 */
  const [newListName, setNewListName] = useState('')
  const [newListType, setNewListType] = useState<'numeric' | 'count'>('numeric')

  /* PUBG 딜 연동 상태 (서버에서 받은 initialPubgTracking으로 초기화) */
  const [pubgTracking, setPubgTracking] = useState<PubgTracking | null>(initialPubgTracking)
  const [pubgPolling,  setPubgPolling]  = useState(false)

  /* ── 룰렛 이름 인라인 편집 ───────────────────────────────────────────── */
  const startRename  = (r: RouletteConfig) => { setRenamingId(r.id); setRenameValue(r.name) }
  const commitRename = async (r: RouletteConfig) => {
    const name = renameValue.trim().slice(0, 30) || r.name
    setRenamingId(null)
    if (name !== r.name) await onSaveSelected({ ...r, name })
  }

  /* ── 리스트 항목 조작 ────────────────────────────────────────────────── */
  const createListItem = async () => {
    if (!newListName.trim()) return
    try {
      const res = await rouletteListApi.create({ name: newListName.trim(), type: newListType })
      onUpdateListItems([...listItems, res.data as RouletteListItem])
      setNewListName('')
    } catch {
      addToast({ type: 'error', title: '리스트 항목 추가 실패' })
    }
  }

  const deleteListItem = async (id: string) => {
    try {
      await rouletteListApi.delete(id)
      onUpdateListItems(listItems.filter((i) => i.id !== id))
      /* 이 항목에 연결된 룰렛이 있으면 연결 해제 */
      const linked = roulettes.filter((r) => r.listItemId === id)
      for (const r of linked) await onSaveSelected({ ...r, listItemId: undefined })
    } catch {
      addToast({ type: 'error', title: '삭제 실패' })
    }
  }

  const resetListItem = async (id: string) => {
    try {
      const res = await rouletteListApi.reset(id)
      onUpdateListItems(listItems.map((i) => (i.id === id ? (res.data as RouletteListItem) : i)))
      addToast({ type: 'info', title: '초기화되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '초기화 실패' })
    }
  }

  const startRenameList  = (item: RouletteListItem) => { setRenamingListId(item.id); setRenameListValue(item.name) }
  const commitRenameList = async (item: RouletteListItem) => {
    const name = renameListValue.trim().slice(0, 30) || item.name
    setRenamingListId(null)
    if (name === item.name) return
    try {
      const res = await rouletteListApi.update(item.id, { name })
      onUpdateListItems(listItems.map((i) => (i.id === item.id ? (res.data as RouletteListItem) : i)))
    } catch {}
  }

  const startEditTotal  = (item: RouletteListItem) => { setEditingTotalId(item.id); setEditingTotalValue(String(item.total)) }
  const commitEditTotal = async (item: RouletteListItem) => {
    const val = parseInt(editingTotalValue, 10)
    setEditingTotalId(null)
    if (isNaN(val) || val === item.total) return
    try {
      const res = await rouletteListApi.setTotal(item.id, val)
      onUpdateListItems(listItems.map((i) => (i.id === item.id ? (res.data as RouletteListItem) : i)))
    } catch {
      addToast({ type: 'error', title: '수치 변경 실패' })
    }
  }

  /* ── PUBG 딜 연동 ────────────────────────────────────────────────────── */
  const handlePubgField = async (field: Partial<PubgTracking>) => {
    if (!pubgTracking) return
    const prev = pubgTracking
    setPubgTracking({ ...pubgTracking, ...field })
    try {
      const res = await pubgApi.setTracking(field as Parameters<typeof pubgApi.setTracking>[0])
      setPubgTracking(res.data)
    } catch {
      setPubgTracking(prev)
      addToast({ type: 'error', title: '배그 설정 저장 실패' })
    }
  }

  const handlePubgToggle = async () => {
    if (!pubgTracking) return
    const next = !pubgTracking.enabled
    if (next && !pubgTracking.name.trim())   { addToast({ type: 'error', title: '닉네임을 먼저 입력하세요' }); return }
    if (next && !pubgTracking.listItemId)    { addToast({ type: 'error', title: '연결할 리스트 항목을 선택하세요' }); return }
    try {
      const res = await pubgApi.setTracking({ enabled: next })
      setPubgTracking(res.data)
      addToast({ type: 'info', title: next ? '딜 추적 시작' : '딜 추적 중지' })
    } catch {
      addToast({ type: 'error', title: '설정 변경 실패' })
    }
  }

  const handlePubgPollNow = async () => {
    setPubgPolling(true)
    try {
      const res = await pubgApi.pollNow()
      setPubgTracking(res.data)
      const applied = res.data?.lastApplied
      if (applied) addToast({ type: 'info', title: '딜 차감', message: `-${applied.damage.toLocaleString()}` })
      else          addToast({ type: 'info', title: '새 경기 없음' })
    } catch {
      addToast({ type: 'error', title: '폴링 실패' })
    } finally {
      setPubgPolling(false)
    }
  }

  return (
    <div className="w-80 shrink-0 flex flex-col gap-3 min-h-0">

      {/* ── 룰렛 목록 카드 ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-text-primary">룰렛</span>
          <button
            onClick={onCreateRoulette}
            className="p-1.5 bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 transition-all"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {roulettes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <Dices size={24} className="text-border mb-2" />
              <p className="text-xs text-text-muted">룰렛을 추가하세요</p>
            </div>
          )}
          {roulettes.map((r) => (
            <div
              key={r.id}
              onClick={() => onSelectId(r.id)}
              className={`group flex items-center gap-2 px-3 py-3 cursor-pointer transition-colors ${
                selectedId === r.id
                  ? 'bg-accent-mint/10 border-l-2 border-accent-mint'
                  : 'hover:bg-white/2 border-l-2 border-transparent'
              }`}
            >
              {/* enabled 토글 점 — 클릭 시 즉시 저장 */}
              <button
                onClick={(e) => { e.stopPropagation(); void onSaveSelected({ ...r, enabled: !r.enabled }) }}
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${r.enabled ? 'bg-accent-mint' : 'bg-border'}`}
              />
              {renamingId === r.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-bg-input border border-accent-mint rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void commitRename(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename(r)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-xs text-text-primary truncate">{r.name}</span>
              )}
              {r.listItemId && <Link size={10} className="text-accent-mint shrink-0" />}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={(e) => { e.stopPropagation(); startRename(r) }} className="p-1 text-text-muted hover:text-text-primary">
                  <Pencil size={10} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); void onDeleteRoulette(r.id) }} className="p-1 text-text-muted hover:text-red-400">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* OBS 브라우저 소스 URL 안내 */}
        <div className="px-3 py-2.5 border-t border-border shrink-0 space-y-1.5">
          <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">OBS 브라우저 소스</p>
          <div className="space-y-1">
            <div>
              <p className="text-[9px] text-text-muted mb-0.5">룰렛</p>
              <code className="text-[9px] text-text-secondary break-all select-all">http://localhost:3001/overlay/roulette</code>
            </div>
            <div>
              <p className="text-[9px] text-text-muted mb-0.5">결과 리스트</p>
              <code className="text-[9px] text-text-secondary break-all select-all">http://localhost:3001/overlay/roulette-list</code>
            </div>
          </div>
        </div>
      </div>

      {/* ── 리스트 항목 카드 ────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5">
            <List size={13} className="text-accent-mint" />
            <span className="text-sm font-semibold text-text-primary">리스트 항목</span>
          </div>
          <span className="text-xs text-text-muted">{listItems.length}개</span>
        </div>

        <div className="max-h-[120px] overflow-y-auto divide-y divide-border">
          {listItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-6">
              <List size={20} className="text-border mb-2" />
              <p className="text-xs text-text-muted">아래에서 항목을 추가하세요</p>
            </div>
          )}
          {listItems.map((item) => (
            <div key={item.id} className="group flex items-center gap-2 px-3 py-2.5 hover:bg-white/2 transition-colors">
              <div className="flex-1 min-w-0">
                {renamingListId === item.id ? (
                  <input
                    autoFocus
                    className="w-full bg-bg-input border border-accent-mint rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
                    value={renameListValue}
                    onChange={(e) => setRenameListValue(e.target.value)}
                    onBlur={() => void commitRenameList(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')  void commitRenameList(item)
                      if (e.key === 'Escape') setRenamingListId(null)
                    }}
                  />
                ) : (
                  <span className="text-xs font-medium text-text-primary truncate block">{item.name}</span>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-text-muted">{item.type === 'numeric' ? '숫자' : '횟수'}</span>
                  {editingTotalId === item.id ? (
                    <input
                      autoFocus
                      type="number"
                      className="w-16 bg-bg-input border border-accent-mint rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:outline-none"
                      value={editingTotalValue}
                      onChange={(e) => setEditingTotalValue(e.target.value)}
                      onBlur={() => void commitEditTotal(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')  void commitEditTotal(item)
                        if (e.key === 'Escape') setEditingTotalId(null)
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => startEditTotal(item)}
                      title="클릭해서 수치 수정"
                      className={`text-[10px] font-bold hover:underline transition-opacity ${
                        item.type === 'numeric'
                          ? (item.total > 0 ? 'text-accent-mint' : item.total < 0 ? 'text-red-400' : 'text-text-muted')
                          : 'text-accent-mint'
                      }`}
                    >
                      {item.type === 'numeric'
                        ? (item.total > 0 ? `+${item.total.toLocaleString()}` : item.total === 0 ? '0' : item.total.toLocaleString())
                        : `×${item.total}`
                      }
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => startRenameList(item)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-white/5 transition-colors">
                  <Pencil size={10} />
                </button>
                <button onClick={() => void resetListItem(item.id)} className="p-1.5 text-text-muted hover:text-accent-mint rounded-lg hover:bg-white/5 transition-colors">
                  <RotateCcw size={10} />
                </button>
                <button onClick={() => void deleteListItem(item.id)} className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 추가 폼 */}
        <div className="p-3 border-t border-border shrink-0 space-y-2">
          <input
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
            placeholder="항목 이름 (예: 딜, 방해)..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void createListItem()}
          />
          <div className="flex gap-2">
            <div className="flex flex-1 rounded-xl border border-border overflow-hidden">
              {(['numeric', 'count'] as const).map((t, i) => (
                <button
                  key={t}
                  onClick={() => setNewListType(t)}
                  className={`flex-1 py-1.5 text-[11px] font-medium transition-all ${i === 0 ? 'border-r border-border' : ''} ${
                    newListType === t ? 'bg-accent-mint/15 text-accent-mint' : 'text-text-muted hover:text-text-primary hover:bg-white/3'
                  }`}
                >
                  {t === 'numeric' ? '숫자' : '횟수'}
                </button>
              ))}
            </div>
            <button
              onClick={() => void createListItem()}
              disabled={!newListName.trim()}
              className="px-3 py-1.5 bg-accent-mint text-bg-outer rounded-xl text-xs font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              추가
            </button>
          </div>
        </div>
      </div>

      {/* ── 배그 딜 연동 카드 ───────────────────────────────────────────── */}
      {pubgTracking && (
        <div className="shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-1.5">
              <Gamepad2 size={13} className="text-yellow-400" />
              <span className="text-sm font-semibold text-text-primary">배그 딜 연동</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => void handlePubgPollNow()}
                disabled={pubgPolling || !pubgTracking.enabled}
                title="지금 확인"
                className="p-1 text-text-muted hover:text-text-secondary rounded transition-colors disabled:opacity-30"
              >
                <RefreshCw size={12} className={pubgPolling ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => void handlePubgToggle()}>
                {pubgTracking.enabled
                  ? <ToggleRight size={24} className="text-yellow-400" />
                  : <ToggleLeft  size={24} className="text-text-muted" />}
              </button>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {/* 닉네임 + 플랫폼 */}
            <div className="flex gap-2">
              <input
                value={pubgTracking.name}
                onChange={(e) => setPubgTracking((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                onBlur={() => void handlePubgField({ name: pubgTracking.name })}
                placeholder="닉네임"
                className="flex-1 min-w-0 bg-bg-input border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
              />
              <select
                value={pubgTracking.platform || 'steam'}
                onChange={(e) => void handlePubgField({ platform: e.target.value })}
                className="bg-bg-input border border-border rounded-xl px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint"
              >
                <option value="steam">Steam</option>
                <option value="kakao">Kakao</option>
                <option value="psn">PSN</option>
                <option value="xbox">Xbox</option>
              </select>
            </div>

            {/* 차감 리스트 항목 선택 */}
            <select
              value={pubgTracking.listItemId || ''}
              onChange={(e) => void handlePubgField({ listItemId: e.target.value })}
              className="w-full bg-bg-input border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint"
            >
              <option value="">차감할 항목 선택</option>
              {listItems.filter((i) => i.type === 'numeric').map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>

            {/* 팀원 딜 합산 토글 */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">팀원 딜 합산</span>
              <button onClick={() => void handlePubgField({ includeTeamDamage: !pubgTracking.includeTeamDamage })}>
                {pubgTracking.includeTeamDamage
                  ? <ToggleRight size={20} className="text-yellow-400" />
                  : <ToggleLeft  size={20} className="text-text-muted" />}
              </button>
            </div>

            {/* 마지막 결과 표시 */}
            {pubgTracking.lastError ? (
              <p className="text-[10px] text-red-400 truncate">{pubgTracking.lastError}</p>
            ) : pubgTracking.lastApplied ? (
              <p className="text-[10px] text-text-muted">
                마지막 차감:{' '}
                <span className="text-red-400 font-bold">
                  -{(pubgTracking.lastApplied.damage + (pubgTracking.lastApplied.teamDamage ?? 0)).toLocaleString()}
                </span>
                {pubgTracking.lastApplied.teamDamage != null && pubgTracking.lastApplied.teamDamage > 0 && (
                  <span className="text-text-muted">
                    {' '}(나 {pubgTracking.lastApplied.damage.toLocaleString()} + 팀 {pubgTracking.lastApplied.teamDamage.toLocaleString()})
                  </span>
                )}
                {' '}·{' '}
                {new Date(pubgTracking.lastApplied.appliedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : pubgTracking.lastPolledAt ? (
              <p className="text-[10px] text-text-muted">
                마지막 확인: {new Date(pubgTracking.lastPolledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : (
              <p className="text-[10px] text-text-muted">경기 종료 시 딜량이 자동으로 차감됩니다 (5분 주기)</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
