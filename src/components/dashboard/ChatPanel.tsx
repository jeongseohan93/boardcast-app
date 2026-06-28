/**
 * [채팅 패널]
 *
 * 실시간 채팅 메시지 표시·전송·채팅 관리(활동제한·임시제한·블라인드) 패널.
 * 투표 진행 중이면 채팅창 위에 실시간 투표 현황이 표시된다.
 *
 * 상태 관리:
 *   - 채팅 메시지, 읽음 상태는 chatStore에서 직접 읽음 (props 아님)
 *   - 투표 상태는 voteStore에서 직접 읽음
 *   - 채팅 입력·전송 상태 등은 로컬 state
 *
 * 채팅 관리 메뉴:
 *   닉네임 클릭 or 오른쪽 ⋮ 버튼 → 드롭다운 (활동제한/임시제한/메시지숨김)
 *   실시간 메시지에만 chatChannelId가 있어 임시제한·블라인드 가능.
 *   DB에서 불러온 과거 메시지는 chatChannelId 없어 활동제한만 가능.
 *
 * 이모티콘 크기:
 *   localStorage('chatEmojiSize')에 저장. 16/20/28/36/48px 5단계.
 *
 * Props:
 *   layoutEditing    — 위치 편집 모드 (채팅 위치 이동 버튼 표시)
 *   chatSide         — 채팅 패널이 오른쪽인지 왼쪽인지
 *   onToggleChatSide — 채팅 패널 좌우 이동 콜백
 */

import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown, MessageSquare, Megaphone, Send,
  ArrowLeft, ArrowRight, ShieldBan, EyeOff, Clock, MoreVertical,
} from 'lucide-react'
import { chatApi, channelApi } from '../../api/client'
import { useChatStore } from '../../store/chatStore'
import { useToastStore } from '../../store/toastStore'
import { useVoteStore } from '../../store/voteStore'
import { renderWithEmojis } from '../../utils/chat'
import { getVipTier } from '../../utils/vip'
import { ChatBadges } from '../../utils/badges'
import type { ChatMessage } from '../../store/chatStore'

interface ChatPanelProps {
  layoutEditing: boolean
  chatSide: 'left' | 'right'
  onToggleChatSide: () => void
}

/** 닉네임별 색상 캐시 — 렌더마다 재계산 방지 */
const NICK_COLORS = ['#FF6B9D','#C77DFF','#72EFDD','#F4A261','#90E0EF','#FFD166','#06D6A0','#EF476F']
const colorCache  = new Map<string, string>()

function getNickColor(nickname: string): string {
  if (!colorCache.has(nickname)) {
    let h = 0
    for (let i = 0; i < nickname.length; i++) h = nickname.charCodeAt(i) + ((h << 5) - h)
    colorCache.set(nickname, NICK_COLORS[Math.abs(h) % NICK_COLORS.length])
  }
  return colorCache.get(nickname)!
}

