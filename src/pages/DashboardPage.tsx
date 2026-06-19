import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Send, RefreshCw, X, Users, Gift, Star, Heart, Radio, MessageSquare, WifiOff, Zap } from 'lucide-react'
import { liveApi, categoryApi, chatApi, eventsApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSocket } from '../hooks/useSocket'
import { useChatStore } from '../store/chatStore'
import { useToastStore } from '../store/toastStore'
import Button from '../components/Button'
import { renderWithEmojis } from '../utils/chat'

interface Summary {
  today: { donationSum: number; subscriptionCount: number; followCount: number }
  month: { donationSum: number }
  recentEvents: RecentEvent[]
}

interface RecentEvent {
  id: number
  eventType: 'donation' | 'subscription' | 'follow'
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

  const [summary, setSummary]         = useState<Summary | null>(null)
  const [loading, setLoading]         = useState(true)
  const [rtDonation, setRtDonation]   = useState(0)
  const [rtSub, setRtSub]             = useState(0)
  const [rtFollow, setRtFollow]       = useState(0)

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

  const [chzzkConnected, setChzzkConnected] = useState<boolean | null>(null)
  const [reconnecting, setReconnecting]     = useState(false)

  const [chatInput, setChatInput] = useState('')
  const [sending, setSending]     = useState(false)
  const chatEndRef                = useRef<HTMLDivElement>(null)
  const chatContainerRef          = useRef<HTMLDivElement>(null)
  const socketInit                = useRef(false)

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
    socket.on('donation', (data: { amount: number; nickname: string }) => {
      setRtDonation((p) => p + (data.amount || 0))
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'donation', nickname: data.nickname, amount: data.amount, created_at: new Date().toISOString() }
        return { ...prev, today: { ...prev.today, donationSum: prev.today.donationSum + (data.amount || 0) }, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    })
    socket.on('subscription', (data: { nickname: string; month?: number }) => {
      setRtSub((p) => p + 1)
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'subscription', nickname: data.nickname, month: data.month, created_at: new Date().toISOString() }
        return { ...prev, today: { ...prev.today, subscriptionCount: prev.today.subscriptionCount + 1 }, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    })
    socket.on('follow', (data: { followerCount: number }) => {
      setRtFollow((p) => p + 1)
      setSummary((prev) => {
        if (!prev) return prev
        const e: RecentEvent = { id: Date.now(), eventType: 'follow', follower_count: data.followerCount, created_at: new Date().toISOString() }
        return { ...prev, today: { ...prev.today, followCount: prev.today.followCount + 1 }, recentEvents: [e, ...prev.recentEvents].slice(0, 20) }
      })
    })
    return () => {
      socket.off('donation'); socket.off('subscription'); socket.off('follow')
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

  const hasChanges = title.trim() !== (live?.defaultLiveTitle || '')
    || selectedCat?.categoryId !== live?.category?.categoryId
    || JSON.stringify(tags) !== JSON.stringify(live?.tags || [])

  const todayDonation     = (summary?.today.donationSum    ?? 0) + rtDonation
  const todaySubscription = (summary?.today.subscriptionCount ?? 0) + rtSub
  const todayFollow       = (summary?.today.followCount    ?? 0) + rtFollow

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-screen bg-bg-outer overflow-hidden">

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
              <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse shrink-0" />
              CHZZK 연결됨
            </span>
          ) : null}
          <button onClick={load} disabled={loading} className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── 바디 ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden gap-3 p-3">

        {/* ── 좌: 설정 패널 ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 gap-3">

          {/* 통계 카드 */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <StatCard icon={<Users size={15} />} value={followerCount.toLocaleString()} label="팔로워"   iconCls="text-accent-mint" bgCls="bg-accent-mint/10" />
            <StatCard icon={<Gift size={15} />}  value={todayDonation.toLocaleString()} label="오늘 치즈" iconCls="text-yellow-400"  bgCls="bg-yellow-400/10" />
            <StatCard icon={<Star size={15} />}  value={String(todaySubscription)}      label="구독"     iconCls="text-purple-400"  bgCls="bg-purple-400/10" />
            <StatCard icon={<Heart size={15} />} value={String(todayFollow)}            label="팔로우"   iconCls="text-pink-400"    bgCls="bg-pink-400/10" />
          </div>

          {/* 방송 설정 카드 — 남은 높이 전부 차지 */}
          <div className="flex-1 flex flex-col min-h-0 bg-bg-card border border-border rounded-2xl overflow-hidden">
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

        </div>

        {/* ── 중: 최근 이벤트 패널 ──────────────────────────────────────────── */}
        <div className="w-[280px] shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-sm font-semibold text-text-primary">최근 이벤트</span>
            {summary?.recentEvents.length ? (
              <span className="text-xs text-text-muted bg-bg-outer px-1.5 py-0.5 rounded-md">{summary.recentEvents.length}</span>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {summary?.recentEvents.length ? (
              summary.recentEvents.map((e) => (
                <div key={`${e.eventType}-${e.id}`} className="flex items-start gap-2.5 px-4 py-3 hover:bg-white/2 transition-colors">
                  <EventBadge type={e.eventType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary truncate">
                      {e.eventType === 'donation'     && `${e.nickname} — ${e.amount?.toLocaleString()} 치즈`}
                      {e.eventType === 'subscription' && `${e.nickname} 구독${e.month ? ` ${e.month}개월` : ''}`}
                      {e.eventType === 'follow'       && `팔로워 ${e.follower_count?.toLocaleString()}명`}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{formatTime(e.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-5 pb-10">
                <div className="w-10 h-10 rounded-xl bg-bg-outer border border-border flex items-center justify-center mb-3">
                  <Star size={18} className="text-border" />
                </div>
                <p className="text-sm text-text-muted">이벤트 없음</p>
                <p className="text-xs text-text-muted/60 mt-1 leading-relaxed">후원·구독·팔로우가<br/>발생하면 표시됩니다</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 우: 채팅 패널 ─────────────────────────────────────────────────── */}
        <div className="w-[340px] shrink-0 flex flex-col bg-bg-card border border-border rounded-2xl overflow-hidden">

          {/* 채팅 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">실시간 채팅</span>
            </div>
            {messages.length > 0 && (
              <span className="text-xs text-text-muted">{messages.length}개</span>
            )}
          </div>

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
                    <div key={msg.id} className="flex gap-2 hover:bg-white/3 rounded-lg px-1.5 py-1 transition-colors group">
                      <span className="text-sm font-semibold shrink-0 leading-snug" style={{ color: getNickColor(msg.nickname) }}>
                        {msg.nickname}
                      </span>
                      <span
                        className="text-sm text-text-secondary break-all leading-snug"
                        dangerouslySetInnerHTML={{ __html: renderWithEmojis(msg.message, msg.emojis) }}
                      />
                    </div>
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
              onClick={handleSend}
              disabled={sending || !chatInput.trim()}
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

function EventBadge({ type }: { type: 'donation' | 'subscription' | 'follow' }) {
  if (type === 'donation')     return <span className="text-xs px-1.5 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-md shrink-0 font-medium">치즈</span>
  if (type === 'subscription') return <span className="text-xs px-1.5 py-0.5 bg-purple-400/10 text-purple-400 border border-purple-400/20 rounded-md shrink-0 font-medium">구독</span>
  return                              <span className="text-xs px-1.5 py-0.5 bg-pink-400/10 text-pink-400 border border-pink-400/20 rounded-md shrink-0 font-medium">팔로우</span>
}
