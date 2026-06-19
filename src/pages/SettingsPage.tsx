import { useState, useEffect } from 'react'
import { ExternalLink, LogOut, Trash2, AlertTriangle, Settings, User } from 'lucide-react'
import { authApi, eventsApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

export default function SettingsPage() {
  const { isAuthenticated, channelName, channelImageUrl, followerCount, checkAuth, logout } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)

  const [clientId, setClientId]     = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving]         = useState(false)
  const [version, setVersion]       = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting]     = useState(false)

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

  return (
    <div className="flex flex-col h-screen bg-bg-outer overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Settings size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">환경설정</h1>
        {version && <span className="ml-auto text-xs text-text-muted">v{version}</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl">

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

        {/* 데이터 관리 */}
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">데이터 관리</span>
          </div>
          <div className="p-4">
            <p className="text-xs text-text-secondary mb-3">
              저장된 후원, 구독, 팔로우 이벤트 데이터를 영구적으로 삭제합니다.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 rounded-xl transition-colors"
            >
              <Trash2 size={12} /> 이벤트 데이터 전체 초기화
            </button>
          </div>
        </div>

      </div>

      {/* 삭제 확인 모달 */}
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
