/**
 * [채팅 뱃지 유틸리티]
 *
 * 치지직 채팅 메시지의 뱃지(badges) 배열을 파싱해 <img> 또는 텍스트 스팬으로 렌더링하는 유틸 모듈.
 *
 * ── isSafeImageUrl ────────────────────────────────────────────────────────
 *   뱃지 이미지 URL 이 안전한지 검증한다.
 *   https:// 또는 http:// 로 시작하는 절대 URL 만 허용하고, 상대 경로·data URL 은 거부한다.
 *   XSS 방지: 신뢰되지 않는 출처의 이미지 URL 이 <img src> 에 삽입되는 것을 방지한다.
 *
 * ── findImageUrl (재귀 탐색, 최대 깊이 4) ────────────────────────────────
 *   뱃지 객체의 구조는 Chzzk API 버전마다 다를 수 있다.
 *   image, icon, url, badge 키를 우선 탐색하고, 값이 없으면 중첩 객체를 재귀적으로 탐색한다.
 *   최대 깊이를 4로 제한해 순환 참조나 과도하게 중첩된 객체로 인한 스택 오버플로를 방지한다.
 *
 * ── ChatBadges ────────────────────────────────────────────────────────────
 *   badges 배열(unknown[])을 받아 각 뱃지를 <img> 또는 텍스트 <span> 으로 렌더링하는 컴포넌트.
 *   findImageUrl 로 이미지 URL 을 찾으면 <img> 를, 없으면 TEXT_BADGE_LABELS 에서 레이블을 찾아 <span> 을 렌더링한다.
 *   어느 쪽도 없으면 해당 뱃지는 건너뛴다.
 *
 * ── TEXT_BADGE_LABELS / TEXT_BADGE_COLORS ─────────────────────────────────
 *   이미지가 없는 역할 뱃지(MANAGER, FAN_CLUB, STREAMER 등)에 대한 텍스트·색상 폴백 맵.
 */
type BadgeRecord = Record<string, unknown>

const TEXT_BADGE_LABELS: Record<string, string> = {
  MANAGER: 'M',
  FAN_CLUB: 'F',
  STREAMER: 'BJ',
  BROADCASTER: 'BJ',
  STAFF: 'S',
}

const TEXT_BADGE_COLORS: Record<string, string> = {
  MANAGER: 'bg-red-400/15 text-red-200 border-red-400/30',
  FAN_CLUB: 'bg-blue-400/15 text-blue-200 border-blue-400/30',
  STREAMER: 'bg-yellow-400/15 text-yellow-200 border-yellow-400/30',
  BROADCASTER: 'bg-yellow-400/15 text-yellow-200 border-yellow-400/30',
  STAFF: 'bg-purple-400/15 text-purple-200 border-purple-400/30',
}

function asRecord(value: unknown): BadgeRecord | null {
  return value && typeof value === 'object' ? value as BadgeRecord : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isSafeImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function findImageUrl(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) return ''

  if (typeof value === 'string') {
    const text = value.trim()
    if (isSafeImageUrl(text)) return text
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try {
        return findImageUrl(JSON.parse(text), depth + 1)
      } catch {
        return ''
      }
    }
    return ''
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageUrl(item, depth + 1)
      if (found) return found
    }
    return ''
  }

  const item = asRecord(value)
  if (!item) return ''

  const entries = Object.entries(item)
  const priority = entries.filter(([key]) => /image|icon|url|badge/i.test(key))
  for (const [, nested] of priority) {
    const found = findImageUrl(nested, depth + 1)
    if (found) return found
  }
  for (const [, nested] of entries) {
    const found = findImageUrl(nested, depth + 1)
    if (found) return found
  }

  return ''
}

export function getBadgeImageUrl(badge: unknown): string {
  return findImageUrl(badge)
}

export function getBadgeLabel(badge: unknown): string {
  const item = asRecord(badge)
  if (!item) return '?'

  const type = asString(item.badgeType || item.type || item.code).toUpperCase()
  if (TEXT_BADGE_LABELS[type]) return TEXT_BADGE_LABELS[type]

  const label = asString(item.badgeName || item.name || item.label || item.title)
  return label || (type.charAt(0) || '?')
}

function getBadgeClass(badge: unknown): string {
  const item = asRecord(badge)
  const type = asString(item?.badgeType || item?.type || item?.code).toUpperCase()
  return TEXT_BADGE_COLORS[type] || 'bg-white/10 text-text-secondary border-white/15'
}

export function ChatBadges({ badges }: { badges?: unknown[] }) {
  if (!badges?.length) return null

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {badges.map((badge, index) => {
        const imageUrl = getBadgeImageUrl(badge)
        const label = getBadgeLabel(badge)

        if (imageUrl) {
          return (
            <img
              key={`${imageUrl}-${index}`}
              src={imageUrl}
              alt={label}
              title={label}
              className="h-[18px] w-[18px] object-contain shrink-0"
              loading="lazy"
            />
          )
        }

        return (
          <span
            key={`${label}-${index}`}
            className={`text-[10px] px-1.5 py-0.5 rounded border font-bold leading-none ${getBadgeClass(badge)}`}
            title={label}
          >
            {label}
          </span>
        )
      })}
    </span>
  )
}
