import { useEffect, useState } from 'react'
import {
  Check, Dices, Gamepad2, Link, Palette, Play, Plus,
  RefreshCw, RotateCcw, Save, ToggleLeft, ToggleRight, Trash2, Zap, Pencil, List,
} from 'lucide-react'
import { pubgApi, rouletteApi, rouletteListApi } from '../api/client'
import { useToastStore } from '../store/toastStore'
import { useSocket } from '../hooks/useSocket'

interface RouletteItem {
  id: string
  label: string
  weight: number
}

interface RouletteConfig {
  id: string
  name: string
  enabled: boolean
  triggerAmounts: number[]
  items: RouletteItem[]
  theme: string
  mode: 'wheel' | 'slot'
  listItemId?: string
}

interface RouletteListItem {
  id: string
  name: string
  type: 'numeric' | 'count'
  total: number
  entries: { label: string; count: number; value: number }[]
}

const COLORS = ['#00FFA3','#A78BFA','#F4A261','#72EFDD','#FF6B9D','#FFD166','#06D6A0','#C77DFF']

const DEFAULT_ROULETTE: Omit<RouletteConfig, 'id'> = {
  name: '새 룰렛',
  enabled: false,
  triggerAmounts: [],
  items: [
    { id: '1', label: '항목 1', weight: 1 },
    { id: '2', label: '항목 2', weight: 1 },
    { id: '3', label: '항목 3', weight: 1 },
  ],
  theme: 'default',
  mode: 'wheel',
}

const ROULETTE_THEMES = [
  { id: 'default', name: '기본' },
  { id: '레트로', name: '레트로' },
  { id: '마법', name: '마법' },
  { id: '베이커리', name: '베이커리' },
  { id: '사이버펑크', name: '사이버펑크' },
  { id: '숲 컨셉', name: '숲 컨셉' },
  { id: '칠판', name: '칠판' },
  { id: '해적', name: '해적' },
]

const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'
const THEME_BASE = `http://${host}:3001/overlay/roulette-themes`

