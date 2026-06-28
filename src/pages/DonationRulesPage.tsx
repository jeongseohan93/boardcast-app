/**
 * [금액별 후원 알림 규칙 페이지]
 *
 * 후원 금액 구간마다 다른 이미지·사운드를 설정하는 관리 화면.
 *
 * ── 규칙 매칭 우선순위 ──────────────────────────────────────────────────────
 *   규칙은 minAmount 내림차순으로 정렬되어 적용된다.
 *   예) 5000·1000·0 규칙이 있을 때 3000치즈 후원 → 1000 규칙 적용.
 *   minAmount=0 은 "그 외 모든 금액"의 기본 규칙 역할을 한다.
 *
 * ── 미디어 저장 방식 ──────────────────────────────────────────────────────
 *   이미지(PNG/GIF 8MB), 사운드(MP3/WAV/OGG 5MB) 모두 base64 data URL로 저장.
 *   서버 파일시스템 업로드 없이 electron-store에 직접 보관한다.
 *
 * ── 저장 방식 ──────────────────────────────────────────────────────────────
 *   규칙 변경은 즉시 로컬 상태에 반영되고, 상단 "저장" 버튼을 눌러야 서버에 반영된다.
 *   base64 데이터가 클 수 있어 자동 저장 대신 명시적 저장 방식을 택한다.
 *
 * ── 파일 입력 공유 ─────────────────────────────────────────────────────────
 *   hidden <input type="file"> 하나씩(이미지용·사운드용)을 두고,
 *   어느 규칙 카드의 업로드 버튼을 눌렀는지 targetRuleIdRef로 기억한다.
 */
import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Upload, Volume2, Music, Info } from 'lucide-react'
import { donationAlertApi, DonationAlertRule } from '../api/donationAlert'

function makeRule(): DonationAlertRule {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    minAmount: 0,
    label: '',
    imageDataUrl: '',
    imageName: '',
    imageSize: 118,
    soundDataUrl: '',
    soundName: '',
    soundVolume: 1,
  }
}

