import { useEffect, useState, useRef } from 'react'
import { ChevronDown, Check, Search, Radio } from 'lucide-react'
import { liveApi, categoryApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

interface Category { categoryId: string; categoryType: string; categoryValue: string }

export default function LiveSettingPage() {
  const addToast = useToastStore((s) => s.addToast)

  const [title, setTitle]               = useState('')
  const [titleHistory, setTitleHistory] = useState<string[]>([])
  const [showHistory, setShowHistory]   = useState(false)
  const [titleSaving, setTitleSaving]   = useState(false)

  const [catQuery, setCatQuery]         = useState('')
  const [categories, setCategories]     = useState<Category[]>([])
  const [selectedCat, setSelectedCat]   = useState<Category | null>(null)
  const [catSaving, setCatSaving]       = useState(false)
  const [searching, setSearching]       = useState(false)

  const [currentTitle, setCurrentTitle] = useState('')
  const [currentCat, setCurrentCat]     = useState('')

  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [settingRes, histRes] = await Promise.all([
          liveApi.getSetting(),
          liveApi.getTitleHistory(),
        ])
        const s = settingRes.data
        setCurrentTitle(s.defaultLiveTitle || '')
        setTitle(s.defaultLiveTitle || '')
        setCurrentCat(s.category?.name || '')
        setTitleHistory(histRes.data || [])
      } catch { addToast({ type: 'error', title: '방송 정보 로드 실패' }) }
    }
    load()
  }, [addToast])

  const handleTitleSave = async () => {
    if (!title.trim()) return
    setTitleSaving(true)
    try {
      await liveApi.updateSetting({ defaultLiveTitle: title.trim() })
      setCurrentTitle(title.trim())
      const histRes = await liveApi.getTitleHistory()
      setTitleHistory(histRes.data || [])
      addToast({ type: 'info', title: '방송 제목이 변경되었습니다.' })
    } catch { addToast({ type: 'error', title: '제목 변경 실패' }) }
    finally { setTitleSaving(false) }
  }

  const handleCatSearch = async () => {
    if (!catQuery.trim()) return
    setSearching(true)
    try {
      const res = await categoryApi.search(catQuery)
      setCategories(res.data?.data || res.data || [])
    } catch { addToast({ type: 'error', title: '카테고리 검색 실패' }) }
    finally { setSearching(false) }
  }

  const handleCatApply = async () => {
    if (!selectedCat) return
    setCatSaving(true)
    try {
      await liveApi.updateSetting({ categoryId: selectedCat.categoryId })
      setCurrentCat(selectedCat.categoryValue)
      addToast({ type: 'info', title: `카테고리가 "${selectedCat.categoryValue}"으로 변경되었습니다.` })
    } catch { addToast({ type: 'error', title: '카테고리 변경 실패' }) }
    finally { setCatSaving(false) }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-outer overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Radio size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">방송 설정</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl">

        {/* 현재 방송 상태 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-2">현재 방송</p>
          <p className="text-sm font-semibold text-text-primary">{currentTitle || '(제목 없음)'}</p>
          {currentCat && <p className="text-xs text-text-secondary mt-1">{currentCat}</p>}
        </div>

        {/* 제목 변경 */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">방송 제목 변경</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="relative">
              <label className="block text-xs text-text-muted mb-1.5">새 방송 제목</label>
              <input
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                placeholder="방송 제목 입력..."
              />
              {titleHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="absolute right-2.5 bottom-2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  <ChevronDown size={15} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                </button>
              )}
              {showHistory && (
                <div
                  ref={historyRef}
                  className="absolute z-10 top-full mt-1 w-full bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                >
                  {titleHistory.map((t, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors truncate"
                      onClick={() => { setTitle(t); setShowHistory(false) }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleTitleSave}
              disabled={titleSaving || !title.trim() || title === currentTitle}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {titleSaving ? '저장 중...' : '제목 변경'}
            </button>
          </div>
        </div>

        {/* 카테고리 변경 */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">카테고리 변경</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
                placeholder="게임/카테고리 검색..."
                value={catQuery}
                onChange={(e) => setCatQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCatSearch()}
              />
              <button
                onClick={handleCatSearch}
                disabled={searching}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary border border-border hover:border-accent-mint/40 hover:text-text-primary rounded-xl transition-colors disabled:opacity-50"
              >
                <Search size={13} />
                {searching ? '검색 중' : '검색'}
              </button>
            </div>

            {categories.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                {categories.map((cat) => (
                  <button
                    key={cat.categoryId}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between
                      ${selectedCat?.categoryId === cat.categoryId
                        ? 'bg-accent-mint/10 text-accent-mint'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
                    onClick={() => setSelectedCat(cat)}
                  >
                    <span>{cat.categoryValue}</span>
                    {selectedCat?.categoryId === cat.categoryId && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}

            {selectedCat && (
              <div className="flex items-center justify-between p-3 bg-accent-mint/5 border border-accent-mint/20 rounded-xl">
                <span className="text-sm text-accent-mint">선택: {selectedCat.categoryValue}</span>
                <button
                  onClick={handleCatApply}
                  disabled={catSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {catSaving ? '변경 중...' : '적용'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
