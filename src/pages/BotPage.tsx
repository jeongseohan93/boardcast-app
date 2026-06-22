import { useEffect, useState } from 'react'
import { Plus, Trash2, Check, X, Bot, Pencil } from 'lucide-react'
import { botApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

interface BotCommand {
  id: string
  trigger: string
  response: string
  cooldown: number
  permission: 'everyone' | 'subscriber' | 'moderator' | 'streamer'
  enabled: boolean
}

const PERMISSION_LABEL: Record<BotCommand['permission'], string> = {
  everyone: '전체',
  subscriber: '구독자',
  moderator: '매니저',
  streamer: '스트리머',
}

const PERMISSION_COLOR: Record<BotCommand['permission'], string> = {
  everyone: 'text-text-muted border-border',
  subscriber: 'text-accent-mint border-accent-mint/30',
  moderator: 'text-accent-purple border-accent-purple/30',
  streamer: 'text-accent-warning border-accent-warning/30',
}

export default function BotPage() {
  const addToast = useToastStore((s) => s.addToast)

  const [botName, setBotName]           = useState('')
  const [botNameSaved, setBotNameSaved] = useState(false)
  const [nameSaving, setNameSaving]     = useState(false)

  const [commands, setCommands]         = useState<BotCommand[]>([])
  const [showAdd, setShowAdd]           = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [newCmd, setNewCmd]             = useState<Partial<BotCommand>>({
    trigger: '', response: '', cooldown: 5, permission: 'everyone', enabled: true,
  })

  useEffect(() => { loadBotName(); loadCommands() }, [])

  const loadBotName = async () => {
    const saved = await window.electronAPI.store.get('botName') as string | null
    if (saved) setBotName(saved)
  }

  const loadCommands = async () => {
    try { const res = await botApi.list(); setCommands(res.data) }
    catch { addToast({ type: 'error', title: '명령어 로드 실패' }) }
  }

  const handleSaveBotName = async () => {
    if (!botName.trim()) return
    setNameSaving(true)
    await window.electronAPI.store.set('botName', botName.trim())
    setNameSaving(false)
    setBotNameSaved(true)
    setTimeout(() => setBotNameSaved(false), 2000)
  }

  const handleAddCommand = async () => {
    if (!newCmd.trigger?.trim() || !newCmd.response?.trim()) return
    try {
      await botApi.create(newCmd)
      await loadCommands()
      setNewCmd({ trigger: '', response: '', cooldown: 5, permission: 'everyone', enabled: true })
      setShowAdd(false)
    } catch { addToast({ type: 'error', title: '명령어 추가 실패' }) }
  }

  const handleDeleteCommand = async (id: string) => {
    try { await botApi.delete(id); setCommands((c) => c.filter((cmd) => cmd.id !== id)) }
    catch { addToast({ type: 'error', title: '명령어 삭제 실패' }) }
  }

  const handleToggle = async (cmd: BotCommand) => {
    try {
      await botApi.update(cmd.id, { ...cmd, enabled: !cmd.enabled })
      setCommands((cs) => cs.map((c) => (c.id === cmd.id ? { ...c, enabled: !c.enabled } : c)))
    } catch { addToast({ type: 'error', title: '명령어 업데이트 실패' }) }
  }

  const startEdit = (cmd: BotCommand) => {
    setShowAdd(false)
    setEditingId(cmd.id)
    setNewCmd({ ...cmd })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNewCmd({ trigger: '', response: '', cooldown: 5, permission: 'everyone', enabled: true })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !newCmd.trigger?.trim() || !newCmd.response?.trim()) return
    try {
      await botApi.update(editingId, newCmd)
      await loadCommands()
      cancelEdit()
    } catch { addToast({ type: 'error', title: '명령어 수정 실패' }) }
  }

  const openAdd = () => {
    cancelEdit()
    setShowAdd(true)
  }

  return (
    <div className="flex h-screen bg-bg-outer overflow-hidden gap-3 p-3">

      {/* ── 왼쪽: 봇 설정 패널 ── */}
      <div className="w-72 shrink-0 flex flex-col gap-3">

        {/* 봇 아이덴티티 카드 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-accent-mint/15 border border-accent-mint/30 flex items-center justify-center">
              <Bot size={15} className="text-accent-mint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">봇 이름</p>
              <p className="text-xs text-text-muted">앱 내 표시 이름</p>
            </div>
          </div>

          <div className="space-y-2">
            <input
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
              placeholder="예: 방송봇, MyBot..."
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveBotName()}
              maxLength={20}
            />
            <button
              onClick={handleSaveBotName}
              disabled={nameSaving || !botName.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {botNameSaved ? <><Check size={13} /> 저장됨</> : '저장'}
            </button>
          </div>

          {botName && (
            <p className="text-xs text-text-muted mt-2.5 pt-2.5 border-t border-border">
              현재: <span className="text-accent-mint font-semibold">{botName}</span>
            </p>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-3">명령어 현황</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-bg-outer rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-text-primary">{commands.length}</p>
              <p className="text-xs text-text-muted mt-0.5">전체</p>
            </div>
            <div className="bg-bg-outer rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-accent-mint">{commands.filter((c) => c.enabled).length}</p>
              <p className="text-xs text-text-muted mt-0.5">활성</p>
            </div>
          </div>
        </div>

        {/* 사용법 안내 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4 flex-1">
          <p className="text-xs font-semibold text-text-secondary mb-2">사용 방법</p>
          <ul className="space-y-2 text-xs text-text-muted leading-relaxed">
            <li className="flex gap-2">
              <span className="text-accent-mint shrink-0">•</span>
              채팅에서 트리거 키워드 입력 시 자동으로 응답합니다
            </li>
            <li className="flex gap-2">
              <span className="text-accent-mint shrink-0">•</span>
              쿨타임은 같은 트리거의 최소 응답 간격(초)입니다
            </li>
            <li className="flex gap-2">
              <span className="text-accent-mint shrink-0">•</span>
              권한 설정으로 특정 시청자만 트리거할 수 있습니다
            </li>
          </ul>
          <div className="mt-3 p-2.5 bg-bg-outer rounded-xl">
            <p className="text-xs text-text-muted">
              채팅 전송은 <span className="text-text-secondary">스트리머 계정</span>으로 전송됩니다.
            </p>
          </div>
        </div>

      </div>

      {/* ── 오른쪽: 명령어 목록 ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-card border border-border rounded-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">봇 명령어</span>
            {commands.length > 0 && (
              <span className="text-xs text-text-muted bg-bg-outer border border-border rounded-full px-2 py-0.5">
                {commands.length}
              </span>
            )}
          </div>
          {!showAdd && !editingId && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 transition-colors"
            >
              <Plus size={12} /> 명령어 추가
            </button>
          )}
        </div>

        {/* 추가 폼 */}
        {showAdd && (
          <div className="px-4 py-3 border-b border-border bg-bg-outer/60 shrink-0">
            <p className="text-xs font-semibold text-accent-mint mb-2">새 명령어 추가</p>
            <CommandForm cmd={newCmd} onChange={setNewCmd} />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddCommand}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-accent-mint text-bg-outer rounded-lg font-medium hover:brightness-110 transition-colors"
              >
                <Check size={12} /> 추가
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewCmd({ trigger: '', response: '', cooldown: 5, permission: 'everyone', enabled: true }) }}
                className="px-3 py-1.5 text-xs border border-border text-text-secondary hover:text-text-primary rounded-lg transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* 명령어 목록 */}
        <div className="flex-1 overflow-y-auto">
          {commands.length === 0 && !showAdd ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-bg-outer border border-border flex items-center justify-center mb-3">
                <Bot size={24} className="text-border" />
              </div>
              <p className="text-sm font-medium text-text-muted">등록된 명령어가 없습니다</p>
              <p className="text-xs text-text-muted/60 mt-1 mb-4">채팅에서 트리거 키워드를 감지해 자동으로 응답합니다</p>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 transition-colors"
              >
                <Plus size={12} /> 첫 명령어 추가
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {commands.map((cmd) =>
                editingId === cmd.id ? (
                  /* 편집 행 */
                  <div key={cmd.id} className="p-4 bg-bg-outer/60">
                    <p className="text-xs font-semibold text-accent-mint mb-2">명령어 수정</p>
                    <CommandForm cmd={newCmd} onChange={setNewCmd} />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-accent-mint text-bg-outer rounded-lg font-medium hover:brightness-110 transition-colors"
                      >
                        <Check size={12} /> 저장
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-xs border border-border text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 일반 행 */
                  <div
                    key={cmd.id}
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-white/2 transition-colors ${!cmd.enabled ? 'opacity-50' : ''}`}
                  >
                    {/* 트리거 + 응답 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-accent-mint font-mono font-bold text-sm">{cmd.trigger}</span>
                        <span className={`text-xs border rounded px-1.5 py-0.5 ${PERMISSION_COLOR[cmd.permission]}`}>
                          {PERMISSION_LABEL[cmd.permission]}
                        </span>
                        <span className="text-xs text-text-muted">쿨타임 {cmd.cooldown}초</span>
                      </div>
                      <p className="text-xs text-text-secondary truncate">{cmd.response}</p>
                    </div>

                    {/* 컨트롤 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(cmd)}
                        title={cmd.enabled ? '비활성화' : '활성화'}
                        className={`w-9 h-5 rounded-full transition-colors relative ${cmd.enabled ? 'bg-accent-mint' : 'bg-border'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${cmd.enabled ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <button
                        onClick={() => startEdit(cmd)}
                        className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteCommand(cmd.id)}
                        className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function CommandForm({
  cmd,
  onChange,
}: {
  cmd: Partial<BotCommand>
  onChange: (fn: (p: Partial<BotCommand>) => Partial<BotCommand>) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
          placeholder="!명령어 트리거"
          value={cmd.trigger || ''}
          onChange={(e) => onChange((p) => ({ ...p, trigger: e.target.value }))}
        />
        <input
          type="number" min={0}
          className="w-16 bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint text-center"
          placeholder="쿨"
          value={cmd.cooldown ?? 5}
          onChange={(e) => onChange((p) => ({ ...p, cooldown: Number(e.target.value) }))}
        />
        <select
          className="w-24 bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint"
          value={cmd.permission || 'everyone'}
          onChange={(e) => onChange((p) => ({ ...p, permission: e.target.value as BotCommand['permission'] }))}
        >
          <option value="everyone">전체</option>
          <option value="subscriber">구독자</option>
          <option value="moderator">매니저</option>
          <option value="streamer">스트리머</option>
        </select>
      </div>
      <input
        className="w-full bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
        placeholder="응답 메시지"
        value={cmd.response || ''}
        onChange={(e) => onChange((p) => ({ ...p, response: e.target.value }))}
      />
    </div>
  )
}
