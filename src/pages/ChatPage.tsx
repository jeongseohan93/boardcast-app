import { useEffect, useRef, useState } from 'react'
import { Send, Plus, Trash2, Check, X, MessageSquare, Bot } from 'lucide-react'
import { chatApi, botApi } from '../api/client'
import { useChatStore, ChatMessage } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import Button from '../components/Button'
import { renderWithEmojis } from '../utils/chat'

interface BotCommand {
  id: string
  trigger: string
  response: string
  cooldown: number
  permission: 'everyone' | 'subscriber' | 'moderator' | 'streamer'
  enabled: boolean
}

const NICK_COLORS = ['#FF6B9D','#C77DFF','#72EFDD','#F4A261','#90E0EF','#FFD166','#06D6A0','#EF476F']
const colorCache = new Map<string, string>()
function getNickColor(nickname: string): string {
  if (!colorCache.has(nickname)) {
    let h = 0
    for (let i = 0; i < nickname.length; i++) h = nickname.charCodeAt(i) + ((h << 5) - h)
    colorCache.set(nickname, NICK_COLORS[Math.abs(h) % NICK_COLORS.length])
  }
  return colorCache.get(nickname)!
}

export default function ChatPage() {
  const { messages, unread, isAtBottom, addMessage, setAtBottom, markRead } = useChatStore()
  const addToast = useToastStore((s) => s.addToast)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [commands, setCommands] = useState<BotCommand[]>([])
  const [newCmd, setNewCmd] = useState<Partial<BotCommand>>({
    trigger: '', response: '', cooldown: 5, permission: 'everyone', enabled: true,
  })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => { loadCommands() }, [])

  useEffect(() => {
    if (isAtBottom) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAtBottom])

  const handleScroll = () => {
    const el = chatContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAtBottom(atBottom)
    if (atBottom) markRead()
  }

  const loadCommands = async () => {
    try { const res = await botApi.list(); setCommands(res.data) }
    catch { addToast({ type: 'error', title: '봇 명령어 로드 실패' }) }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    setSending(true)
    try {
      await chatApi.send(input.trim())
      addMessage({ id: Date.now().toString(), type: 'CHAT', nickname: '나 (봇)', message: input.trim(), timestamp: new Date().toISOString() })
      setInput('')
    } catch { addToast({ type: 'error', title: '채팅 전송 실패' }) }
    finally { setSending(false) }
  }

  const handleAddCommand = async () => {
    if (!newCmd.trigger?.trim() || !newCmd.response?.trim()) return
    try {
      await botApi.create(newCmd)
      await loadCommands()
      setNewCmd({ trigger: '', response: '', cooldown: 5, permission: 'everyone', enabled: true })
      setShowAddForm(false)
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

  return (
    <div className="flex h-screen bg-bg-outer overflow-hidden gap-3 p-3">

      {/* ── 채팅 영역 ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-accent-mint" />
            <span className="text-sm font-semibold text-text-primary">실시간 채팅</span>
          </div>
          {messages.length > 0 && <span className="text-xs text-text-muted">{messages.length}개</span>}
        </div>

        <div className="flex-1 relative min-h-0">
          <div ref={chatContainerRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
                <div className="w-12 h-12 rounded-2xl bg-bg-outer border border-border flex items-center justify-center mb-3">
                  <MessageSquare size={22} className="text-border" />
                </div>
                <p className="text-sm font-medium text-text-muted">아직 채팅이 없습니다</p>
                <p className="text-xs text-text-muted/60 mt-1">방송을 시작하면 시청자 채팅이 표시됩니다</p>
              </div>
            ) : (
              <div className="px-3 py-2 space-y-0.5">
                {messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
          {!isAtBottom && unread > 0 && (
            <button
              onClick={() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setAtBottom(true); markRead() }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-accent-mint text-bg-outer text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg hover:brightness-110 transition-all z-10 whitespace-nowrap"
            >
              ↓ 새 메시지 {unread}개
            </button>
          )}
        </div>

        <div className="p-3 border-t border-border shrink-0 flex gap-2">
          <input
            className="flex-1 bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
            placeholder="채팅 입력..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-3 bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* ── 봇 명령어 ── */}
      <div className="w-72 shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-accent-mint" />
            <span className="text-sm font-semibold text-text-primary">봇 명령어</span>
          </div>
          {commands.length > 0 && <span className="text-xs text-text-muted">{commands.length}개</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {commands.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bot size={24} className="text-border mb-2" />
              <p className="text-xs text-text-muted">명령어가 없습니다</p>
            </div>
          )}
          {commands.map((cmd) => (
            <div key={cmd.id} className="bg-bg-outer rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-accent-mint text-sm font-mono font-semibold">{cmd.trigger}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggle(cmd)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${cmd.enabled ? 'bg-accent-mint' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${cmd.enabled ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <button onClick={() => handleDeleteCommand(cmd.id)} className="text-text-muted hover:text-red-400 transition-colors p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-1 truncate">{cmd.response}</p>
              <p className="text-xs text-text-muted mt-0.5">쿨타임 {cmd.cooldown}초 · {cmd.permission}</p>
            </div>
          ))}

          {showAddForm && (
            <div className="bg-bg-outer border border-accent-mint/30 rounded-xl p-3 space-y-2">
              <input
                className="w-full bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
                placeholder="!명령어 트리거"
                value={newCmd.trigger}
                onChange={(e) => setNewCmd((p) => ({ ...p, trigger: e.target.value }))}
              />
              <input
                className="w-full bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
                placeholder="응답 메시지"
                value={newCmd.response}
                onChange={(e) => setNewCmd((p) => ({ ...p, response: e.target.value }))}
              />
              <div className="flex gap-1.5">
                <input
                  type="number" min={0}
                  className="w-16 bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint"
                  placeholder="쿨타임"
                  value={newCmd.cooldown}
                  onChange={(e) => setNewCmd((p) => ({ ...p, cooldown: Number(e.target.value) }))}
                />
                <select
                  className="flex-1 bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-mint"
                  value={newCmd.permission}
                  onChange={(e) => setNewCmd((p) => ({ ...p, permission: e.target.value as BotCommand['permission'] }))}
                >
                  <option value="everyone">전체</option>
                  <option value="subscriber">구독자</option>
                  <option value="moderator">매니저</option>
                  <option value="streamer">스트리머</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" className="flex-1" onClick={handleAddCommand}>
                  <Check size={12} /> 추가
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X size={12} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {!showAddForm && (
          <div className="p-3 border-t border-border shrink-0">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-text-muted hover:text-text-secondary border border-border hover:border-accent-mint/40 rounded-xl py-2 transition-colors"
            >
              <Plus size={13} /> 명령어 추가
            </button>
          </div>
        )}
      </div>

    </div>
  )
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex gap-2 hover:bg-white/3 rounded-lg px-1.5 py-1 transition-colors">
      <span className="text-sm font-semibold shrink-0 leading-snug" style={{ color: getNickColor(msg.nickname) }}>
        {msg.nickname}
      </span>
      <span
        className="text-sm text-text-secondary break-all leading-snug"
        dangerouslySetInnerHTML={{ __html: renderWithEmojis(msg.message, msg.emojis) }}
      />
    </div>
  )
}
