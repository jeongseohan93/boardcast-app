/**
 * [설정 페이지]
 *
 * 앱 전반의 환경설정(OAuth 자격증명, 테마, DB 관리)을 수행하는 페이지.
 *
 * ── clientSecret (password input) ────────────────────────────────────────
 *   Client Secret 은 비밀값이므로 type="password" 로 렌더링한다.
 *   절대로 값을 콘솔에 출력하거나 로그에 기록하지 말 것.
 *
 * ── DB 내보내기 (Blob + URL.createObjectURL) ─────────────────────────────
 *   서버에서 SQLite DB 파일을 ArrayBuffer 로 받아 Blob 을 생성한 뒤,
 *   임시 <a> 태그를 생성해 다운로드 트리거 후 revokeObjectURL 로 메모리를 해제한다.
 *
 * ── 파괴적 작업 확인 (window.confirm) ────────────────────────────────────
 *   로그아웃, DB 초기화 등 되돌릴 수 없는 동작 전에 반드시 confirm() 확인 대화상자를 띄운다.
 *   사용자 실수를 방지하기 위한 최소한의 안전장치.
 *
 * ── importInputRef (숨겨진 file input) ──────────────────────────────────
 *   DB 가져오기 버튼 클릭 → ref 를 통해 hidden <input type="file"> 를 프로그래밍적으로 클릭한다.
 *   실제 파일 선택 UI 를 직접 트리거하면서도 버튼 스타일을 자유롭게 커스텀할 수 있다.
 *
 * ── 앱 테마 (appTheme) ────────────────────────────────────────────────────
 *   APP_THEMES 배열에서 테마를 선택하면 applyAppTheme 이 document.documentElement 에
 *   data-app-theme 어트리뷰트를 설정해 CSS 변수를 즉시 전환한다.
 *   선택한 테마는 localStorage 에도 저장돼 앱 재시작 후에도 유지된다.
 */
import { useState, useEffect, useRef } from 'react'
import { ExternalLink, LogOut, Trash2, AlertTriangle, Settings, User, Palette, Database, Download, Upload, Wrench } from 'lucide-react'
import { authApi, eventsApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import { APP_THEMES, AppTheme, applyAppTheme, getStoredAppTheme } from '../utils/appTheme'

export default function SettingsPage() {
  const { isAuthenticated, channelName, channelImageUrl, followerCount, checkAuth, logout } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)

  const [clientId, setClientId]     = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving]         = useState(false)
  const [version, setVersion]       = useState('')
  const [theme, setTheme]           = useState<AppTheme>(() => getStoredAppTheme())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [dbBusy, setDbBusy]         = useState('')
const importInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const creds = await authApi.getCredentials()
        setClientId(creds.data.clientId || '')
      } catch { /* ignore */ }
      if (window.electronAPI?.getVersion) {
        const v = await window.electronAPI.getVersion()
        setVersion(v)
      }
    }
    load()
  }, [])

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      addToast({ type: 'error', title: 'Client ID와 Secret을 모두 입력해주세요.' })
      return
    }
    setSaving(true)
    try {
      await authApi.saveCredentials(clientId.trim(), clientSecret.trim())
      await checkAuth()
      addToast({ type: 'info', title: 'API 키가 저장되었습니다.' })
    } catch { addToast({ type: 'error', title: '저장 실패' }) }
    finally { setSaving(false) }
  }

  const handleLogout = async () => {
    await logout()
    addToast({ type: 'info', title: '로그아웃되었습니다.' })
  }

  const handleDeleteAllEvents = async () => {
    setDeleting(true)
    try {
      await eventsApi.deleteAll()
      setShowDeleteModal(false)
      addToast({ type: 'info', title: '이벤트 데이터가 초기화되었습니다.' })
    } catch { addToast({ type: 'error', title: '삭제 실패' }) }
    finally { setDeleting(false) }
  }

  const handleCleanupDb = async () => {
    if (!confirm('다시 팔로우한 사용자의 기존 팔로우 취소 기록을 정리할까요?')) return
    setDbBusy('cleanup')
    try {
      const res = await eventsApi.cleanupReconciledUnfollows()
      addToast({ type: 'info', title: `DB 정리 완료: ${res.data.deleted ?? 0}건 삭제` })
    } catch {
      addToast({ type: 'error', title: 'DB 정리 실패' })
    } finally {
      setDbBusy('')
    }
  }

  const handleExportDb = async () => {
    setDbBusy('export')
    try {
      const res = await eventsApi.exportDb()
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      a.href = url
      a.download = `broadcast-assistant-db-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      addToast({ type: 'info', title: 'DB 내보내기 완료' })
    } catch {
      addToast({ type: 'error', title: 'DB 내보내기 실패' })
    } finally {
      setDbBusy('')
    }
  }

  const handleImportDb = async (file?: File) => {
    if (!file) return
    if (!confirm('가져온 DB로 현재 이벤트 DB를 교체합니다. 계속할까요?')) {
      if (importInputRef.current) importInputRef.current.value = ''
      return
    }
    setDbBusy('import')
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await eventsApi.importDb(payload)
      const imported = res.data.imported ?? {}
      const total = Object.values(imported).reduce((sum: number, value) => sum + Number(value || 0), 0)
      addToast({ type: 'info', title: `DB 가져오기 완료: ${total.toLocaleString()}건` })
    } catch {
      addToast({ type: 'error', title: 'DB 가져오기 실패' })
    } finally {
      setDbBusy('')
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleTheme = (nextTheme: AppTheme) => {
    setTheme(nextTheme)
    applyAppTheme(nextTheme)
    addToast({ type: 'info', title: `${APP_THEMES[nextTheme].label} 테마를 적용했습니다` })
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Settings size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">환경설정</h1>
        {version && <span className="ml-auto text-xs text-text-muted">v{version}</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">

        {/* 계정 정보 */}
        {isAuthenticated && (
          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={13} className="text-accent-mint" />
              <span className="text-sm font-semibold text-text-primary">치지직 계정</span>
            </div>
            <div className="flex items-center gap-4">
              {channelImageUrl ? (
                <img src={channelImageUrl} alt="채널 이미지" className="w-12 h-12 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent-mint/20 border border-accent-mint/30 flex items-center justify-center">
                  <span className="text-accent-mint font-bold">치</span>
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-text-primary">{channelName}</p>
                <p className="text-xs text-text-secondary mt-0.5">팔로워 {followerCount.toLocaleString()}명</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOut size={12} /> 로그아웃
              </button>
            </div>
          </div>
        )}

<div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Palette size={13} className="text-accent-mint" />
            <span className="text-sm font-semibold text-text-primary">프로그램 테마</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(APP_THEMES) as [AppTheme, typeof APP_THEMES.midnight][]).map(([key, item]) => {
                const selected = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTheme(key)}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      selected
                        ? 'border-accent-mint bg-accent-mint/10'
                        : 'border-border bg-bg-outer hover:border-accent-mint/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      {item.swatches.map((color) => (
                        <span
                          key={color}
                          className="w-5 h-5 rounded-full border border-white/20"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* API 키 설정 */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">치지직 API 키</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-2 p-3 bg-bg-outer border border-border rounded-xl">
              <AlertTriangle size={13} className="text-accent-warning shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary leading-relaxed">
                치지직 개발자센터에서 앱을 등록하고 발급받은 키를 입력하세요.
                Redirect URI: <code className="text-accent-mint">http://localhost:3001/auth/callback</code>
              </p>
            </div>

            <button
              onClick={() => window.electronAPI.openExternal('https://developers.chzzk.naver.com')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-text-secondary border border-border hover:border-accent-mint/40 hover:text-text-primary rounded-xl transition-colors"
            >
              <ExternalLink size={12} /> 치지직 개발자센터 열기
            </button>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Client ID</label>
              <input
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
                placeholder="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Client Secret</label>
              <input
                type="password"
                className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
                placeholder="새 Client Secret (변경 시 입력)"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            <button
              onClick={handleSaveCredentials}
              disabled={saving}
              className="w-full py-2 text-sm font-medium bg-accent-mint text-bg-outer rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Database size={13} className="text-accent-mint" />
            <span className="text-sm font-semibold text-text-primary">DB 백업/복원</span>
          </div>
          <div className="p-4">
            <p className="text-xs text-text-secondary mb-3">
              후원, 구독, 팔로우 이벤트와 현재 팔로워 목록을 정리하거나 JSON 파일로 백업/복원합니다.
            </p>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void handleImportDb(e.target.files?.[0])}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCleanupDb}
                disabled={!!dbBusy}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-accent-mint border border-accent-mint/30 hover:bg-accent-mint/10 rounded-xl transition-colors disabled:opacity-50"
              >
                <Wrench size={12} /> 팔로우 DB 정리
              </button>
              <button
                onClick={handleExportDb}
                disabled={!!dbBusy}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-text-secondary border border-border hover:border-accent-mint/40 hover:text-text-primary rounded-xl transition-colors disabled:opacity-50"
              >
                <Download size={12} /> DB 내보내기
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={!!dbBusy}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-text-secondary border border-border hover:border-accent-mint/40 hover:text-text-primary rounded-xl transition-colors disabled:opacity-50"
              >
                <Upload size={12} /> DB 가져오기
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={!!dbBusy}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} /> 전체 초기화
              </button>
            </div>
          </div>
        </div>

        </div>
      </div>
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-400" />
              <h2 className="text-base font-semibold text-text-primary">이벤트 데이터 초기화</h2>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              후원, 구독, 팔로우 기록이 모두 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAllEvents}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 text-sm font-medium text-text-secondary bg-bg-input border border-border hover:border-accent-mint/40 rounded-xl transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
