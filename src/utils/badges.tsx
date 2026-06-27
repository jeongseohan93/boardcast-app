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
