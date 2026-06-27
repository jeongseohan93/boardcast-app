/**
 * [방송 설정 카드]
 *
 * 방송 제목·카테고리·태그를 조회하고 수정하는 폼 카드.
 * 상태를 모두 내부에서 관리하므로 DashboardPage와 독립적으로 동작한다.
 *
 * 동작 흐름:
 *   마운트 → liveApi.getSetting() + liveApi.getTitleHistory() 호출
 *   변경 감지 → hasChanges = true → '업데이트' 버튼 활성화
 *   저장 → liveApi.updateSetting({ 변경된 필드만 })
 *
 * 카테고리 검색:
 *   입력창에 게임명 입력 후 Enter/검색 버튼 → categoryApi.search() → 드롭다운 표시
 *
 * 태그:
 *   최대 5개, 각 태그 15자 이하, 중복 불가
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, X, Radio, Zap } from 'lucide-react'
import { liveApi, categoryApi } from '../../api/client'
import { useToastStore } from '../../store/toastStore'
import Button from '../Button'
import type { LiveSetting, Category } from './types'

/** 필드 행 래퍼 — 라벨 + 콘텐츠 슬롯 */
function FieldRow({
  label,
  required,
  children,
}: {
  label: React.ReactNode
  required?: boolean
  children: React.ReactNode
}) {
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

export default function LiveSettingCard() {
  const addToast = useToastStore((s) => s.addToast)

  /* 서버에서 불러온 현재 방송 설정 (변경 여부 비교 기준) */
  const [live, setLive] = useState<LiveSetting | null>(null)

  /* 폼 상태 — live와 별도로 관리해 "변경됨" 감지 */
  const [title, setTitle]               = useState('')
  const [titleHistory, setTitleHist]    = useState<string[]>([])
  const [showHist, setShowHist]         = useState(false)
  const [catQuery, setCatQuery]         = useState('')
  const [catResults, setCatResults]     = useState<Category[]>([])
  const [catOpen, setCatOpen]           = useState(false)
  const [selectedCat, setSelectedCat]   = useState<Category | null>(null)
  const [tags, setTags]                 = useState<string[]>([])
  const [tagInput, setTagInput]         = useState('')
  const [updating, setUpdating]         = useState(false)

  const catDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadLive = async () => {
      try {
        const [liveRes, histRes] = await Promise.all([
          liveApi.getSetting(),
          liveApi.getTitleHistory(),
        ])
        const l: LiveSetting = liveRes.data
        setLive(l)
        setTitle(l.defaultLiveTitle || '')
        setSelectedCat(l.category?.categoryId ? l.category : null)
        setTags(l.tags || [])
        setTitleHist(histRes.data || [])
      } catch {
        addToast({ type: 'error', title: '방송 설정 로드 실패' })
      }
    }
    void loadLive()
  }, [addToast])

  /* 카테고리 드롭다운 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!catOpen) return
    const handler = (e: MouseEvent) => {
      if (!catDropdownRef.current?.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [catOpen])

  const handleCatSearch = async () => {
    if (!catQuery.trim()) return
    try {
      const res = await categoryApi.search(catQuery)
      setCatResults(res.data?.data || res.data || [])
      setCatOpen(true)
    } catch {
      addToast({ type: 'error', title: '카테고리 검색 실패' })
    }
  }

  const handleAddTag = () => {
    const t = tagInput.trim().replace(/\s+/g, '')
    if (!t || tags.includes(t) || tags.length >= 5 || t.length > 15) return
    setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag))

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const body: { defaultLiveTitle?: string; categoryId?: string; categoryType?: string; tags?: string[] } = {}
      if (title.trim() !== live?.defaultLiveTitle) body.defaultLiveTitle = title.trim()
      if (selectedCat?.categoryId !== live?.category?.categoryId) {
        body.categoryId   = selectedCat?.categoryId
        body.categoryType = selectedCat?.categoryType
      }
      if (JSON.stringify(tags) !== JSON.stringify(live?.tags || [])) body.tags = tags

      if (Object.keys(body).length === 0) {
        addToast({ type: 'info', title: '변경된 내용이 없습니다.' })
        return
      }

      await liveApi.updateSetting(body)
      setLive((p) => ({ ...p, defaultLiveTitle: title.trim(), category: selectedCat || undefined, tags }))

      /* 제목이 변경됐으면 히스토리 갱신 */
      if (body.defaultLiveTitle) {
        const h = await liveApi.getTitleHistory()
        setTitleHist(h.data || [])
      }
      addToast({ type: 'info', title: '방송 설정이 업데이트되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '업데이트 실패' })
    } finally {
      setUpdating(false)
    }
  }

  /** 현재 폼 값이 저장된 live와 다른지 여부 */
  const hasChanges =
    title.trim() !== (live?.defaultLiveTitle || '') ||
    selectedCat?.categoryId !== live?.category?.categoryId ||
    JSON.stringify(tags) !== JSON.stringify(live?.tags || [])

  return (
    <div className="flex-[3] min-w-0 flex flex-col min-h-0 bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* 헤더 */}
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
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FieldRow>

          {/* 카테고리 */}
          <FieldRow label="카테고리">
            <div className="relative" ref={catDropdownRef}>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint transition-colors"
                  placeholder="게임/카테고리 검색..."
                  value={catQuery}
                  onChange={(e) => {
                    setCatQuery(e.target.value)
                    if (!e.target.value) setCatResults([])
                  }}
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
                      onClick={() => {
                        setSelectedCat(cat)
                        setCatQuery(cat.categoryValue || '')
                        setCatOpen(false)
                        setCatResults([])
                      }}
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
            {/* 선택된 카테고리 미리보기 */}
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
                <button
                  onClick={() => { setSelectedCat(null); setCatQuery('') }}
                  className="text-text-muted hover:text-text-secondary transition-colors shrink-0 p-1"
                >
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
              >
                추가
              </button>
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

        {/* 저장 버튼 */}
        <div className="p-4 border-t border-border shrink-0">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleUpdate}
            disabled={updating || !hasChanges}
          >
            <Zap size={14} />
            {updating ? '업데이트 중...' : '업데이트'}
          </Button>
        </div>
      </div>
    </div>
  )
}
