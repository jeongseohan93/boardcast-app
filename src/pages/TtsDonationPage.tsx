/**
 * [후원 TTS 설정 페이지]
 *
 * 후원 메시지를 OBS 브라우저 소스의 Web Speech API로 읽어주는 기능을 설정한다.
 *
 * ── 동작 원리 ─────────────────────────────────────────────────────────────
 *   - donation.html 오버레이가 donation 이벤트를 받으면 SpeechSynthesisUtterance를 생성
 *   - 복수 후원이 겹치면 큐에 쌓아 순서대로 재생 (overlap 없음)
 *   - OBS 브라우저 소스는 autoplay 정책이 없어 사용자 제스처 없이도 즉시 재생 가능
 *
 * ── 주의사항 ──────────────────────────────────────────────────────────────
 *   OBS 브라우저 소스 → 속성 → "브라우저 소스 오디오 제어" 옵션을 켜야
 *   TTS 음성이 스트림에 캡처된다.
 *   사용 가능한 목소리는 OBS가 탑재한 Chromium 기준이며 시스템 목소리와 다를 수 있다.
 *
 * ── template 플레이스홀더 ─────────────────────────────────────────────────
 *   {nickname} → 후원자 닉네임
 *   {amount}   → 후원 금액 (천 단위 쉼표, 예: 1,000)
 *   {message}  → 후원 메시지 (없으면 빈 문자열 → 공백 자동 제거)
 */
import { useState, useEffect } from 'react'
import { Mic, Info, Save, Play } from 'lucide-react'
import { ttsDonationApi, TtsDonationSettings } from '../api/ttsDonation'

const DEFAULTS: TtsDonationSettings = {
  enabled: false,
  minAmount: 0,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  template: '{nickname}님 {amount}치즈 후원! {message}',
  skipNoMessage: false,
}

function Slider({ label, min, max, step = 0.05, value, display, onChange }: {
  label: string; min: number; max: number; step?: number
  value: number; display: string; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-bold text-text-primary bg-bg-input border border-border rounded-md px-2 py-0.5 min-w-[52px] text-center tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-0.5 appearance-none rounded-full cursor-pointer"
        style={{ accentColor: '#00FFA3' }}
      />
    </div>
  )
}

export default function TtsDonationPage() {
  const [settings, setSettings] = useState<TtsDonationSettings>(DEFAULTS)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    ttsDonationApi.getSettings()
      .then((res) => setSettings({ ...DEFAULTS, ...res.data }))
      .catch(() => {})
  }, [])

  const update = (patch: Partial<TtsDonationSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }))

  const save = async () => {
    setSaving(true)
    try {
      await ttsDonationApi.saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      window.alert('저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  // 현재 설정으로 브라우저에서 미리듣기 (Electron 렌더러 프로세스에서 직접 재생)
  const preview = () => {
    if (!('speechSynthesis' in window)) {
      alert('이 환경에서는 TTS를 미리들을 수 없습니다.\nOBS 브라우저 소스에서 실제 재생을 확인해 주세요.')
      return
    }
    speechSynthesis.cancel()
    const text = (settings.template || '')
      .replace(/\{nickname\}/g, '테스트유저')
      .replace(/\{amount\}/g, '1,000')
      .replace(/\{message\}/g, '안녕하세요!')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!text) return
    const utter    = new SpeechSynthesisUtterance(text)
    utter.lang     = 'ko-KR'
    utter.rate     = settings.rate
    utter.pitch    = settings.pitch
    utter.volume   = settings.volume
    speechSynthesis.speak(utter)
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
        <Mic size={16} className="text-accent-mint" />
        <h1 className="text-sm font-bold text-text-primary">후원 TTS</h1>
        <span className="text-xs text-text-muted">후원 메시지를 OBS에서 자동으로 읽어줍니다</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={preview}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 transition-colors"
          >
            <Play size={11} />
            미리듣기
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-accent-mint text-bg-outer hover:bg-accent-mint/90 transition-colors disabled:opacity-50"
          >
            <Save size={11} />
            {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* OBS 안내 배너 */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent-mint/5 border border-accent-mint/15 text-xs text-text-secondary leading-relaxed">
          <Info size={12} className="text-accent-mint shrink-0 mt-0.5" />
          <span>
            OBS 브라우저 소스 → <b>속성</b> → <b>"OBS를 통한 오디오 제어"</b>를 켜야 TTS가 스트림에 잡힙니다.
            목소리는 OBS 내장 Chromium 기준이며, 아래 미리듣기는 앱 내 브라우저로 재생됩니다.
          </span>
        </div>

        {/* 활성화 토글 */}
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-border bg-bg-card">
          <div>
            <p className="text-sm font-semibold text-text-primary">TTS 활성화</p>
            <p className="text-xs text-text-muted mt-0.5">후원 메시지를 자동으로 읽어줍니다</p>
          </div>
          <button
            type="button"
            onClick={() => update({ enabled: !settings.enabled })}
            className={`relative w-12 h-6 rounded-full border transition-colors shrink-0 ${
              settings.enabled ? 'bg-accent-mint border-accent-mint' : 'bg-bg-outer border-border'
            }`}
          >
            <span className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              settings.enabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* 최소 금액 + 메시지 없으면 건너뜀 */}
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary">읽기 조건</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted shrink-0">최소 금액</span>
            <input
              type="number" min={0} step={100} value={settings.minAmount}
              onChange={(e) => update({ minAmount: Math.max(0, Number(e.target.value)) })}
              className="w-32 px-2.5 py-1.5 rounded-lg border border-border bg-bg-input text-xs text-text-primary text-right focus:outline-none focus:border-accent-mint/50 tabular-nums"
            />
            <span className="text-xs text-text-muted shrink-0">치즈 이상 후원만 읽기 (0 = 모두)</span>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.skipNoMessage}
              onChange={(e) => update({ skipNoMessage: e.target.checked })}
              className="w-4 h-4 rounded accent-[#00FFA3]"
            />
            <span className="text-xs text-text-secondary">메시지가 없는 후원은 건너뛰기</span>
          </label>
        </div>

        {/* 읽기 템플릿 */}
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-text-secondary">읽기 템플릿</p>
            <span className="text-[10px] text-text-muted">
              플레이스홀더: {'{nickname}'} {'{amount}'} {'{message}'}
            </span>
          </div>
          <input
            type="text"
            value={settings.template}
            onChange={(e) => update({ template: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-input text-xs text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent-mint/50"
            placeholder="{nickname}님 {amount}치즈 후원! {message}"
          />
          <p className="text-[10px] text-text-muted">
            예시: 테스트유저님 1,000치즈 후원! 안녕하세요!
          </p>
        </div>

        {/* 음성 설정 슬라이더 */}
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-4">
          <p className="text-xs font-semibold text-text-secondary">음성 설정</p>
          <Slider
            label="읽기 속도 (Rate)"
            min={0.5} max={2.0} step={0.05}
            value={settings.rate}
            display={`×${settings.rate.toFixed(2)}`}
            onChange={(v) => update({ rate: v })}
          />
          <Slider
            label="음조 (Pitch)"
            min={0.5} max={2.0} step={0.05}
            value={settings.pitch}
            display={`×${settings.pitch.toFixed(2)}`}
            onChange={(v) => update({ pitch: v })}
          />
          <Slider
            label="볼륨 (Volume)"
            min={0.0} max={1.0} step={0.05}
            value={settings.volume}
            display={`${Math.round(settings.volume * 100)}%`}
            onChange={(v) => update({ volume: v })}
          />
        </div>

      </div>
    </div>
  )
}
