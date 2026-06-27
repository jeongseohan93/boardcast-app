/**
 * [룰렛 항목 관리 패널] — 중앙 패널
 *
 * 선택된 룰렛의 항목(label, weight)을 편집하는 패널.
 *
 * ── 기능 ──────────────────────────────────────────────────────────────────
 *   - 항목 인라인 이름 편집 (input)
 *   - 가중치 수치 입력 + 전체 가중치 합 대비 비율(%) 실시간 표시
 *   - 항목 순서대로 COLORS 배열을 순환해 색상 점 표시
 *   - 항목 추가 폼 (이름 + 가중치 + + 버튼)
 *   - 저장 버튼 → 부모의 onSaveSelected 콜백 호출
 *
 * ── 상태 분리 ─────────────────────────────────────────────────────────────
 *   - newLabel, newWeight: 이 컴포넌트가 내부 관리
 *   - items의 실제 데이터: 부모(RoulettePage)의 onPatch를 통해 수정
 */

import { useState } from 'react'
import { Dices, Plus, Save, Trash2 } from 'lucide-react'
import type { RouletteConfig } from './types'
import { COLORS } from './types'

interface RouletteItemsPanelProps {
  selected: RouletteConfig | null
  saving: boolean
  onSaveSelected: (r: RouletteConfig) => Promise<void>
  onPatch: (changes: Partial<RouletteConfig>) => void
}

export default function RouletteItemsPanel({ selected, saving, onSaveSelected, onPatch }: RouletteItemsPanelProps) {
  const [newLabel,  setNewLabel]  = useState('')
  const [newWeight, setNewWeight] = useState(1)

  if (!selected) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center bg-bg-card border border-border rounded-2xl">
        <div className="text-center">
          <Dices size={32} className="text-border mx-auto mb-3" />
          <p className="text-sm text-text-muted">왼쪽에서 룰렛을 선택하거나<br/>새 룰렛을 추가하세요</p>
        </div>
      </div>
    )
  }

  const totalWeight = selected.items.reduce((s, i) => s + i.weight, 0)

  const addItem = () => {
    if (!newLabel.trim()) return
    onPatch({ items: [...selected.items, { id: Date.now().toString(), label: newLabel.trim(), weight: newWeight }] })
    setNewLabel(''); setNewWeight(1)
  }

  const removeItem = (itemId: string) => {
    onPatch({ items: selected.items.filter((i) => i.id !== itemId) })
  }

  const updateItem = (itemId: string, field: 'label' | 'weight', value: string | number) => {
    onPatch({ items: selected.items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)) })
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Dices size={14} className="text-accent-mint" />
          <span className="text-sm font-semibold text-text-primary">{selected.name} — 항목</span>
          {selected.items.length > 0 && (
            <span className="text-xs text-text-muted bg-bg-outer border border-border rounded-full px-2 py-0.5">
              {selected.items.length}개
            </span>
          )}
        </div>
        <button
          onClick={() => void onSaveSelected(selected)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
        >
          <Save size={12} /> {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 항목 목록 */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {selected.items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Dices size={28} className="text-border mb-2" />
            <p className="text-sm text-text-muted">항목을 추가하세요</p>
          </div>
        )}
        {selected.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
            {/* 항목 색상 점 */}
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
            {/* 이름 편집 */}
            <input
              className="flex-1 bg-transparent border-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-mint/30 rounded px-1"
              value={item.label}
              onChange={(e) => updateItem(item.id, 'label', e.target.value)}
            />
            {/* 가중치 + 비율 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-text-muted">가중치</span>
              <input
                type="number"
                min={1}
                className="w-14 bg-bg-input border border-border rounded-lg px-2 py-1 text-xs text-text-primary text-center focus:outline-none focus:border-accent-mint transition-colors"
                value={item.weight}
                onChange={(e) => updateItem(item.id, 'weight', Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="text-xs text-text-muted w-10 text-right">
                {totalWeight > 0 ? Math.round((item.weight / totalWeight) * 100) : 0}%
              </span>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* 항목 추가 폼 */}
      <div className="p-3 border-t border-border shrink-0 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">항목 이름</label>
          <input
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
            placeholder="항목 이름 입력..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
        </div>
        <div className="w-20 shrink-0">
          <label className="block text-xs text-text-muted mb-1">가중치</label>
          <input
            type="number"
            min={1}
            className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary text-center focus:outline-none focus:border-accent-mint transition-colors"
            value={newWeight}
            onChange={(e) => setNewWeight(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
        <button
          onClick={addItem}
          disabled={!newLabel.trim()}
          className="p-2.5 bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
