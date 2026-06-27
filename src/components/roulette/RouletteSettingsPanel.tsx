/**
 * [룰렛 설정 패널] — 오른쪽 패널
 *
 * 선택된 룰렛의 설정을 변경하는 패널. 다섯 개의 카드로 구성된다:
 *
 *   1. 자동 룰렛 카드 — enabled 토글 + 설명 텍스트
 *   2. 리스트 항목 연결 카드 — listItemId 선택 드롭다운 + 저장
 *   3. 트리거 금액 카드 — 금액 목록 + 추가/삭제 + 저장
 *   4. 표시 방식 카드 — wheel / slot 선택
 *   5. 테마 카드 — 테마 미리보기 이미지 그리드
 *   6. 오버레이 테스트 카드 — testAffectsList 토글 + 테스트 스핀 버튼
 *
 * ── 상태 분리 ─────────────────────────────────────────────────────────────
 *   - newAmount: 트리거 금액 입력 인라인 상태 (이 컴포넌트가 내부 관리)
 *   - testAffectsList: 부모에서 받아 서버 저장 후 콜백으로 반영
 *   - selected, listItems: 부모(RoulettePage)에서 props로 받음
 */

import { useState } from 'react'
import { Check, Dices, Link, Palette, Play, Plus, ToggleLeft, ToggleRight, Trash2, Zap } from 'lucide-react'
import { rouletteApi } from '../../api/client'
import type { RouletteConfig, RouletteListItem } from './types'
import { ROULETTE_THEMES, THEME_BASE } from './types'

interface RouletteSettingsPanelProps {
  selected: RouletteConfig | null
  listItems: RouletteListItem[]
  saving: boolean
  testing: boolean
  testAffectsList: boolean
  onSaveSelected: (r: RouletteConfig) => Promise<void>
  onPatch: (changes: Partial<RouletteConfig>) => void
  onTest: () => Promise<void>
  onSetTestAffectsList: (v: boolean) => void
}

