import { useEffect, useRef, useState } from 'react'
import { Send, Plus, Trash2, Check, X, MessageSquare, Bot, Megaphone, MoreVertical, ShieldBan, EyeOff, Clock } from 'lucide-react'
import { chatApi, botApi, channelApi } from '../api/client'
import { useChatStore, ChatMessage } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import Button from '../components/Button'
import { renderWithEmojis } from '../utils/chat'
import { getVipTier } from '../utils/vip'
import { ChatBadges } from '../utils/badges'

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
  const [noticing, setNoticing] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [moderationBusy, setModerationBusy] = useState<string>('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [commands, setCommands] = useState<BotCommand[]>([])
  const [newCmd, setNewCmd] = useState<Partial<BotCommand>>({
    trigger: '', response: '', cooldown: 5, permission: 'everyone', enabled: true,
  })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => { loadCommands() }, [])

  useEffect(() => {
    if (!actionMenuId) return
    const closeMenu = () => setActionMenuId(null)
    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('click', closeMenu)
    window.addEventListener('keydown', closeOnEsc)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('keydown', closeOnEsc)
    }
  }, [actionMenuId])

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

  const handleNotice = async () => {
    const message = input.trim()
    if (!message) return
    setNoticing(true)
    try {
      await chatApi.notice({ message })
      setInput('')
      addToast({ type: 'info', title: '공지 등록 완료', message })
    } catch { addToast({ type: 'error', title: '공지 등록 실패' }) }
    finally { setNoticing(false) }
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

  const targetIdOf = (msg: ChatMessage) => msg.userId || msg.senderChannelId || ''

  const runModeration = async (action: 'restrict' | 'temporary' | 'blind', msg: ChatMessage) => {
    const targetChannelId = targetIdOf(msg)
    if (!targetChannelId) {
      addToast({ type: 'error', title: '사용자 채널 ID가 없어 처리할 수 없습니다' })
      return
    }

    const busyKey = `${action}:${msg.id}`
    setModerationBusy(busyKey)
    setActionMenuId(null)
    try {
      if (action === 'restrict') {
        await channelApi.addRestriction(targetChannelId)
        addToast({ type: 'info', title: `${msg.nickname} 활동제한 추가` })
      } else if (action === 'temporary') {
        if (!msg.chatChannelId) throw new Error('chatChannelId required')
        await channelApi.addTemporaryRestriction({ targetChannelId, chatChannelId: msg.chatChannelId })
        addToast({ type: 'info', title: `${msg.nickname} 임시제한 추가` })
      } else {
        const messageTime = msg.messageTime || (msg.timestamp ? new Date(msg.timestamp).getTime() : 0)
        const senderChannelId = msg.senderChannelId || targetChannelId
        if (!msg.chatChannelId || !messageTime) throw new Error('message metadata required')
        await chatApi.blindMessage({ chatChannelId: msg.chatChannelId, messageTime, senderChannelId })
        addToast({ type: 'info', title: `${msg.nickname} 메시지 숨김 처리` })
      }
    } catch {
      addToast({ type: 'error', title: '활동 제한 처리 실패' })
    } finally {
      setModerationBusy('')
    }
  }

  return (
    <div className="flex h-full bg-bg-outer overflow-hidden gap-3 p-3">

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
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    msg={msg}
                    menuOpen={actionMenuId === msg.id}
                    busy={moderationBusy.endsWith(`:${msg.id}`)}
                    onToggleMenu={() => setActionMenuId((id) => (id === msg.id ? null : msg.id))}
                    onModeration={(action) => runModeration(action, msg)}
                  />
                ))}
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
            onClick={handleNotice}
            disabled={noticing || sending || !input.trim()}
            title="공지로 등록"
            className="px-3 border border-accent-purple/40 text-accent-purple rounded-xl hover:bg-accent-purple/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Megaphone size={14} />
          </button>
          <button
            onClick={handleSend}
            disabled={sending || noticing || !input.trim()}
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

function ChatBubble({
  msg,
  menuOpen,
  busy,
  onToggleMenu,
  onModeration,
}: {
  msg: ChatMessage
  menuOpen: boolean
  busy: boolean
  onToggleMenu: () => void
  onModeration: (action: 'restrict' | 'temporary' | 'blind') => void
}) {
  const vip = getVipTier(msg.donationTotal ?? 0)
  const canModerate = !!(msg.userId || msg.senderChannelId)
  const canUseChatAction = !!msg.chatChannelId

  return (
    <div className={`group relative flex gap-2 rounded-lg px-1.5 py-1 transition-colors ${vip ? vip.rowClass : 'hover:bg-white/3'}`}>
      <div className="flex items-center gap-1.5 shrink-0 leading-snug">
        <ChatBadges badges={msg.badges} />
        {vip && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${vip.badgeClass}`}>
            {vip.label}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleMenu()
          }}
          disabled={!canModerate || busy}
          className={`text-sm font-semibold rounded px-1 -mx-1 transition-colors disabled:cursor-default ${vip ? vip.nameClass : 'hover:bg-white/5'}`}
          style={vip ? undefined : { color: getNickColor(msg.nickname) }}
        >
          {msg.nickname}
        </button>
      </div>
      <span
        className="text-sm text-text-secondary break-all leading-snug pr-6"
        dangerouslySetInnerHTML={{ __html: renderWithEmojis(msg.message, msg.emojis) }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleMenu()
        }}
        disabled={!canModerate || busy}
        className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 disabled:opacity-20 text-text-muted hover:text-text-secondary transition-opacity"
        title="채팅 관리"
      >
        <MoreVertical size={14} />
      </button>

      {menuOpen && (
        <div
          className="absolute left-2 top-8 z-30 w-44 overflow-hidden rounded-xl border border-border bg-bg-card shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onModeration('restrict')}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent-danger/10 hover:text-accent-danger transition-colors"
          >
            <ShieldBan size={13} /> 활동제한
          </button>
          <button
            type="button"
            onClick={() => onModeration('temporary')}
            disabled={!canUseChatAction}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent-warning/10 hover:text-accent-warning transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            title={canUseChatAction ? '임시제한' : '채팅 채널 정보가 있는 실시간 메시지만 가능합니다'}
          >
            <Clock size={13} /> 임시제한
          </button>
          <button
            type="button"
            onClick={() => onModeration('blind')}
            disabled={!canUseChatAction}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            title={canUseChatAction ? '메시지 숨김' : '채팅 채널 정보가 있는 실시간 메시지만 가능합니다'}
          >
            <EyeOff size={13} /> 메시지 숨김
          </button>
        </div>
      )}
    </div>
  )
}