export default function RoulettePage() {
  const addToast = useToastStore((s) => s.addToast)
  const socket = useSocket()

  const [roulettes, setRoulettes] = useState<RouletteConfig[]>([])
  const [listItems, setListItems] = useState<RouletteListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testAffectsList, setTestAffectsList] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newWeight, setNewWeight] = useState(1)
  const [newAmount, setNewAmount] = useState('')

  // PUBG 딜 추적
  const [pubgTracking, setPubgTracking] = useState<{
    name: string; platform: string; listItemId: string; enabled: boolean; includeTeamDamage: boolean
    lastPolledAt?: string; lastError?: string
    lastApplied?: { damage: number; teamDamage?: number; appliedAt: string; gameMode?: string }
  } | null>(null)
  const [pubgPolling, setPubgPolling] = useState(false)

  // 리스트 항목 생성 폼
  const [newListName, setNewListName] = useState('')
  const [newListType, setNewListType] = useState<'numeric' | 'count'>('numeric')
  const [renamingListId, setRenamingListId] = useState<string | null>(null)
  const [renameListValue, setRenameListValue] = useState('')
  const [editingTotalId, setEditingTotalId] = useState<string | null>(null)
  const [editingTotalValue, setEditingTotalValue] = useState('')

  const selected = roulettes.find(r => r.id === selectedId) ?? null

  useEffect(() => {
    Promise.all([rouletteApi.list(), rouletteListApi.list(), rouletteApi.getTestList(), pubgApi.getTracking()])
      .then(([rRes, lRes, tRes, pRes]) => {
        const rData = rRes.data as RouletteConfig[]
        const lData = lRes.data as RouletteListItem[]
        setRoulettes(rData)
        setListItems(lData)
        setTestAffectsList(!!(tRes.data as { testAffectsList: boolean }).testAffectsList)
        if (rData.length > 0 && !selectedId) setSelectedId(rData[0].id)
        setPubgTracking(pRes.data)
      })
      .catch(() => addToast({ type: 'error', title: '데이터 로드 실패' }))
  }, [])

  useEffect(() => {
    if (!socket) return
    const onUpdate = (item: RouletteListItem) => {
      if (!item?.id) return
      setListItems(prev => {
        const idx = prev.findIndex(i => i.id === item.id)
        if (idx === -1) return [...prev, item]
        const next = [...prev]
        next[idx] = item
        return next
      })
    }
    const onDeleted = ({ id }: { id: string }) => {
      setListItems(prev => prev.filter(i => i.id !== id))
    }
    socket.on('rouletteList:update', onUpdate)
    socket.on('rouletteList:deleted', onDeleted)
    return () => {
      socket.off('rouletteList:update', onUpdate)
      socket.off('rouletteList:deleted', onDeleted)
    }
  }, [socket])

  // ── 룰렛 저장 ─────────────────────────────────────────────────────────────
  const saveSelected = async (updated: RouletteConfig) => {
    setSaving(true)
    try {
      await rouletteApi.update(updated.id, updated)
      setRoulettes(prev => prev.map(r => r.id === updated.id ? updated : r))
      addToast({ type: 'info', title: '저장되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '저장 실패' })
    } finally {
      setSaving(false)
    }
  }

  const createRoulette = async () => {
    try {
      const res = await rouletteApi.create(DEFAULT_ROULETTE)
      const created = res.data as RouletteConfig
      setRoulettes(prev => [...prev, created])
      setSelectedId(created.id)
    } catch {
      addToast({ type: 'error', title: '룰렛 추가 실패' })
    }
  }

  const deleteRoulette = async (id: string) => {
    try {
      await rouletteApi.delete(id)
      const next = roulettes.filter(r => r.id !== id)
      setRoulettes(next)
      if (selectedId === id) setSelectedId(next[0]?.id ?? null)
    } catch {
      addToast({ type: 'error', title: '삭제 실패' })
    }
  }

  const startRename = (r: RouletteConfig) => { setRenamingId(r.id); setRenameValue(r.name) }
  const commitRename = async (r: RouletteConfig) => {
    const name = renameValue.trim().slice(0, 30) || r.name
    setRenamingId(null)
    if (name !== r.name) await saveSelected({ ...r, name })
  }

  const patch = (changes: Partial<RouletteConfig>) => {
    if (!selected) return
    setRoulettes(prev => prev.map(r => r.id === selected.id ? { ...r, ...changes } : r))
  }

  const addItem = () => {
    if (!selected || !newLabel.trim()) return
    patch({ items: [...selected.items, { id: Date.now().toString(), label: newLabel.trim(), weight: newWeight }] })
    setNewLabel(''); setNewWeight(1)
  }
  const removeItem = (itemId: string) => { if (selected) patch({ items: selected.items.filter(i => i.id !== itemId) }) }
  const updateItem = (itemId: string, field: 'label' | 'weight', value: string | number) => {
    if (selected) patch({ items: selected.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) })
  }

  const addAmount = () => {
    if (!selected) return
    const n = parseInt(newAmount, 10)
    if (!n || n <= 0 || selected.triggerAmounts.includes(n)) return
    patch({ triggerAmounts: [...selected.triggerAmounts, n].sort((a, b) => a - b) })
    setNewAmount('')
  }
  const removeAmount = (amount: number) => {
    if (selected) patch({ triggerAmounts: selected.triggerAmounts.filter(a => a !== amount) })
  }

  const handleTest = async () => {
    if (!selected) return
    setTesting(true)
    try { await rouletteApi.test(selected.id) }
    catch { addToast({ type: 'error', title: '테스트 실패 — 오버레이가 열려있는지 확인하세요.' }) }
    finally { setTimeout(() => setTesting(false), 1500) }
  }

  // ── 리스트 항목 관리 ──────────────────────────────────────────────────────
  const createListItem = async () => {
    if (!newListName.trim()) return
    try {
      const res = await rouletteListApi.create({ name: newListName.trim(), type: newListType })
      setListItems(prev => [...prev, res.data as RouletteListItem])
      setNewListName('')
    } catch {
      addToast({ type: 'error', title: '리스트 항목 추가 실패' })
    }
  }

  const deleteListItem = async (id: string) => {
    try {
      await rouletteListApi.delete(id)
      setListItems(prev => prev.filter(i => i.id !== id))
      // 연결된 룰렛 연결 해제
      const linked = roulettes.filter(r => r.listItemId === id)
      for (const r of linked) await saveSelected({ ...r, listItemId: undefined })
    } catch {
      addToast({ type: 'error', title: '삭제 실패' })
    }
  }

  const resetListItem = async (id: string) => {
    try {
      const res = await rouletteListApi.reset(id)
      setListItems(prev => prev.map(i => i.id === id ? res.data as RouletteListItem : i))
      addToast({ type: 'info', title: '초기화되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '초기화 실패' })
    }
  }

  const startRenameList = (item: RouletteListItem) => { setRenamingListId(item.id); setRenameListValue(item.name) }
  const commitRenameList = async (item: RouletteListItem) => {
    const name = renameListValue.trim().slice(0, 30) || item.name
    setRenamingListId(null)
    if (name === item.name) return
    try {
      const res = await rouletteListApi.update(item.id, { name })
      setListItems(prev => prev.map(i => i.id === item.id ? res.data as RouletteListItem : i))
    } catch {}
  }

  const startEditTotal = (item: RouletteListItem) => {
    setEditingTotalId(item.id)
    setEditingTotalValue(String(item.total))
  }
  const commitEditTotal = async (item: RouletteListItem) => {
    const val = parseInt(editingTotalValue, 10)
    setEditingTotalId(null)
    if (isNaN(val) || val === item.total) return
    try {
      const res = await rouletteListApi.setTotal(item.id, val)
      setListItems(prev => prev.map(i => i.id === item.id ? res.data as RouletteListItem : i))
    } catch {
      addToast({ type: 'error', title: '수치 변경 실패' })
    }
  }

  const handlePubgField = async (field: Partial<typeof pubgTracking>) => {
    if (!pubgTracking) return
    const prev = pubgTracking
    setPubgTracking({ ...pubgTracking, ...field } as typeof pubgTracking)
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
    if (next && !pubgTracking.name.trim()) { addToast({ type: 'error', title: '닉네임을 먼저 입력하세요' }); return }
    if (next && !pubgTracking.listItemId) { addToast({ type: 'error', title: '연결할 리스트 항목을 선택하세요' }); return }
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
      if (applied) addToast({ type: 'info', title: `딜 차감`, message: `-${applied.damage.toLocaleString()}` })
      else addToast({ type: 'info', title: '새 경기 없음' })
    } catch {
      addToast({ type: 'error', title: '폴링 실패' })
    } finally {
      setPubgPolling(false)
    }
  }

  const totalWeight = selected?.items.reduce((s, i) => s + i.weight, 0) ?? 0
  const themePreviewSrc = (themeId: string) => {
    const suffix = selected?.mode === 'wheel' ? '(원판)' : ''
    return `${THEME_BASE}/${encodeURIComponent(themeId)}${suffix}.png`
  }

  return (
    <div className="flex h-full bg-bg-outer overflow-hidden gap-3 p-3">

      {/* ── 왼쪽: 룰렛 목록 + 리스트 항목 ── */}
      <div className="w-80 shrink-0 flex flex-col gap-3 min-h-0">

        {/* 룰렛 목록 */}
        <div className="flex-1 min-h-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-sm font-semibold text-text-primary">룰렛</span>
            <button onClick={createRoulette} className="p-1.5 bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 transition-all">
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
            {roulettes.map(r => (
              <div key={r.id} onClick={() => setSelectedId(r.id)}
                className={`group flex items-center gap-2 px-3 py-3 cursor-pointer transition-colors ${
                  selectedId === r.id ? 'bg-accent-mint/10 border-l-2 border-accent-mint' : 'hover:bg-white/2 border-l-2 border-transparent'
                }`}
              >
                <button
                  onClick={e => { e.stopPropagation(); saveSelected({ ...r, enabled: !r.enabled }) }}
                  className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${r.enabled ? 'bg-accent-mint' : 'bg-border'}`}
                />
                {renamingId === r.id ? (
                  <input autoFocus
                    className="flex-1 bg-bg-input border border-accent-mint rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(r)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(r); if (e.key === 'Escape') setRenamingId(null) }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 text-xs text-text-primary truncate">{r.name}</span>
                )}
                {r.listItemId && <Link size={10} className="text-accent-mint shrink-0" />}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={e => { e.stopPropagation(); startRename(r) }} className="p-1 text-text-muted hover:text-text-primary"><Pencil size={10} /></button>
                  <button onClick={e => { e.stopPropagation(); deleteRoulette(r.id) }} className="p-1 text-text-muted hover:text-red-400"><Trash2 size={10} /></button>
                </div>
              </div>
            ))}
          </div>
          {/* OBS URLs */}
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

        {/* 리스트 항목 */}
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
            {listItems.map(item => (
              <div key={item.id} className="group flex items-center gap-2 px-3 py-2.5 hover:bg-white/2 transition-colors">
                <div className="flex-1 min-w-0">
                  {renamingListId === item.id ? (
                    <input autoFocus
                      className="w-full bg-bg-input border border-accent-mint rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
                      value={renameListValue}
                      onChange={e => setRenameListValue(e.target.value)}
                      onBlur={() => commitRenameList(item)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRenameList(item); if (e.key === 'Escape') setRenamingListId(null) }}
                    />
                  ) : (
                    <span className="text-xs font-medium text-text-primary truncate block">{item.name}</span>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-text-muted">
                      {item.type === 'numeric' ? '숫자' : '횟수'}
                    </span>
                    {editingTotalId === item.id ? (
                      <input
                        autoFocus
                        type="number"
                        className="w-16 bg-bg-input border border-accent-mint rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:outline-none"
                        value={editingTotalValue}
                        onChange={e => setEditingTotalValue(e.target.value)}
                        onBlur={() => commitEditTotal(item)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEditTotal(item)
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
                  <button onClick={() => startRenameList(item)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-white/5 transition-colors"><Pencil size={10} /></button>
                  <button onClick={() => resetListItem(item.id)} className="p-1.5 text-text-muted hover:text-accent-mint rounded-lg hover:bg-white/5 transition-colors"><RotateCcw size={10} /></button>
                  <button onClick={() => deleteListItem(item.id)} className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"><Trash2 size={10} /></button>
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
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createListItem()}
            />
            <div className="flex gap-2">
              <div className="flex flex-1 rounded-xl border border-border overflow-hidden">
                {(['numeric', 'count'] as const).map((t, i) => (
                  <button key={t} onClick={() => setNewListType(t)}
                    className={`flex-1 py-1.5 text-[11px] font-medium transition-all ${i === 0 ? 'border-r border-border' : ''} ${
                      newListType === t ? 'bg-accent-mint/15 text-accent-mint' : 'text-text-muted hover:text-text-primary hover:bg-white/3'
                    }`}
                  >
                    {t === 'numeric' ? '숫자' : '횟수'}
                  </button>
                ))}
              </div>
              <button onClick={createListItem} disabled={!newListName.trim()}
                className="px-3 py-1.5 bg-accent-mint text-bg-outer rounded-xl text-xs font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                추가
              </button>
            </div>
          </div>
        </div>
        {/* 배그 딜 연동 */}
        {pubgTracking && (
          <div className="shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-1.5">
                <Gamepad2 size={13} className="text-yellow-400" />
                <span className="text-sm font-semibold text-text-primary">배그 딜 연동</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePubgPollNow}
                  disabled={pubgPolling || !pubgTracking.enabled}
                  title="지금 확인"
                  className="p-1 text-text-muted hover:text-text-secondary rounded transition-colors disabled:opacity-30"
                >
                  <RefreshCw size={12} className={pubgPolling ? 'animate-spin' : ''} />
                </button>
                <button onClick={handlePubgToggle}>
                  {pubgTracking.enabled
                    ? <ToggleRight size={24} className="text-yellow-400" />
                    : <ToggleLeft size={24} className="text-text-muted" />}
                </button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={pubgTracking.name}
                  onChange={e => setPubgTracking(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  onBlur={() => handlePubgField({ name: pubgTracking.name })}
                  placeholder="닉네임"
                  className="flex-1 min-w-0 bg-bg-input border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint"
                />
                <select
                  value={pubgTracking.platform || 'steam'}
                  onChange={e => handlePubgField({ platform: e.target.value })}
                  className="bg-bg-input border border-border rounded-xl px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint"
                >
                  <option value="steam">Steam</option>
                  <option value="kakao">Kakao</option>
                  <option value="psn">PSN</option>
                  <option value="xbox">Xbox</option>
                </select>
              </div>
              <select
                value={pubgTracking.listItemId || ''}
                onChange={e => handlePubgField({ listItemId: e.target.value })}
                className="w-full bg-bg-input border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint"
              >
                <option value="">차감할 항목 선택</option>
                {listItems.filter(i => i.type === 'numeric').map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              {/* 팀원 딜 합산 토글 */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">팀원 딜 합산</span>
                <button
                  onClick={() => handlePubgField({ includeTeamDamage: !pubgTracking.includeTeamDamage })}
                  title="팀원들의 딜량도 함께 차감"
                >
                  {pubgTracking.includeTeamDamage
                    ? <ToggleRight size={20} className="text-yellow-400" />
                    : <ToggleLeft size={20} className="text-text-muted" />}
                </button>
              </div>

              {pubgTracking.lastError ? (
                <p className="text-[10px] text-red-400 truncate">{pubgTracking.lastError}</p>
              ) : pubgTracking.lastApplied ? (
                <p className="text-[10px] text-text-muted">
                  마지막 차감: <span className="text-red-400 font-bold">
                    -{(pubgTracking.lastApplied.damage + (pubgTracking.lastApplied.teamDamage ?? 0)).toLocaleString()}
                  </span>
                  {pubgTracking.lastApplied.teamDamage != null && pubgTracking.lastApplied.teamDamage > 0 && (
                    <span className="text-text-muted"> (나 {pubgTracking.lastApplied.damage.toLocaleString()} + 팀 {pubgTracking.lastApplied.teamDamage.toLocaleString()})</span>
                  )}
                  {' '}· {new Date(pubgTracking.lastApplied.appliedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              ) : pubgTracking.lastPolledAt ? (
                <p className="text-[10px] text-text-muted">마지막 확인: {new Date(pubgTracking.lastPolledAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
              ) : (
                <p className="text-[10px] text-text-muted">경기 종료 시 딜량이 자동으로 차감됩니다 (5분 주기)</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 중앙: 항목 관리 ── */}
      {selected ? (
        <div className="flex-1 min-w-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Dices size={14} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">{selected.name} — 항목</span>
              {selected.items.length > 0 && (
                <span className="text-xs text-text-muted bg-bg-outer border border-border rounded-full px-2 py-0.5">{selected.items.length}개</span>
              )}
            </div>
            <button onClick={() => saveSelected(selected)} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
            >
              <Save size={12} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {selected.items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Dices size={28} className="text-border mb-2" />
                <p className="text-sm text-text-muted">항목을 추가하세요</p>
              </div>
            )}
            {selected.items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                <input
                  className="flex-1 bg-transparent border-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-mint/30 rounded px-1"
                  value={item.label}
                  onChange={e => updateItem(item.id, 'label', e.target.value)}
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-text-muted">가중치</span>
                  <input type="number" min={1}
                    className="w-14 bg-bg-input border border-border rounded-lg px-2 py-1 text-xs text-text-primary text-center focus:outline-none focus:border-accent-mint transition-colors"
                    value={item.weight}
                    onChange={e => updateItem(item.id, 'weight', Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <span className="text-xs text-text-muted w-10 text-right">
                    {totalWeight > 0 ? Math.round((item.weight / totalWeight) * 100) : 0}%
                  </span>
                </div>
                <button onClick={() => removeItem(item.id)}
                  className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border shrink-0 flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">항목 이름</label>
              <input
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
                placeholder="항목 이름 입력..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
              />
            </div>
            <div className="w-20 shrink-0">
              <label className="block text-xs text-text-muted mb-1">가중치</label>
              <input type="number" min={1}
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary text-center focus:outline-none focus:border-accent-mint transition-colors"
                value={newWeight}
                onChange={e => setNewWeight(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <button onClick={addItem} disabled={!newLabel.trim()}
              className="p-2.5 bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 flex items-center justify-center bg-bg-card border border-border rounded-2xl">
          <div className="text-center">
            <Dices size={32} className="text-border mx-auto mb-3" />
            <p className="text-sm text-text-muted">왼쪽에서 룰렛을 선택하거나<br/>새 룰렛을 추가하세요</p>
          </div>
        </div>
      )}

      {/* ── 오른쪽: 설정 ── */}
      {selected && (
        <div className="w-[300px] shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* 활성화 */}
          <div className={`bg-bg-card border rounded-2xl p-4 transition-colors shrink-0 ${selected.enabled ? 'border-accent-mint/50' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={15} className={selected.enabled ? 'text-accent-mint' : 'text-text-muted'} />
                <span className="text-sm font-semibold text-text-primary">자동 룰렛</span>
              </div>
              <button onClick={() => saveSelected({ ...selected, enabled: !selected.enabled })}>
                {selected.enabled ? <ToggleRight size={28} className="text-accent-mint" /> : <ToggleLeft size={28} className="text-text-muted" />}
              </button>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {selected.enabled ? '트리거 금액의 후원이 들어오면 룰렛이 자동으로 돌아갑니다.' : '활성화하면 트리거 금액 후원 시 룰렛이 자동 실행됩니다.'}
            </p>
          </div>

          {/* 리스트 연결 */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Link size={14} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">리스트 항목 연결</span>
            </div>
            <div className="p-3 space-y-2">
              <p className="text-xs text-text-muted leading-relaxed">이 룰렛의 결과가 어느 리스트 항목에 누적될지 선택하세요.</p>
              <select
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-mint transition-colors"
                value={selected.listItemId ?? ''}
                onChange={e => patch({ listItemId: e.target.value || undefined })}
              >
                <option value="">연결 안 함</option>
                {listItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.type === 'numeric' ? '숫자 누적' : '횟수 카운트'})
                  </option>
                ))}
              </select>
              {selected.listItemId && (
                <div className="bg-bg-outer rounded-xl px-3 py-2 text-xs text-text-muted">
                  {(() => {
                    const linked = listItems.find(i => i.id === selected.listItemId)
                    if (!linked) return '연결된 항목을 찾을 수 없습니다'
                    return linked.type === 'numeric'
                      ? '룰렛 항목 이름의 숫자를 추출해서 누적합니다 (예: "20" → +20)'
                      : '룰렛 당첨 항목 이름을 기록하고 횟수를 셉니다'
                  })()}
                </div>
              )}
              <button onClick={() => saveSelected(selected)} disabled={saving}
                className="w-full py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {/* 트리거 금액 */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-text-primary">트리거 금액</span>
              <span className="text-xs text-text-muted ml-auto">치즈 단위</span>
            </div>
            <div className="p-3 space-y-2">
              {selected.triggerAmounts.length === 0 && (
                <p className="text-xs text-text-muted text-center py-2">트리거 금액이 없습니다</p>
              )}
              {selected.triggerAmounts.map(amount => (
                <div key={amount} className="flex items-center justify-between bg-bg-input rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-accent-mint text-sm font-bold">{amount.toLocaleString()}</span>
                    <span className="text-xs text-text-muted">치즈</span>
                  </div>
                  <button onClick={() => removeAmount(amount)} className="p-1 text-text-muted hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input type="number" min={1}
                  className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
                  placeholder="금액 입력..."
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addAmount()}
                />
                <button onClick={addAmount} disabled={!newAmount.trim()}
                  className="p-2 bg-bg-input border border-border hover:border-accent-mint/40 text-text-secondary hover:text-text-primary rounded-xl disabled:opacity-40 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button onClick={() => saveSelected(selected)} disabled={saving}
                className="w-full py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {saving ? '저장 중...' : '설정 저장'}
              </button>
            </div>
          </div>

          {/* 표시 방식 */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Dices size={14} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">표시 방식</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {(['wheel', 'slot'] as const).map(m => (
                <button key={m} onClick={() => saveSelected({ ...selected, mode: m })}
                  className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                    selected.mode === m ? 'border-accent-mint bg-accent-mint/10 text-accent-mint' : 'border-border bg-bg-input text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {m === 'wheel' ? '원판' : '슬롯'}
                </button>
              ))}
            </div>
          </div>

          {/* 테마 */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Palette size={14} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">테마</span>
              {selected.theme !== 'default' && <span className="ml-auto text-xs text-accent-mint font-medium">{selected.theme}</span>}
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {ROULETTE_THEMES.map(theme => (
                <button key={theme.id} onClick={() => saveSelected({ ...selected, theme: theme.id })}
                  className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                    selected.theme === theme.id ? 'border-accent-mint ring-1 ring-accent-mint/30' : 'border-border hover:border-border/80'
                  }`}
                  style={{ aspectRatio: '16/9' }}
                >
                  {theme.id === 'default' ? (
                    <div className="w-full h-full bg-bg-outer flex flex-col items-center justify-center gap-1">
                      <Dices size={18} className="text-text-muted" />
                      <span className="text-[9px] text-text-muted">기본</span>
                    </div>
                  ) : (
                    <img src={themePreviewSrc(theme.id)} alt={theme.name} className="w-full h-full object-contain bg-bg-outer" loading="lazy" />
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] text-center py-1 font-medium">
                    {theme.name}
                  </div>
                  {selected.theme === theme.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-accent-mint rounded-full flex items-center justify-center">
                      <Check size={9} className="text-bg-outer" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 오버레이 테스트 */}
          <div className="bg-bg-card border border-border rounded-2xl p-4 shrink-0 space-y-3">
            <p className="text-sm font-semibold text-text-primary">오버레이 테스트</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">테스트 시 리스트 반영</span>
              <button
                onClick={async () => {
                  const next = !testAffectsList
                  setTestAffectsList(next)
                  await rouletteApi.setTestList(next)
                }}
              >
                {testAffectsList
                  ? <ToggleRight size={26} className="text-accent-mint" />
                  : <ToggleLeft size={26} className="text-text-muted" />}
              </button>
            </div>
            <button onClick={handleTest} disabled={testing || selected.items.length < 2}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10 rounded-xl disabled:opacity-50 transition-colors"
            >
              <Play size={13} /> {testing ? '전송 중...' : '테스트 스핀'}
            </button>
            {selected.items.length < 2 && (
              <p className="text-xs text-red-400 text-center">항목이 2개 이상 필요합니다</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