export default function RouletteSettingsPanel({
  selected, listItems, saving, testing, testAffectsList,
  onSaveSelected, onPatch, onTest, onSetTestAffectsList,
}: RouletteSettingsPanelProps) {
  const [newAmount, setNewAmount] = useState('')

  if (!selected) return null

  const addAmount = () => {
    const n = parseInt(newAmount, 10)
    if (!n || n <= 0 || selected.triggerAmounts.includes(n)) return
    onPatch({ triggerAmounts: [...selected.triggerAmounts, n].sort((a, b) => a - b) })
    setNewAmount('')
  }
  const removeAmount = (amount: number) => {
    onPatch({ triggerAmounts: selected.triggerAmounts.filter((a) => a !== amount) })
  }

  /** mode(wheel/slot)에 따라 테마 미리보기 이미지 URL 생성 */
  const themePreviewSrc = (themeId: string) => {
    const suffix = selected.mode === 'wheel' ? '(원판)' : ''
    return `${THEME_BASE}/${encodeURIComponent(themeId)}${suffix}.png`
  }

  return (
    <div className="w-[300px] shrink-0 flex flex-col gap-3 overflow-y-auto">

      {/* ── 자동 룰렛 ──────────────────────────────────────────────────── */}
      <div className={`bg-bg-card border rounded-2xl p-4 transition-colors shrink-0 ${selected.enabled ? 'border-accent-mint/50' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={15} className={selected.enabled ? 'text-accent-mint' : 'text-text-muted'} />
            <span className="text-sm font-semibold text-text-primary">자동 룰렛</span>
          </div>
          <button onClick={() => void onSaveSelected({ ...selected, enabled: !selected.enabled })}>
            {selected.enabled
              ? <ToggleRight size={28} className="text-accent-mint" />
              : <ToggleLeft  size={28} className="text-text-muted" />}
          </button>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {selected.enabled
            ? '트리거 금액의 후원이 들어오면 룰렛이 자동으로 돌아갑니다.'
            : '활성화하면 트리거 금액 후원 시 룰렛이 자동 실행됩니다.'}
        </p>
      </div>

      {/* ── 리스트 항목 연결 ────────────────────────────────────────────── */}
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
            onChange={(e) => onPatch({ listItemId: e.target.value || undefined })}
          >
            <option value="">연결 안 함</option>
            {listItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.type === 'numeric' ? '숫자 누적' : '횟수 카운트'})
              </option>
            ))}
          </select>
          {selected.listItemId && (
            <div className="bg-bg-outer rounded-xl px-3 py-2 text-xs text-text-muted">
              {(() => {
                const linked = listItems.find((i) => i.id === selected.listItemId)
                if (!linked) return '연결된 항목을 찾을 수 없습니다'
                return linked.type === 'numeric'
                  ? '룰렛 항목 이름의 숫자를 추출해서 누적합니다 (예: "20" → +20)'
                  : '룰렛 당첨 항목 이름을 기록하고 횟수를 셉니다'
              })()}
            </div>
          )}
          <button
            onClick={() => void onSaveSelected(selected)}
            disabled={saving}
            className="w-full py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* ── 트리거 금액 ──────────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-text-primary">트리거 금액</span>
          <span className="text-xs text-text-muted ml-auto">치즈 단위</span>
        </div>
        <div className="p-3 space-y-2">
          {selected.triggerAmounts.length === 0 && (
            <p className="text-xs text-text-muted text-center py-2">트리거 금액이 없습니다</p>
          )}
          {selected.triggerAmounts.map((amount) => (
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
            <input
              type="number"
              min={1}
              className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
              placeholder="금액 입력..."
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAmount()}
            />
            <button
              onClick={addAmount}
              disabled={!newAmount.trim()}
              className="p-2 bg-bg-input border border-border hover:border-accent-mint/40 text-text-secondary hover:text-text-primary rounded-xl disabled:opacity-40 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={() => void onSaveSelected(selected)}
            disabled={saving}
            className="w-full py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>

      {/* ── 표시 방식 (wheel / slot) ──────────────────────────────────── */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Dices size={14} className="text-accent-mint" />
          <span className="text-sm font-semibold text-text-primary">표시 방식</span>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {(['wheel', 'slot'] as const).map((m) => (
            <button
              key={m}
              onClick={() => void onSaveSelected({ ...selected, mode: m })}
              className={`py-2 text-sm font-medium rounded-xl border transition-all ${
                selected.mode === m
                  ? 'border-accent-mint bg-accent-mint/10 text-accent-mint'
                  : 'border-border bg-bg-input text-text-secondary hover:text-text-primary'
              }`}
            >
              {m === 'wheel' ? '원판' : '슬롯'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 테마 ──────────────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Palette size={14} className="text-accent-mint" />
          <span className="text-sm font-semibold text-text-primary">테마</span>
          {selected.theme !== 'default' && (
            <span className="ml-auto text-xs text-accent-mint font-medium">{selected.theme}</span>
          )}
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {ROULETTE_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => void onSaveSelected({ ...selected, theme: theme.id })}
              className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                selected.theme === theme.id
                  ? 'border-accent-mint ring-1 ring-accent-mint/30'
                  : 'border-border hover:border-border/80'
              }`}
              style={{ aspectRatio: '16/9' }}
            >
              {theme.id === 'default' ? (
                <div className="w-full h-full bg-bg-outer flex flex-col items-center justify-center gap-1">
                  <Dices size={18} className="text-text-muted" />
                  <span className="text-[9px] text-text-muted">기본</span>
                </div>
              ) : (
                <img
                  src={themePreviewSrc(theme.id)}
                  alt={theme.name}
                  className="w-full h-full object-contain bg-bg-outer"
                  loading="lazy"
                />
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

      {/* ── 오버레이 테스트 ────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 shrink-0 space-y-3">
        <p className="text-sm font-semibold text-text-primary">오버레이 테스트</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">테스트 시 리스트 반영</span>
          <button
            onClick={async () => {
              const next = !testAffectsList
              onSetTestAffectsList(next)
              await rouletteApi.setTestList(next)
            }}
          >
            {testAffectsList
              ? <ToggleRight size={26} className="text-accent-mint" />
              : <ToggleLeft  size={26} className="text-text-muted" />}
          </button>
        </div>
        <button
          onClick={() => void onTest()}
          disabled={testing || selected.items.length < 2}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10 rounded-xl disabled:opacity-50 transition-colors"
        >
          <Play size={13} /> {testing ? '전송 중...' : '테스트 스핀'}
        </button>
        {selected.items.length < 2 && (
          <p className="text-xs text-red-400 text-center">항목이 2개 이상 필요합니다</p>
        )}
      </div>
    </div>
  )
}
