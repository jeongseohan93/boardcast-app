import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Send, RefreshCw, X, Users, Gift, Star, Heart, Radio, MessageSquare, WifiOff, Zap, Megaphone, ArrowLeft, ArrowRight, LayoutGrid, MoreVertical, ShieldBan, EyeOff, Clock } from 'lucide-react'
import { liveApi, categoryApi, chatApi, eventsApi, channelApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSocket } from '../hooks/useSocket'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import { useVoteStore } from '../store/voteStore'
import Button from '../components/Button'
import { renderWithEmojis } from '../utils/chat'
import { getVipTier } from '../utils/vip'
import { ChatBadges } from '../utils/badges'
import type { ChatMessage } from '../store/chatStore'

interface Summary {
  today: { donationSum: number; subscriptionCount: number; followCount: number; unfollowCount?: number; netFollowCount?: number }
  month: { donationSum: number }
  recentEvents: RecentEvent[]
}

interface RecentEvent {
  id: number
  eventType: 'donation' | 'subscription' | 'follow' | 'unfollow'
  nickname?: string
  amount?: number
  month?: number
  follower_count?: number
  created_at: string
}

interface LiveSetting {
  defaultLiveTitle?: string
  category?: Category
  tags?: string[]
}

interface Category {
  categoryId?: string
  categoryType?: string
  categoryValue?: string
  posterImageUrl?: string
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

export default function DashboardPage() {
  const { channelName, followerCount } = useAuthStore()
  const socket = useSocket()
  const { messages, unread, isAtBottom, setAtBottom, markRead } = useChatStore()
  const addToast = useToastStore((s) => s.addToast)
  const poll = useVoteStore((s) => s.poll)

  const [summary, setSummary]         = useState<Summary | null>(null)
  const [loading, setLoading]         = useState(true)
  const [rtDonation, setRtDonation]   = useState(0)
  const [rtSub, setRtSub]             = useState(0)
  const [rtFollow, setRtFollow]       = useState(0)
  const [emojiSize, setEmojiSize]     = useState<number>(() => {
    const v = localStorage.getItem('chatEmojiSize')
    return v ? parseInt(v) : 20
  })

  const [live, setLive]               = useState<LiveSetting | null>(null)
  const [title, setTitle]             = useState('')
  const [titleHistory, setTitleHist]  = useState<string[]>([])
  const [showHist, setShowHist]       = useState(false)
  const [catQuery, setCatQuery]       = useState('')
  const [catResults, setCatResults]   = useState<Category[]>([])
  const [catOpen, setCatOpen]         = useState(false)
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [tags, setTags]               = useState<string[]>([])
  const [tagInput, setTagInput]       = useState('')
  const [updating, setUpdating]       = useState(false)

  const [chzzkConnected, setChzzkConnected]   = useState<boolean | null>(null)
  const [reconnecting, setReconnecting]       = useState(false)
  const [showEmojiDropdown, setShowEmojiDropdown] = useState(false)
  const emojiDropdownRef                      = useRef<HTMLDivElement>(null)

  const [layoutEditing, setLayoutEditing] = useState(false)
  const [chatSide, setChatSide]   = useState<'left'|'right'>(() =>
    (localStorage.getItem('dashChatSide') as 'left'|'right') || 'right'
  )
  const [eventSide, setEventSide] = useState<'left'|'right'>(() =>
    (localStorage.getItem('dashEventSide') as 'left'|'right') || 'right'
  )
  const toggleChatSide = () => {
    const next = chatSide === 'right' ? 'left' : 'right'
    setChatSide(next)
    localStorage.setItem('dashChatSide', next)
  }
  const toggleEventSide = () => {
    const next = eventSide === 'right' ? 'left' : 'right'
    setEventSide(next)
    localStorage.setItem('dashEventSide', next)
  }

  const [chatInput, setChatInput] = useState('')
  const [sending, setSending]     = useState(false)
  const [noticing, setNoticing]   = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [moderationBusy, setModerationBusy] = useState<string>('')
  const chatEndRef                = useRef<HTMLDivElement>(null)
  const chatContainerRef          = useRef<HTMLDivElement>(null)
  const socketInit                = useRef(false)

  useEffect(() => {
    if (!showEmojiDropdown) return
    const handler = (e: MouseEvent) => {
      if (!emojiDropdownRef.current?.contains(e.target as Node)) setShowEmojiDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiDropdown])

  const load = async () => {
    setLoading(true)
    setRtDonation(0); setRtSub(0); setRtFollow(0)
    try {
      const [sumRes, liveRes, histRes] = await Promise.all([
        eventsApi.summary(), liveApi.getSetting(), liveApi.getTitleHistory(),
      ])
      const l: LiveSetting = liveRes.data
      setSummary(sumRes.data)
      setLive(l)
      setTitle(l.defaultLiveTitle || '')
      setSelectedCat(l.category?.categoryId ? l.category : null)
      setTags(l.tags || [])
      setTitleHist(histRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

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
    const check = () => {
      fetch('http://localhost:3001/api/session-status')
        .then(r => r.json()).then(d => setChzzkConnected(d.connected))
        .catch(() => setChzzkConnected(false))
    }
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])

  const handleReconnect = async () => {
    setReconnecting(true)
    try {
      await fetch('http://localhost:3001/api/session-reconnect', { method: 'POST' })
      setTimeout(() => {
        fetch('http://localhost:3001/api/session-status')
          .then(r => r.json()).then(d => setChzzkConnected(d.connected))
      }, 2000)
    } catch {}
    setReconnecting(false)
  }

  useEffect(() => {
    if (!socket || socketInit.current) return
    socketInit.current = true

    const onDonation = (data: { amount: number; nickname: string }) => {
      setRtDonation((p) => p + (data.amount || 0))
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'donation', nickname: data.nickname, amount: data.amount, created_at: new Date().toISOString() }
        return { ...prev, today: { ...prev.today, donationSum: prev.today.donationSum + (data.amount || 0) }, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    }
    const onSubscription = (data: { nickname: string; month?: number }) => {
      setRtSub((p) => p + 1)
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'subscription', nickname: data.nickname, month: data.month, created_at: new Date().toISOString() }
        return { ...prev, today: { ...prev.today, subscriptionCount: prev.today.subscriptionCount + 1 }, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    }
    const onFollow = (data: { followerCount: number; nickname?: string; removedUnfollowCount?: number }) => {
      const netDelta = 1 + (data.removedUnfollowCount ?? 0)
      setRtFollow((p) => p + netDelta)
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'follow', nickname: data.nickname, follower_count: data.followerCount, created_at: new Date().toISOString() }
        return { ...prev, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    }

    const onUnfollow = (data: { followerCount: number; nickname?: string }) => {
      setRtFollow((p) => p - 1)
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'unfollow', nickname: data.nickname, follower_count: data.followerCount, created_at: new Date().toISOString() }
        return { ...prev, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    }

    socket.on('donation', onDonation)
    socket.on('subscription', onSubscription)
    socket.on('follow', onFollow)
    socket.on('unfollow', onUnfollow)

    return () => {
      socket.off('donation', onDonation)
      socket.off('subscription', onSubscription)
      socket.off('follow', onFollow)
      socket.off('unfollow', onUnfollow)
      socketInit.current = false
    }
  }, [socket])

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

  const handleCatSearch = async () => {
    if (!catQuery.trim()) return
    try {
      const res = await categoryApi.search(catQuery)
      setCatResults(res.data?.data || res.data || [])
      setCatOpen(true)
    } catch { addToast({ type: 'error', title: '카테고리 검색 실패' }) }
  }

  const handleAddTag = () => {
    const t = tagInput.trim().replace(/\s+/g, '')
    if (!t || tags.includes(t) || tags.length >= 5 || t.length > 15) return
    setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const body: { defaultLiveTitle?: string; categoryId?: string; categoryType?: string; tags?: string[] } = {}
      if (title.trim() !== live?.defaultLiveTitle) body.defaultLiveTitle = title.trim()
      if (selectedCat?.categoryId !== live?.category?.categoryId) {
        body.categoryId = selectedCat?.categoryId
        body.categoryType = selectedCat?.categoryType
      }
      if (JSON.stringify(tags) !== JSON.stringify(live?.tags || [])) body.tags = tags
      if (Object.keys(body).length === 0) { addToast({ type: 'info', title: '변경된 내용이 없습니다.' }); return }
      await liveApi.updateSetting(body)
      setLive((p) => ({ ...p, defaultLiveTitle: title.trim(), category: selectedCat || undefined, tags }))
      if (body.defaultLiveTitle) { const h = await liveApi.getTitleHistory(); setTitleHist(h.data || []) }
      addToast({ type: 'info', title: '방송 설정이 업데이트되었습니다.' })
    } catch { addToast({ type: 'error', title: '업데이트 실패' }) }
    finally { setUpdating(false) }
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

  const hasChanges = title.trim() !== (live?.defaultLiveTitle || '')
    || selectedCat?.categoryId !== live?.category?.categoryId
    || JSON.stringify(tags) !== JSON.stringify(live?.tags || [])

  const todayDonation     = (summary?.today.donationSum    ?? 0) + rtDonation
  const todaySubscription = (summary?.today.subscriptionCount ?? 0) + rtSub
  const todayFollow       = (summary?.today.netFollowCount ?? ((summary?.today.followCount ?? 0) - (summary?.today.unfollowCount ?? 0))) + rtFollow

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-card shrink-0">
        {/* 채널 정보 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-mint to-teal-400 flex items-center justify-center text-bg-outer font-bold text-base shrink-0 shadow-md">
            {channelName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-tight">{channelName || '채널'}</p>
            <p className="text-xs text-text-muted leading-tight">치지직 방송 도우미</p>
          </div>
        </div>

        {/* 오른쪽: 연결 상태 + 새로고침 */}
        <div className="flex items-center gap-3">
          {chzzkConnected === false ? (
            <button
              onClick={handleReconnect} disabled={reconnecting}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <WifiOff size={12} />
              {reconnecting ? '연결 중...' : '연결 안됨 · 클릭하여 재연결'}
            </button>
          ) : chzzkConnected === true ? (
            <span className="flex items-center gap-1.5 text-xs text-accent-mint bg-accent-mint/10 border border-accent-mint/20 rounded-lg px-2.5 py-1.5">
              <img src="/chzzklogo_kor(Green).png" alt="CHZZK" className="h-3.5 w-auto object-contain shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse shrink-0" />
              CHZZK 연결됨
            </span>
          ) : null}
          <button
            onClick={() => setLayoutEditing((v) => !v)}
            className={`flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 transition-colors ${
              layoutEditing
                ? 'border-accent-mint text-accent-mint bg-accent-mint/10'
                : 'border-border text-text-secondary hover:text-text-primary hover:border-accent-mint/40'
            }`}
          >
            <LayoutGrid size={12} />
            {layoutEditing ? '완료' : '위치 편집'}
          </button>
          <button onClick={load} disabled={loading} className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 바디 ──────────────────────────────────────────────────────────────── */}
      <div className={`flex flex-1 min-h-0 overflow-hidden gap-3 p-3 ${chatSide === 'left' ? 'flex-row-reverse' : ''}`}>

        {/* ── 좌: 통계 + (방송설정 | 최근이벤트) ──────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3">

          {/* 통계 카드 */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <StatCard icon={<Users size={15} />} value={followerCount.toLocaleString()} label="팔로워"   iconCls="text-accent-mint" bgCls="bg-accent-mint/10" />
            <StatCard icon={<Gift size={15} />}  value={todayDonation.toLocaleString()} label="오늘 치즈" iconCls="text-yellow-400"  bgCls="bg-yellow-400/10" />
            <StatCard icon={<Star size={15} />}  value={String(todaySubscription)}      label="구독"     iconCls="text-purple-400"  bgCls="bg-purple-400/10" />
            <StatCard icon={<Heart size={15} />} value={`${todayFollow >= 0 ? '+' : ''}${todayFollow}`} label="순 팔로우" iconCls={todayFollow >= 0 ? 'text-pink-400' : 'text-red-400'} bgCls={todayFollow >= 0 ? 'bg-pink-400/10' : 'bg-red-400/10'} />
          </div>

          {/* 방송설정 + 최근이벤트 — 남은 높이 전부 */}
          <div className={`flex-1 flex min-h-0 gap-3 ${eventSide === 'left' ? 'flex-row-reverse' : ''}`}>

          {/* 방송 설정 카드 */}
          <div className="flex-[3] min-w-0 flex flex-col min-h-0 bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
              <Radio size={14} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">방송 설정</span>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* 방송 제목 */}
                <FieldRow label="방송 제목" required>
                  <div className="relative">
                    <input
                      className="w-full bg-bg-input border border-border rounded-xl px-3 py-2.5 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setShowHist(false)}
                      placeholder="방송 제목 입력..."
                      maxLength={100}
                    />
                    {titleHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowHist((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                      >
                        <ChevronDown size={15} className={`transition-transform ${showHist ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {showHist && (
                      <div className="absolute z-30 top-full mt-1 w-full bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                        {titleHistory.map((t, i) => (
                          <button
                            key={i}
                            className="w-full text-left px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors truncate"
                            onClick={() => { setTitle(t); setShowHist(false) }}
                          >{t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </FieldRow>

                {/* 카테고리 */}
                <FieldRow label="카테고리">
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
                        placeholder="게임/카테고리 검색..."
                        value={catQuery}
                        onChange={(e) => { setCatQuery(e.target.value); if (!e.target.value) setCatResults([]) }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCatSearch()}
                      />
                      <button
                        onClick={handleCatSearch}
                        className="px-3 bg-bg-input border border-border rounded-xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-colors"
                      >
                        <Search size={15} />
                      </button>
                    </div>
                    {catOpen && catResults.length > 0 && (
                      <div className="absolute z-30 top-full mt-1 w-full bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                        {catResults.map((cat) => (
                          <button
                            key={cat.categoryId}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                            onClick={() => { setSelectedCat(cat); setCatQuery(cat.categoryValue || ''); setCatOpen(false); setCatResults([]) }}
                          >
                            {cat.posterImageUrl
                              ? <img src={cat.posterImageUrl} alt="" className="w-7 h-9 object-cover rounded shrink-0" />
                              : <div className="w-7 h-9 bg-bg-input rounded shrink-0" />
                            }
                            <span className="text-sm text-text-primary truncate">{cat.categoryValue}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCat && (
                    <div className="mt-2 flex items-center gap-3 p-2.5 bg-bg-outer border border-border rounded-xl">
                      {selectedCat.posterImageUrl
                        ? <img src={selectedCat.posterImageUrl} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
                        : <div className="w-10 h-14 bg-bg-input rounded shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{selectedCat.categoryValue}</p>
                        <p className="text-xs text-text-muted mt-0.5">{selectedCat.categoryType}</p>
                      </div>
                      <button onClick={() => { setSelectedCat(null); setCatQuery('') }} className="text-text-muted hover:text-text-secondary transition-colors shrink-0 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </FieldRow>

                {/* 태그 */}
                <FieldRow label={<>태그 <span className="text-text-muted font-normal text-xs">최대 5개</span></>}>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
                      placeholder="태그 입력 후 Enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                      maxLength={15}
                      disabled={tags.length >= 5}
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={tags.length >= 5 || !tagInput.trim()}
                      className="px-3 bg-bg-input border border-border rounded-xl text-sm text-text-secondary hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >추가</button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-accent-mint/10 text-accent-mint border border-accent-mint/20 rounded-full">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-white transition-colors ml-0.5">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </FieldRow>

            </div>
            <div className="p-4 border-t border-border shrink-0">
                <Button
                  variant="primary" size="md" className="w-full"
                  onClick={handleUpdate} disabled={updating || !hasChanges}
                >
                  <Zap size={14} />
                  {updating ? '업데이트 중...' : '업데이트'}
                </Button>
            </div>
            </div>
          </div>

          {/* 최근 이벤트 */}
          <div className="flex-[2] min-w-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold text-text-primary">최근 이벤트</span>
              <div className="flex items-center gap-1.5">
                {summary?.recentEvents.length ? (
                  <span className="text-xs text-text-muted bg-bg-outer px-1.5 py-0.5 rounded-md">{summary.recentEvents.length}</span>
                ) : null}
                {layoutEditing && (
                  <button
                    onClick={toggleEventSide}
                    title={eventSide === 'right' ? '왼쪽으로 이동' : '오른쪽으로 이동'}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-accent-mint/30 text-accent-mint hover:bg-accent-mint/10 transition-colors"
                  >
                    {eventSide === 'right' ? <ArrowLeft size={11} /> : <ArrowRight size={11} />}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {summary?.recentEvents.length ? (
                summary.recentEvents.map((e) => {
                  const cfg = ({
                    donation:     { icon: <Gift size={14} />,  bg: 'bg-yellow-400/15', color: 'text-yellow-400',  label: `${e.amount?.toLocaleString() ?? 0} 치즈 후원` },
                    subscription: { icon: <Star size={14} />,  bg: 'bg-purple-400/15', color: 'text-purple-400', label: `구독${e.month ? ` ${e.month}개월` : ''}` },
                    follow:       { icon: <Heart size={14} />, bg: 'bg-pink-400/15',   color: 'text-pink-400',   label: '팔로우' },
                    unfollow:     { icon: <X size={14} />,     bg: 'bg-gray-500/15',   color: 'text-gray-400',   label: '팔로우 취소' },
                  } as const)[e.eventType]
                  const name = e.nickname || (e.follower_count ? `팔로워 ${e.follower_count.toLocaleString()}명` : '—')
                  return (
                    <div key={`${e.eventType}-${e.id}`} className="flex items-start gap-3 px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-white/3 transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                        <span className={cfg.color}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate leading-tight">{name}</p>
                        <p className={`text-xs font-medium mt-0.5 ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-xs text-text-muted mt-1">{formatTime(e.created_at)}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-10">
                  <div className="w-10 h-10 rounded-xl bg-bg-outer border border-border flex items-center justify-center mb-3">
                    <Star size={18} className="text-border" />
                  </div>
                  <p className="text-sm text-text-muted">이벤트 없음</p>
                  <p className="text-xs text-text-muted/60 mt-1 leading-relaxed">후원·구독·팔로우가<br/>발생하면 표시됩니다</p>
                </div>
              )}
            </div>
          </div>

          </div>{/* end flex row (방송설정 | 최근이벤트) */}
        </div>{/* end left column */}

        {/* ── 우: 채팅 패널 ─────────────────────────────────────────────────── */}
        <div className="w-[490px] shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">

          {/* 채팅 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">실시간 채팅</span>
              {layoutEditing && (
                <button
                  onClick={toggleChatSide}
                  title={chatSide === 'right' ? '채팅 왼쪽으로 이동' : '채팅 오른쪽으로 이동'}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-accent-mint/30 text-accent-mint hover:bg-accent-mint/10 transition-colors"
                >
                  {chatSide === 'right' ? <><ArrowLeft size={10} />왼쪽</> : <>오른쪽<ArrowRight size={10} /></>}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div ref={emojiDropdownRef} className="relative">
                <button
                  onClick={() => setShowEmojiDropdown((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${showEmojiDropdown ? 'border-accent-mint/50 text-accent-mint bg-accent-mint/10' : 'border-border text-text-muted hover:text-text-secondary hover:border-accent-mint/30'}`}
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
                        onClick={() => { setEmojiSize(value); localStorage.setItem('chatEmojiSize', String(value)); setShowEmojiDropdown(false) }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-bg-outer ${emojiSize === value ? 'text-accent-mint font-semibold' : 'text-text-secondary'}`}
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

          {/* 투표 현황 */}
          {(poll.status === 'active' || poll.status === 'ended') && (() => {
            const total = poll.options.reduce((s, o) => s + o.votes, 0)
            const maxVotes = Math.max(...poll.options.map((o) => o.votes), 1)
            const PCOLS = ['#00FFA3','#A78BFA','#FFD166','#F472B6','#60A5FA','#34D399','#FB923C','#E879F9']
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
                    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                    const isWinner = poll.status === 'ended' && opt.votes === maxVotes && total > 0
                    const color = PCOLS[i % PCOLS.length]
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

          {/* 채팅 메시지 영역 */}
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
                  <p className="text-xs text-text-muted/60 mt-1 leading-relaxed">방송을 시작하면<br/>시청자 채팅이 여기에 표시됩니다</p>
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

            {!isAtBottom && unread > 0 && (
              <button
                onClick={() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setAtBottom(true); markRead() }}
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
            <button
              onClick={handleNotice}
              disabled={noticing || sending || !chatInput.trim()}
              title="공지로 등록"
              className="px-3 border border-accent-purple/40 text-accent-purple rounded-xl hover:bg-accent-purple/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Megaphone size={14} />
            </button>
            <button
              onClick={handleSend}
              disabled={sending || noticing || !chatInput.trim()}
              className="px-3 bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatMessageRow({
  msg,
  emojiSize = 20,
  menuOpen,
  busy,
  onToggleMenu,
  onModeration,
}: {
  msg: ChatMessage
  emojiSize?: number
  menuOpen: boolean
  busy: boolean
  onToggleMenu: () => void
  onModeration: (action: 'restrict' | 'temporary' | 'blind') => void
}) {
  const vip = getVipTier(msg.donationTotal ?? 0)
  const canModerate = !!(msg.userId || msg.senderChannelId)
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
        dangerouslySetInnerHTML={{ __html: renderWithEmojis(msg.message, msg.emojis, emojiSize) }}
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

function FieldRow({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-secondary flex items-center gap-1">
        {label}
        {required && <span className="text-red-400 text-xs">*</span>}
      </label>
      {children}
    </div>
  )
}

function StatCard({ icon, value, label, iconCls, bgCls }: {
  icon: React.ReactNode; value: string; label: string; iconCls: string; bgCls: string
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-3.5 flex flex-col gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bgCls}`}>
        <span className={iconCls}>{icon}</span>
      </div>
      <div>
        <p className="text-xl font-bold text-text-primary tabular-nums leading-none">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}
