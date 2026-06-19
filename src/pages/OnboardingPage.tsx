import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, CheckCircle } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

const STEPS = [
  { num: 1, text: '치지직 개발자센터에서 앱을 등록합니다.' },
  { num: 2, text: 'Redirect URI에 http://localhost:3001/auth/callback 을 입력합니다.' },
  { num: 3, text: '발급된 Client ID와 Client Secret을 아래에 입력합니다.' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { checkAuth, hasCredentials } = useAuthStore()

  const [clientId, setClientId]         = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving]             = useState(false)
  const [logging, setLogging]           = useState(false)
  const [error, setError]               = useState('')

  const handleSaveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Client ID와 Client Secret을 모두 입력해 주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await authApi.saveCredentials(clientId.trim(), clientSecret.trim())
      await checkAuth()
    } catch { setError('저장 중 오류가 발생했습니다.') }
    finally { setSaving(false) }
  }

  const handleLogin = async () => {
    setLogging(true)
    setError('')
    try {
      const state = Math.random().toString(36).slice(2)
      const redirectUri = 'http://localhost:3001/auth/callback'
      const creds = await authApi.getCredentials()
      const cid = creds.data.clientId

      const oauthUrl = `https://chzzk.naver.com/account-interlock?clientId=${cid}&redirectUri=${encodeURIComponent(redirectUri)}&state=${state}`

      window.electronAPI.onOAuthCode(async (code, receivedState) => {
        window.electronAPI.removeOAuthListener()
        try {
          await authApi.token(code, receivedState)
          await checkAuth()
          navigate('/dashboard')
        } catch {
          setError('로그인 처리 중 오류가 발생했습니다.')
          setLogging(false)
        }
      })

      await window.electronAPI.openOAuthWindow(oauthUrl)
    } catch {
      setError('로그인을 시작할 수 없습니다.')
      setLogging(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-outer p-6">
      <div className="w-full max-w-md space-y-4">

        {/* 브랜드 헤더 */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent-mint flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent-mint/20">
            <span className="text-bg-outer font-black text-2xl">치</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">방송 도우미</h1>
          <p className="text-sm text-text-secondary">치지직 방송을 더 편리하게</p>
        </div>

        {/* 단계 가이드 */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-text-primary mb-4">시작하기</p>
          <div className="space-y-3 mb-4">
            {STEPS.map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-accent-mint/20 text-accent-mint text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {step.num}
                </span>
                <p className="text-sm text-text-secondary leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.electronAPI.openExternal('https://developers.chzzk.naver.com')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-text-secondary border border-border hover:border-accent-mint/40 hover:text-text-primary rounded-xl transition-colors"
          >
            <ExternalLink size={13} /> 치지직 개발자센터 열기
          </button>
        </div>

        {/* API 키 입력 */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-text-primary">API 키 입력</p>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Client ID</label>
            <input
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
              placeholder="치지직에서 발급받은 Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Client Secret</label>
            <input
              type="password"
              className="w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20 transition-colors"
              placeholder="치지직에서 발급받은 Client Secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {hasCredentials ? (
            <div className="flex items-center gap-2 p-3 bg-accent-success/10 border border-accent-success/30 rounded-xl">
              <CheckCircle size={15} className="text-accent-success shrink-0" />
              <span className="text-sm text-accent-success">API 키가 저장되었습니다.</span>
            </div>
          ) : (
            <button
              onClick={handleSaveCredentials}
              disabled={saving}
              className="w-full py-2 text-sm font-medium text-text-secondary bg-bg-input border border-border hover:border-accent-mint/40 rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>

        {/* 로그인 버튼 */}
        <button
          onClick={hasCredentials ? handleLogin : handleSaveCredentials}
          disabled={logging}
          className="w-full py-3 text-base font-semibold bg-accent-mint text-bg-outer rounded-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent-mint/20"
        >
          {logging ? '로그인 중...' : hasCredentials ? '치지직 계정으로 로그인' : '저장 후 로그인'}
        </button>

        {hasCredentials && (
          <p className="text-center text-xs text-text-muted">
            이미 API 키가 저장되어 있습니다.{' '}
            <button className="text-accent-mint hover:underline" onClick={() => navigate('/settings')}>
              환경설정
            </button>
            에서 변경할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  )
}
