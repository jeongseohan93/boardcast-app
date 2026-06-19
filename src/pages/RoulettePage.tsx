import { useEffect, useState } from 'react'
import { Plus, Trash2, Play, Save, ToggleLeft, ToggleRight, Dices, Zap } from 'lucide-react'
import { rouletteApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

interface RouletteItem {
  id: string
  label: string
  weight: number
}

interface RouletteConfig {
  enabled: boolean
  triggerAmounts: number[]
  items: RouletteItem[]
}

const COLORS = ['#00FFA3','#A78BFA','#F4A261','#72EFDD','#FF6B9D','#FFD166','#06D6A0','#C77DFF']

export default function RoulettePage() {
  const addToast = useToastStore((s) => s.addToast)

  const [config, setConfig] = useState<RouletteConfig>({
    enabled: false,
    triggerAmounts: [100, 1000],
    items: [
      { id: '1', label: '항목 1', weight: 1 },
      { id: '2', label: '항목 2', weight: 1 },
      { id: '3', label: '항목 3', weight: 1 },
    ],
  })
  const [saving, setSaving]           = useState(false)
  const [testing, setTesting]         = useState(false)
  const [newLabel, setNewLabel]       = useState('')
  const [newWeight, setNewWeight]     = useState(1)
  const [newAmount, setNewAmount]     = useState('')

  useEffect(() => {
    rouletteApi.getConfig()
      .then((res) => setConfig(res.data))
      .catch(() => addToast({ type: 'error', title: '룰렛 설정 로드 실패' }))
  }, [])

  const save = async (cfg: RouletteConfig) => {
    setSaving(true)
    try {
      await rouletteApi.saveConfig(cfg)
      setConfig(cfg)
      addToast({ type: 'info', title: '저장되었습니다.' })
    } catch { addToast({ type: 'error', title: '저장 실패' }) }
    finally { setSaving(false) }
  }

  const toggleEnabled = () => save({ ...config, enabled: !config.enabled })

  const addItem = () => {
    if (!newLabel.trim()) return
    const updated = {
      ...config,
      items: [...config.items, { id: Date.now().toString(), label: newLabel.trim(), weight: newWeight }],
    }
    setConfig(updated)
    setNewLabel('')
    setNewWeight(1)
  }

  const removeItem = (id: string) =>
    setConfig((c) => ({ ...c, items: c.items.filter((i) => i.id !== id) }))

  const updateItem = (id: string, field: 'label' | 'weight', value: string | number) =>
    setConfig((c) => ({ ...c, items: c.items.map((i) => i.id === id ? { ...i, [field]: value } : i) }))

  const addAmount = () => {
    const n = parseInt(newAmount, 10)
    if (!n || n <= 0) return
    if (config.triggerAmounts.includes(n)) return
    setConfig((c) => ({ ...c, triggerAmounts: [...c.triggerAmounts, n].sort((a, b) => a - b) }))
    setNewAmount('')
  }

  const removeAmount = (amount: number) =>
    setConfig((c) => ({ ...c, triggerAmounts: c.triggerAmounts.filter((a) => a !== amount) }))

  const handleTest = async () => {
    setTesting(true)
    try { await rouletteApi.test() }
    catch { addToast({ type: 'error', title: '테스트 실패 — 오버레이가 열려있는지 확인하세요.' }) }
    finally { setTimeout(() => setTesting(false), 1500) }
  }

  const totalWeight = config.items.reduce((s, i) => s + i.weight, 0)

  return (
    <div className="flex h-screen bg-bg-outer overflow-hidden gap-3 p-3">

      {/* ── 왼쪽: 휠 항목 관리 ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Dices size={14} className="text-accent-mint" />
            <span className="text-sm font-semibold text-text-primary">휠 항목</span>
            {config.items.length > 0 && (
              <span className="text-xs text-text-muted bg-bg-outer border border-border rounded-full px-2 py-0.5">
                {config.items.length}개
              </span>
            )}
          </div>
          <button
            onClick={() => save(config)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <Save size={12} /> {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* 항목 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {config.items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Dices size={28} className="text-border mb-2" />
              <p className="text-sm text-text-muted">항목을 추가하세요</p>
            </div>
          )}
          {config.items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: COLORS[idx % COLORS.length] }}
              />
              <input
                className="flex-1 bg-transparent border-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-mint/30 rounded px-1"
                value={item.label}
                onChange={(e) => updateItem(item.id, 'label', e.target.value)}
              />
              {/* 가중치 */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-text-muted">가중치</span>
                <input
                  type="number" min={1}
                  className="w-14 bg-bg-input border border-border rounded-lg px-2 py-1 text-xs text-text-primary text-center focus:outline-none focus:border-accent-mint transition-colors"
                  value={item.weight}
                  onChange={(e) => updateItem(item.id, 'weight', Math.max(1, parseInt(e.target.value) || 1))}
                />
                {/* 확률 표시 */}
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
              type="number" min={1}
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

      {/* ── 오른쪽: 트리거 설정 ── */}
      <div className="w-80 shrink-0 flex flex-col gap-3">

        {/* 활성화 카드 */}
        <div className={`bg-bg-card border rounded-2xl p-4 transition-colors ${config.enabled ? 'border-accent-mint/50' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={15} className={config.enabled ? 'text-accent-mint' : 'text-text-muted'} />
              <span className="text-sm font-semibold text-text-primary">자동 룰렛</span>
            </div>
            <button onClick={toggleEnabled} className="transition-colors">
              {config.enabled
                ? <ToggleRight size={28} className="text-accent-mint" />
                : <ToggleLeft size={28} className="text-text-muted" />
              }
            </button>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {config.enabled
              ? '아래 트리거 금액의 후원이 들어오면 OBS 오버레이에서 룰렛이 자동으로 돌아갑니다.'
              : '활성화하면 트리거 금액의 후원 시 오버레이에서 룰렛이 자동 실행됩니다.'}
          </p>
        </div>

        {/* 트리거 금액 카드 */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">트리거 금액</span>
            <span className="text-xs text-text-muted ml-auto">치즈 단위</span>
          </div>
          <div className="p-3 space-y-2">
            {config.triggerAmounts.length === 0 && (
              <p className="text-xs text-text-muted text-center py-3">트리거 금액이 없습니다</p>
            )}
            {config.triggerAmounts.map((amount) => (
              <div key={amount} className="flex items-center justify-between bg-bg-input rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-accent-mint text-sm font-bold">{amount.toLocaleString()}</span>
                  <span className="text-xs text-text-muted">치즈</span>
                </div>
                <button
                  onClick={() => removeAmount(amount)}
                  className="p-1 text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <input
                type="number" min={1}
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
          </div>
          <div className="px-3 pb-3">
            <button
              onClick={() => save(config)}
              disabled={saving}
              className="w-full py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {saving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>

        {/* 오버레이 테스트 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-text-primary mb-1">오버레이 테스트</p>
          <p className="text-xs text-text-muted mb-3 leading-relaxed">
            OBS 브라우저 소스에 <code className="text-accent-mint text-xs">/overlay/roulette</code> URL을 추가한 후 테스트하세요.
          </p>
          <button
            onClick={handleTest}
            disabled={testing || config.items.length < 2}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10 rounded-xl disabled:opacity-50 transition-colors"
          >
            <Play size={13} /> {testing ? '전송 중...' : '테스트 스핀'}
          </button>
          {config.items.length < 2 && (
            <p className="text-xs text-red-400 mt-2 text-center">항목이 2개 이상 필요합니다</p>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex-1">
          <p className="text-xs font-semibold text-text-secondary mb-2">OBS 설정</p>
          <ul className="space-y-2 text-xs text-text-muted leading-relaxed">
            <li className="flex gap-2">
              <span className="text-accent-mint shrink-0">1.</span>
              OBS → 소스 → 브라우저 소스 추가
            </li>
            <li className="flex gap-2">
              <span className="text-accent-mint shrink-0">2.</span>
              URL: <code className="text-accent-mint">http://localhost:3001/overlay/roulette</code>
            </li>
            <li className="flex gap-2">
              <span className="text-accent-mint shrink-0">3.</span>
              너비 1920, 높이 1080 설정
            </li>
            <li className="flex gap-2">
              <span className="text-accent-mint shrink-0">4.</span>
              트리거 금액의 후원이 들어오면 자동 실행
            </li>
          </ul>
        </div>

      </div>
    </div>
  )
}