export default function DonationRulesPage() {
  const [rules, setRules]   = useState<DonationAlertRule[]>([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)

  const imageInputRef    = useRef<HTMLInputElement>(null)
  const soundInputRef    = useRef<HTMLInputElement>(null)
  const targetIdRef      = useRef('')

  useEffect(() => {
    donationAlertApi.getRules()
      .then((res) => setRules(res.data))
      .catch(() => {})
  }, [])

  const mutate = (updater: (prev: DonationAlertRule[]) => DonationAlertRule[]) => {
    setRules(updater)
    setDirty(true)
  }

  const updateRule = (id: string, patch: Partial<DonationAlertRule>) =>
    mutate((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const addRule = () => mutate((prev) => [...prev, makeRule()])

  const removeRule = (id: string) => mutate((prev) => prev.filter((r) => r.id !== id))

  const save = async () => {
    setSaving(true)
    try {
      await donationAlertApi.saveRules(rules)
      setDirty(false)
    } catch {
      window.alert('저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const readDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const handleImageFile = async (file?: File) => {
    if (!file) return
    const id = targetIdRef.current
    if (!['image/png', 'image/gif'].includes(file.type)) {
      window.alert('PNG 또는 GIF 이미지만 사용할 수 있어요.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      window.alert('이미지는 8MB 이하로 선택해 주세요.')
      return
    }
    try {
      const imageDataUrl = await readDataUrl(file)
      updateRule(id, { imageDataUrl, imageName: file.name })
    } catch {
      window.alert('이미지를 불러오지 못했어요.')
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleSoundFile = async (file?: File) => {
    if (!file) return
    const id = targetIdRef.current
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-wav', 'audio/wave']
    if (!allowed.includes(file.type) && !/\.(mp3|wav|ogg)$/i.test(file.name)) {
      window.alert('MP3, WAV, OGG 파일만 사용할 수 있어요.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('사운드 파일은 5MB 이하로 선택해 주세요.')
      return
    }
    try {
      const soundDataUrl = await readDataUrl(file)
      updateRule(id, { soundDataUrl, soundName: file.name })
    } catch {
      window.alert('사운드 파일을 불러오지 못했어요.')
    } finally {
      if (soundInputRef.current) soundInputRef.current.value = ''
    }
  }

  // 미리보기용 — 낮은 금액부터 순서대로 표시하되, 높은 우선순위가 위에 오도록 내림차순
  const sortedRules = [...rules].sort((a, b) => b.minAmount - a.minAmount)

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border shrink-0">
        <Music size={16} className="text-accent-mint" />
        <h1 className="text-sm font-bold text-text-primary">금액별 알림 규칙</h1>
        <span className="text-xs text-text-muted">후원 금액에 따라 다른 이미지·사운드를 재생합니다</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-accent-mint/30 text-accent-mint hover:bg-accent-mint/10 transition-colors"
          >
            <Plus size={12} />
            규칙 추가
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-accent-mint text-bg-outer hover:bg-accent-mint/90 transition-colors disabled:opacity-40"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">

        {/* 빈 상태 */}
        {rules.length === 0 && (
          <div className="flex flex-col items-center justify-center h-52 text-text-muted gap-3">
            <Music size={36} className="opacity-15" />
            <p className="text-sm">등록된 규칙이 없습니다.</p>
            <button
              onClick={addRule}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-accent-mint/30 text-accent-mint hover:bg-accent-mint/10 transition-colors"
            >
              <Plus size={12} />
              첫 번째 규칙 추가
            </button>
          </div>
        )}

        {/* 안내 배너 */}
        {rules.length > 0 && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-accent-mint/5 border border-accent-mint/15 text-xs text-text-secondary leading-relaxed">
            <Info size={12} className="text-accent-mint shrink-0 mt-0.5" />
            <span>
              금액이 큰 규칙부터 순서대로 적용됩니다.
              예) <b>5000·1000·0</b> 규칙이 있을 때 3000치즈 후원 → <b>1000 규칙 적용</b>.
              <b> 최소 금액 0</b>은 나머지 모든 금액에 적용되는 기본 규칙입니다.
            </span>
          </div>
        )}

        {sortedRules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onUpdate={(patch) => updateRule(rule.id, patch)}
            onDelete={() => removeRule(rule.id)}
            onImageClick={() => {
              targetIdRef.current = rule.id
              imageInputRef.current?.click()
            }}
            onSoundClick={() => {
              targetIdRef.current = rule.id
              soundInputRef.current?.click()
            }}
          />
        ))}
      </div>

      {/* 숨김 파일 입력 */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/gif"
        className="hidden"
        onChange={(e) => handleImageFile(e.target.files?.[0])}
      />
      <input
        ref={soundInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
        className="hidden"
        onChange={(e) => handleSoundFile(e.target.files?.[0])}
      />
    </div>
  )
}

/* ── 개별 규칙 카드 ────────────────────────────────────────────────────── */

function RuleCard({
  rule,
  onUpdate,
  onDelete,
  onImageClick,
  onSoundClick,
}: {
  rule: DonationAlertRule
  onUpdate: (patch: Partial<DonationAlertRule>) => void
  onDelete: () => void
  onImageClick: () => void
  onSoundClick: () => void
}) {
  const previewSound = () => {
    if (!rule.soundDataUrl) return
    try {
      const audio = new Audio(rule.soundDataUrl)
      audio.volume = Math.max(0, Math.min(1, rule.soundVolume))
      audio.play().catch(() => {})
    } catch {}
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 space-y-4">

      {/* 금액 + 레이블 + 삭제 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-muted">최소</span>
          <input
            type="number"
            min={0}
            step={100}
            value={rule.minAmount}
            onChange={(e) => onUpdate({ minAmount: Math.max(0, Number(e.target.value)) })}
            className="w-28 px-2.5 py-1.5 rounded-lg border border-border bg-bg-input text-xs text-text-primary text-right focus:outline-none focus:border-accent-mint/50 tabular-nums"
          />
          <span className="text-xs text-text-muted shrink-0">치즈 이상</span>
        </div>
        <input
          type="text"
          placeholder="레이블 (예: 소액, 고액, VIP)"
          value={rule.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-bg-input text-xs text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent-mint/50"
        />
        <button
          onClick={onDelete}
          className="shrink-0 p-1.5 rounded-lg border border-red-400/20 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-400/40 transition-colors"
          title="이 규칙 삭제"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* 이미지 + 사운드 */}
      <div className="grid grid-cols-2 gap-3">

        {/* 이미지 */}
        <div className="rounded-xl border border-border bg-bg-input/40 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1.5">
              <Upload size={11} className="text-accent-mint" />
              이미지
            </span>
            <span className="text-[10px] text-text-muted">PNG/GIF · 8MB</span>
          </div>

          {rule.imageDataUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-14 h-14 rounded-lg border border-border bg-black/30 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={rule.imageDataUrl} alt="" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[10px] text-text-secondary truncate">{rule.imageName}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={onImageClick}
                      className="text-[10px] px-2 py-1 rounded-md border border-border text-text-muted hover:text-text-secondary hover:border-white/20 transition-colors"
                    >
                      변경
                    </button>
                    <button
                      onClick={() => onUpdate({ imageDataUrl: '', imageName: '' })}
                      className="text-[10px] px-2 py-1 rounded-md border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>

              {/* 이미지 크기 슬라이더 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">크기</span>
                  <span className="text-[10px] font-bold text-text-primary tabular-nums">{rule.imageSize}px</span>
                </div>
                <input
                  type="range" min={40} max={240} value={rule.imageSize}
                  onChange={(e) => onUpdate({ imageSize: Number(e.target.value) })}
                  className="w-full h-0.5 appearance-none rounded-full cursor-pointer"
                  style={{ accentColor: '#00FFA3' }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={onImageClick}
              className="w-full flex items-center justify-center gap-1.5 py-4 rounded-lg border border-dashed border-border text-xs text-text-muted hover:text-accent-mint hover:border-accent-mint/40 transition-colors"
            >
              <Upload size={13} />
              이미지 선택
            </button>
          )}
        </div>

        {/* 사운드 */}
        <div className="rounded-xl border border-border bg-bg-input/40 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1.5">
              <Volume2 size={11} className="text-accent-mint" />
              사운드
            </span>
            <span className="text-[10px] text-text-muted">MP3/WAV/OGG · 5MB</span>
          </div>

          {rule.soundDataUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-secondary truncate">{rule.soundName}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={previewSound}
                  className="text-[10px] px-2 py-1 rounded-md border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 transition-colors"
                  title="미리 듣기"
                >
                  ▶ 미리듣기
                </button>
                <button
                  onClick={onSoundClick}
                  className="text-[10px] px-2 py-1 rounded-md border border-border text-text-muted hover:text-text-secondary hover:border-white/20 transition-colors"
                >
                  변경
                </button>
                <button
                  onClick={() => onUpdate({ soundDataUrl: '', soundName: '' })}
                  className="text-[10px] px-2 py-1 rounded-md border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors"
                >
                  삭제
                </button>
              </div>

              {/* 볼륨 슬라이더 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">볼륨</span>
                  <span className="text-[10px] font-bold text-text-primary tabular-nums">
                    {Math.round(rule.soundVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05} value={rule.soundVolume}
                  onChange={(e) => onUpdate({ soundVolume: Number(e.target.value) })}
                  className="w-full h-0.5 appearance-none rounded-full cursor-pointer"
                  style={{ accentColor: '#00FFA3' }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={onSoundClick}
              className="w-full flex items-center justify-center gap-1.5 py-4 rounded-lg border border-dashed border-border text-xs text-text-muted hover:text-accent-mint hover:border-accent-mint/40 transition-colors"
            >
              <Volume2 size={13} />
              사운드 선택
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
