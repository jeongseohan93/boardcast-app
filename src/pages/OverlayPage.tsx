import { useEffect, useState } from 'react'
import { Copy, Monitor, Play, Wifi, Shield, CheckCircle, AlertTriangle } from 'lucide-react'
import { api } from '../api/client'
import { OVERLAYS, DEFAULT_OV_SETTINGS, buildOverlayUrl, AllOvSettings } from './overlayShared'

export default function OverlayPage() {
  const [copied, setCopied]   = useState('')
  const [testing, setTesting] = useState('')
  const [networkIp, setNetworkIp]         = useState<string | null>(null)
  const [port, setPort]                   = useState(3001)
  const [firewallState, setFirewallState] = useState<'idle'|'loading'|'ok'|'fail'>('idle')
  const [selectedThemes, setSelectedThemes] = useState<Record<string, number>>({})
  const [ovSettings, setOvSettings]       = useState<AllOvSettings>(DEFAULT_OV_SETTINGS)

  useEffect(() => {
    api.get('/api/network-info').then((res: { data: { ips: string[]; port: number } }) => {
      const { ips, port: p } = res.data
      if (ips.length) setNetworkIp(ips[0])
      setPort(p)
    }).catch(() => {})
    window.electronAPI.store.get('overlayThemes').then((saved) => {
      if (saved && typeof saved === 'object')
        setSelectedThemes(saved as Record<string, number>)
    }).catch(() => {})
    window.electronAPI.store.get('overlaySettings').then((saved) => {
      if (saved && typeof saved === 'object') {
        const s = saved as Partial<AllOvSettings>
        setOvSettings((prev) => ({
          chat:     { ...prev.chat,     ...(s.chat     || {}) },
          donation: { ...prev.donation, ...(s.donation || {}) },
          follow:   { ...prev.follow,   ...(s.follow   || {}) },
          emote:    { ...prev.emote,    ...(s.emote    || {}) },
          avachat:  { ...prev.avachat,  ...(s.avachat  || {}) },
        }))
      }
    }).catch(() => {})
  }, [])

  const BASE = `http://localhost:${port}`
  const NET  = networkIp ? `http://${networkIp}:${port}` : null

  const mkUrl = (path: string, key: string, net = false) =>
    buildOverlayUrl(net && NET ? NET : BASE, path, key, selectedThemes, ovSettings)

  const copy = (url: string, k: string) => {
    navigator.clipboard.writeText(url); setCopied(k); setTimeout(() => setCopied(''), 2000)
  }

  const sendTest = async (type: string) => {
    setTesting(type)
    try {
      await api.post(
        `/api/overlay/test/${type}`,
        type === 'donation'
          ? {
              imageDataUrl: ovSettings.donation.imageDataUrl || '',
              imageSize: ovSettings.donation.imageSize || 72,
            }
          : undefined,
      )
    } catch {}
    setTimeout(() => setTesting(''), 1500)
  }

  const handleFirewall = async () => {
    setFirewallState('loading')
    try { const r = await window.electronAPI.addFirewallRule(); setFirewallState(r.ok ? 'ok' : 'fail') }
    catch { setFirewallState('fail') }
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Monitor size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">오버레이 URL</h1>
        {NET && <div className="ml-auto flex items-center gap-1.5 text-xs text-accent-mint bg-accent-mint/10 border border-accent-mint/20 rounded-lg px-2.5 py-1"><Wifi size={11} /> 네트워크 감지됨</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* 방화벽 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Shield size={15} className="text-accent-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Windows 방화벽 허용</p>
              <p className="text-xs text-text-secondary mt-1 mb-3">다른 PC(송출컴)에서 오버레이에 접근하려면 3001 포트를 허용해야 합니다.</p>
              {firewallState === 'ok'
                ? <div className="flex items-center gap-2 text-accent-success text-sm"><CheckCircle size={13} /> 방화벽 규칙이 추가되었습니다.</div>
                : firewallState === 'fail'
                ? <div className="space-y-2">
                    <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} /> 자동 추가 실패</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-bg-input border border-border rounded-lg px-3 py-1.5 font-mono text-text-secondary overflow-x-auto">netsh advfirewall firewall add rule name=&quot;방송도우미&quot; dir=in action=allow protocol=TCP localport=3001</code>
                      <button onClick={() => copy('netsh advfirewall firewall add rule name="방송도우미" dir=in action=allow protocol=TCP localport=3001','__fw__')} className="px-2.5 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap">{copied==='__fw__'?'복사됨!':'복사'}</button>
                    </div>
                  </div>
                : <button onClick={handleFirewall} disabled={firewallState === 'loading'} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-input border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-50"><Shield size={12} />{firewallState==='loading'?'추가 중...':'방화벽 자동 허용 (관리자 권한 필요)'}</button>}
            </div>
          </div>
        </div>

        {/* 오버레이 카드 */}
        {OVERLAYS.map((ov) => {
          const lu = mkUrl(ov.path, ov.key)
          const nu = NET ? mkUrl(ov.path, ov.key, true) : null

          return (
            <div key={ov.key} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Monitor size={14} style={{ color: ov.color }} />
                <span className="text-sm font-semibold text-text-primary">{ov.label}</span>
              </div>

              <div className="p-4 space-y-2">
                <div>
                  <p className="text-xs text-text-muted mb-1">같은 PC (localhost)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-accent-mint bg-bg-input border border-border rounded-lg px-3 py-1.5 font-mono truncate">{lu}</code>
                    <button onClick={() => copy(lu, ov.key)} className="px-2.5 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap">{copied===ov.key?'복사됨!':'복사'}</button>
                  </div>
                </div>
                {nu && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">송출컴 (네트워크)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-accent-purple bg-bg-input border border-accent-purple/20 rounded-lg px-3 py-1.5 font-mono truncate">{nu}</code>
                      <button onClick={() => copy(nu, ov.key+'_n')} className="px-2.5 py-1.5 text-xs bg-accent-mint text-bg-outer border border-accent-mint rounded-lg hover:brightness-110 transition-colors whitespace-nowrap font-medium">{copied===ov.key+'_n'?'복사됨!':'OBS용 복사'}</button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1 flex-wrap">
                  {!NET && <button onClick={() => copy(lu, ov.key+'_m')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 transition-colors font-medium"><Copy size={11} />{copied===ov.key+'_m'?'복사됨!':'URL 복사'}</button>}
                  <button onClick={() => sendTest(ov.testType)} disabled={testing===ov.testType} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors disabled:opacity-50"><Play size={11} />{testing===ov.testType?'전송 중...':'테스트'}</button>
                </div>
              </div>
            </div>
          )
        })}

        {/* OBS 안내 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-text-primary mb-3">OBS 브라우저 소스 설정</p>
          <ol className="space-y-2">
            {['OBS Studio → 소스 → + → 브라우저 소스 추가', NET?'"OBS용 복사"로 네트워크 URL 붙여넣기':'"URL 복사"로 복사한 URL 붙여넣기', '너비: 1920, 높이: 1080 설정', '확인 후 "새로 고침" — 테마/설정 변경 후에도 필요'].map((s,i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-accent-mint font-semibold shrink-0 text-xs mt-0.5">{i+1}.</span>
                <span className="text-xs text-text-secondary leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 p-3 bg-accent-warning/10 border border-accent-warning/30 rounded-xl">
            <p className="text-xs text-accent-warning flex items-center gap-1.5"><AlertTriangle size={12} /> 테마/설정 변경 후 OBS 브라우저 소스를 새로 고침해야 적용됩니다.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
