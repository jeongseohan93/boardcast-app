/**
 * [미션 페이지]
 *
 * 실시간 후원 미션 목록을 표시하고, 오버레이 URL을 관리하는 페이지.
 *
 * ── useCountdown (로컬 커스텀 훅) ─────────────────────────────────────────
 *   missionEndTime(ISO 문자열)까지 남은 초를 1초 단위로 카운트다운한다.
 *   setInterval 기반이며, 컴포넌트 언마운트 또는 missionEndTime 변경 시 클리어된다.
 *   missionEndTime 이 없으면 remaining = -1 을 반환해 UI 가 타이머를 숨긴다.
 *
 * ── MissionCard (인라인 서브컴포넌트) ────────────────────────────────────
 *   개별 미션 하나를 카드 형태로 렌더링한다.
 *   status 에 따라 테두리 색상·아이콘·배지가 달라지며 getMissionStatusKind 로 판별한다.
 *
 * ── formatSeconds ─────────────────────────────────────────────────────────
 *   초 단위 정수를 "mm:ss" 또는 "hh:mm:ss" 형식의 문자열로 변환하는 순수 함수.
 *
 * ── 초기 로드 (missionApi.list) ───────────────────────────────────────────
 *   페이지 마운트 시 REST API 로 최대 200건의 미션 목록을 가져와 missionStore.setAll 로 저장한다.
 *   이후 실시간 갱신은 useSocket 의 'mission' 이벤트 → missionStore.addOrUpdate 가 담당한다.
 *
 * ── overlayUrl ────────────────────────────────────────────────────────────
 *   미션 오버레이는 localhost:3001 에 고정된 별도 경로에 서빙된다.
 *   OBS 에서 직접 입력하는 Browser Source URL 을 복사 버튼으로 제공한다.
 */
import { useEffect, useState } from 'react'
import { Target, CheckCircle2, XCircle, Clock, Coins, User, Trash2, Copy, Check } from 'lucide-react'
import { useMissionStore, Mission } from '../store/missionStore'
import { missionApi } from '../api/client'
import { getMissionStatusKind, getMissionStatusLabel, isMissionOpen } from '../utils/missionStatus'

function useCountdown(missionEndTime?: string) {
  const [remaining, setRemaining] = useState<number>(-1)

  useEffect(() => {
    if (!missionEndTime) {
      setRemaining(-1)
      return
    }

    const end = new Date(missionEndTime.replace(' ', 'T')).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setRemaining(diff)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [missionEndTime])

  return remaining
}

function formatSeconds(sec: number) {
  if (sec <= 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function MissionCard({ mission }: { mission: Mission }) {
  const kind = getMissionStatusKind(mission.status, mission.success)
  const statusLabel = getMissionStatusLabel(mission.status, mission.success)
  const remaining = useCountdown(isMissionOpen(mission.status, mission.success) ? mission.missionEndTime : undefined)
  const total = mission.durationTime ?? 0
  const progress = total > 0 && remaining >= 0
    ? Math.min(100, Math.max(0, Math.round(((total - remaining) / total) * 100)))
    : kind === 'success'
      ? 100
      : 0

  const isWaiting = kind === 'waiting'
  const isActive = kind === 'active'
  const isSuccess = kind === 'success'
  const isFailed = kind === 'failed'

  const markSuccess = () => missionApi.update({ ...mission, status: 'SUCCESS', success: true })
  const markFailed = () => missionApi.update({ ...mission, status: 'FAIL', success: false })

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors
        ${isWaiting
          ? 'bg-bg-card border-yellow-500/35'
          : isActive
            ? 'bg-bg-card border-accent-mint/40'
            : isSuccess
              ? 'bg-bg-card border-green-500/30 opacity-80'
              : 'bg-bg-card border-red-500/30 opacity-70'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isSuccess ? (
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          ) : isFailed ? (
            <XCircle size={16} className="text-red-400 shrink-0" />
          ) : (
            <Target size={16} className={`${isWaiting ? 'text-yellow-400' : 'text-accent-mint'} shrink-0`} />
          )}
          <span className="text-sm font-bold text-text-primary leading-snug line-clamp-2">
            {mission.missionText}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0
            ${isWaiting ? 'bg-yellow-500/15 text-yellow-300'
            : isActive ? 'bg-accent-mint/15 text-accent-mint'
            : isSuccess ? 'bg-green-500/15 text-green-400'
            : 'bg-red-500/15 text-red-400'}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1 min-w-0">
          <User size={12} />
          <span className="truncate">{mission.donatorNickname}</span>
        </span>
        <span className="flex items-center gap-1">
          <Coins size={12} />
          {mission.payAmount.toLocaleString()} 치즈
        </span>
      </div>

      {isMissionOpen(mission.status, mission.success) && (
        <div className="flex flex-col gap-2">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isWaiting ? 'bg-yellow-400' : 'bg-accent-mint'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {remaining > 0 ? `${formatSeconds(remaining)} 남음` : remaining === 0 ? '시간 초과' : '시간 정보 없음'}
            </span>
            {mission.missionEndTime && (
              <span>{mission.missionEndTime.slice(11, 16)} 종료</span>
            )}
          </div>
          {isActive && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={markSuccess}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-semibold transition-colors"
              >
                <CheckCircle2 size={13} /> 성공
              </button>
              <button
                onClick={markFailed}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
              >
                <XCircle size={13} /> 실패
              </button>
            </div>
          )}
          {isWaiting && (
            <div className="text-[11px] text-yellow-300/80">
              치지직에서 미션 수락 대기 중입니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MissionPage() {
  const { missions, clear, setAll } = useMissionStore()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    missionApi.list({ limit: 200 }).then((res) => {
      const rows = res.data as Array<{
        missionDonationId: string
        missionText: string
        status: Mission['status']
        success: boolean
        payAmount: number
        donatorNickname: string
        donatorChannelId: string
        durationTime?: number
        missionCreatedTime?: string
        missionEndTime?: string
        createdAt: string
      }>
      setAll(rows.map((row) => ({ ...row, receivedAt: row.createdAt })))
    }).catch(() => {})
  }, [setAll])

  const open = missions.filter((mission) => isMissionOpen(mission.status, mission.success))
  const finished = missions.filter((mission) => !isMissionOpen(mission.status, mission.success))
  const overlayUrl = 'http://localhost:3001/overlay/mission'

  const copyUrl = () => {
    navigator.clipboard.writeText(overlayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-accent-mint" />
          <h1 className="text-base font-bold text-text-primary">미션</h1>
          {open.length > 0 && (
            <span className="bg-accent-mint text-bg-outer text-xs font-bold px-2 py-0.5 rounded-full">
              {open.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-text-primary text-xs transition-colors"
          >
            {copied ? <Check size={13} className="text-accent-mint" /> : <Copy size={13} />}
            오버레이 URL 복사
          </button>
          {missions.length > 0 && (
            <button
              onClick={clear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-red-400 text-xs transition-colors"
            >
              <Trash2 size={13} />
              화면 목록 비우기
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6 min-h-0">
        {missions.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-text-muted">
            <Target size={40} className="opacity-20" />
            <p className="text-sm">아직 수신된 미션이 없습니다</p>
            <p className="text-xs opacity-60">방송 중 미션 후원이 들어오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-mint animate-pulse" />
                  대기/진행 중 ({open.length})
                </h2>
                {open.map((mission) => (
                  <MissionCard key={mission.missionDonationId} mission={mission} />
                ))}
              </section>
            )}

            {finished.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  완료 ({finished.length})
                </h2>
                {finished.map((mission) => (
                  <MissionCard key={mission.missionDonationId} mission={mission} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