/** 개별 채팅 메시지 행 */
function ChatMessageRow({
  msg, emojiSize, menuOpen, busy, onToggleMenu, onModeration,
}: {
  msg: ChatMessage
  emojiSize: number
  menuOpen: boolean
  busy: boolean
  onToggleMenu: () => void
  onModeration: (action: 'restrict' | 'temporary' | 'blind') => void
}) {
  const vip            = getVipTier(msg.donationTotal ?? 0)
  const canModerate    = !!(msg.userId || msg.senderChannelId)
  const canUseChatAction = !!msg.chatChannelId

  return (
    <div className={`relative flex gap-2 rounded-lg px-1.5 py-1 transition-colors group ${vip ? vip.rowClass : 'hover:bg-white/3'}`}>
      <div className="flex items-center gap-1.5 shrink-0 leading-snug">
        <ChatBadges badges={msg.badges} />
        {vip && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${vip.badgeClass}`}>
            {vip.label}
          </span>
        )}
        {/* 닉네임 클릭 → 채팅 관리 메뉴 */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleMenu() }}
          disabled={!canModerate || busy}
          className={`text-sm font-semibold rounded px-1 -mx-1 transition-colors disabled:cursor-default ${vip ? vip.nameClass : 'hover:bg-white/5'}`}
          style={vip ? undefined : { color: getNickColor(msg.nickname) }}
        >
          {msg.nickname}
        </button>
      </div>

      <span
        className="text-sm text-text-secondary break-all leading-snug pr-6"
        dangerouslySetInnerHTML={{ __html: renderWithEmojis(msg.message, msg.emojis, emojiSize) }}
      />

      {/* 오른쪽 끝 ⋮ 버튼 (hover 시 표시) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleMenu() }}
        disabled={!canModerate || busy}
        className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 disabled:opacity-20 text-text-muted hover:text-text-secondary transition-opacity"
        title="채팅 관리"
      >
        <MoreVertical size={14} />
      </button>

      {/* 채팅 관리 드롭다운 */}
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
            title={canUseChatAction ? undefined : '실시간 메시지에서만 가능합니다'}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent-warning/10 hover:text-accent-warning transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
          >
            <Clock size={13} /> 임시제한
          </button>
          <button
            type="button"
            onClick={() => onModeration('blind')}
            disabled={!canUseChatAction}
            title={canUseChatAction ? undefined : '실시간 메시지에서만 가능합니다'}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
          >
            <EyeOff size={13} /> 메시지 숨김
          </button>
        </div>
      )}
    </div>
  )
}

export default function ChatPanel({ layoutEditing, chatSide, onToggleChatSide }: ChatPanelProps) {
  const { messages, unread, isAtBottom, setAtBottom, markRead } = useChatStore()
  const addToast = useToastStore((s) => s.addToast)
  const poll     = useVoteStore((s) => s.poll)

  const [chatInput,     setChatInput]     = useState('')
  const [sending,       setSending]       = useState(false)
  const [noticing,      setNoticing]      = useState(false)
  const [actionMenuId,  setActionMenuId]  = useState<string | null>(null)
  const [moderationBusy, setModerationBusy] = useState('')
  const [emojiSize,     setEmojiSize]     = useState<number>(() => {
    const v = localStorage.getItem('chatEmojiSize')
    return v ? parseInt(v) : 20
  })
  const [showEmojiDropdown, setShowEmojiDropdown] = useState(false)

  const chatEndRef       = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const emojiDropdownRef = useRef<HTMLDivElement>(null)

  /* 새 메시지 도착 시 맨 아래로 스크롤 */
  useEffect(() => {
    if (isAtBottom) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAtBottom])

  /* 이모티콘 드롭다운 외부 클릭 닫기 */
  useEffect(() => {
    if (!showEmojiDropdown) return
    const handler = (e: MouseEvent) => {
      if (!emojiDropdownRef.current?.contains(e.target as Node)) setShowEmojiDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiDropdown])

  /* 채팅 관리 메뉴 외부 클릭·ESC 닫기 */
  useEffect(() => {
    if (!actionMenuId) return
    const close   = () => setActionMenuId(null)
    const closeEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('click', close)
    window.addEventListener('keydown', closeEsc)
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', closeEsc) }
  }, [actionMenuId])

  const handleScroll = () => {
    const el = chatContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAtBottom(atBottom)
    if (atBottom) markRead()
  }

  const handleSend = async () => {
    if (!chatInput.trim()) return
    setSending(true)
    try { await chatApi.send(chatInput.trim()); setChatInput('') }
    catch { addToast({ type: 'error', title: '채팅 전송 실패' }) }
    finally { setSending(false) }
  }

  const handleNotice = async () => {
    const message = chatInput.trim()
    if (!message) return
    setNoticing(true)
    try {
      await chatApi.notice({ message })
      setChatInput('')
      addToast({ type: 'info', title: '공지 등록 완료', message })
    } catch {
      addToast({ type: 'error', title: '공지 등록 실패' })
    } finally {
      setNoticing(false)
    }
  }

  /**
   * 채팅 관리 액션 실행.
   * restrict: 영구 활동제한 / temporary: 임시제한 / blind: 메시지 숨김
   */
  const runModeration = async (action: 'restrict' | 'temporary' | 'blind', msg: ChatMessage) => {
    const targetChannelId = msg.userId || msg.senderChannelId || ''
    if (!targetChannelId) {
      addToast({ type: 'error', title: '사용자 채널 ID가 없어 처리할 수 없습니다' })
      return
    }

    setModerationBusy(`${action}:${msg.id}`)
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
        const messageTime    = msg.messageTime || (msg.timestamp ? new Date(msg.timestamp).getTime() : 0)
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
    <div className="w-[490px] shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">

      {/* 채팅 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-accent-mint" />
          <span className="text-sm font-semibold text-text-primary">실시간 채팅</span>
          {layoutEditing && (
            <button
              onClick={onToggleChatSide}
              title={chatSide === 'right' ? '채팅 왼쪽으로 이동' : '채팅 오른쪽으로 이동'}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-accent-mint/30 text-accent-mint hover:bg-accent-mint/10 transition-colors"
            >
              {chatSide === 'right'
                ? <><ArrowLeft size={10} />왼쪽</>
                : <>오른쪽<ArrowRight size={10} /></>
              }
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 이모티콘 크기 조절 드롭다운 */}
          <div ref={emojiDropdownRef} className="relative">
            <button
              onClick={() => setShowEmojiDropdown((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                showEmojiDropdown
                  ? 'border-accent-mint/50 text-accent-mint bg-accent-mint/10'
                  : 'border-border text-text-muted hover:text-text-secondary hover:border-accent-mint/30'
              }`}
            >
              이모티콘 조절
              <ChevronDown size={11} className={`transition-transform ${showEmojiDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showEmojiDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-bg-card border border-border rounded-xl shadow-xl py-1 min-w-[130px]">
                {([
                  { label: '작게',      value: 16 },
                  { label: '보통',      value: 20 },
                  { label: '크게',      value: 28 },
                  { label: '매우 크게', value: 36 },
                  { label: '최대',      value: 48 },
                ] as const).map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setEmojiSize(value)
                      localStorage.setItem('chatEmojiSize', String(value))
                      setShowEmojiDropdown(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-bg-outer ${
                      emojiSize === value ? 'text-accent-mint font-semibold' : 'text-text-secondary'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-text-muted tabular-nums">{value}px</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {messages.length > 0 && (
            <span className="text-xs text-text-muted">{messages.length}개</span>
          )}
        </div>
      </div>

      {/* 투표 진행 중 → 채팅 위에 투표 현황 오버레이 */}
      {(poll.status === 'active' || poll.status === 'ended') && (() => {
        const total    = poll.options.reduce((s, o) => s + o.votes, 0)
        const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1)
        const PCOLS    = ['#00FFA3','#A78BFA','#FFD166','#F472B6','#60A5FA','#34D399','#FB923C','#E879F9']
        return (
          <div className="border-b border-border shrink-0 px-3 py-2.5 bg-bg-outer/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text-primary truncate flex-1 mr-2">{poll.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                poll.status === 'active' ? 'bg-accent-mint/20 text-accent-mint' : 'bg-text-muted/20 text-text-muted'
              }`}>
                {poll.status === 'active' ? '진행 중' : '종료'}
              </span>
            </div>
            <div className="space-y-1.5">
              {poll.options.map((opt, i) => {
                const pct      = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                const isWinner = poll.status === 'ended' && opt.votes === maxVotes && total > 0
                const color    = PCOLS[i % PCOLS.length]
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-text-secondary truncate flex-1">
                        <span style={{ color }} className="font-bold mr-1">{i + 1}</span>
                        {opt.label}{isWinner && ' 🏆'}
                      </span>
                      <span className="text-xs ml-2 shrink-0 font-medium" style={{ color }}>
                        {pct}% <span className="text-text-muted font-normal">({opt.votes})</span>
                      </span>
                    </div>
                    <div className="h-1 bg-bg-input rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              총 {total}표{poll.status === 'active' ? ' · 채팅에서 번호 입력' : ' · 투표 종료'}
            </p>
          </div>
        )
      })()}

      {/* 채팅 메시지 스크롤 영역 */}
      <div className="flex-1 relative min-h-0">
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
              <div className="w-12 h-12 rounded-2xl bg-bg-outer border border-border flex items-center justify-center mb-3">
                <MessageSquare size={22} className="text-border" />
              </div>
              <p className="text-sm font-medium text-text-muted">아직 채팅이 없습니다</p>
              <p className="text-xs text-text-muted/60 mt-1 leading-relaxed">
                방송을 시작하면<br />시청자 채팅이 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="px-3 py-2 space-y-0.5">
              {messages.map((msg) => (
                <ChatMessageRow
                  key={msg.id}
                  msg={msg}
                  emojiSize={emojiSize}
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

        {/* 읽지 않은 새 메시지 알림 버튼 */}
        {!isAtBottom && unread > 0 && (
          <button
            onClick={() => {
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              setAtBottom(true)
              markRead()
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-accent-mint text-bg-outer text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg hover:brightness-110 transition-all z-10 whitespace-nowrap"
          >
            ↓ 새 메시지 {unread}개
          </button>
        )}
      </div>

      {/* 채팅 입력 */}
      <div className="p-3 border-t border-border shrink-0 flex gap-2">
        <input
          className="flex-1 bg-bg-outer border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
          placeholder="채팅 입력..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        {/* 공지 등록 버튼 */}
        <button
          onClick={handleNotice}
          disabled={noticing || sending || !chatInput.trim()}
          title="공지로 등록"
          className="px-3 border border-accent-purple/40 text-accent-purple rounded-xl hover:bg-accent-purple/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Megaphone size={14} />
        </button>
        {/* 전송 버튼 */}
        <button
          onClick={handleSend}
          disabled={sending || noticing || !chatInput.trim()}
          className="px-3 bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
