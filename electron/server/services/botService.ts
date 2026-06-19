import Store from 'electron-store'

const store = new Store()

export interface BotCommand {
  id: string
  trigger: string
  response: string
  cooldown: number
  permission: 'everyone' | 'subscriber' | 'moderator' | 'streamer'
  enabled: boolean
}

const cooldownMap = new Map<string, number>()

export function getCommands(): BotCommand[] {
  return (store.get('botCommands') as BotCommand[]) || []
}

export function saveCommands(commands: BotCommand[]) {
  store.set('botCommands', commands)
}

// CHZZK userRoleCode 값 (공식 문서 기준)
// COMMON_USER / STREAMER / MANAGER / SUBSCRIBER / undefined = 일반 시청자
function hasPermission(userRoleCode: string | undefined, permission: BotCommand['permission']): boolean {
  if (permission === 'everyone') return true

  const role = (userRoleCode || '').toUpperCase()
  if (permission === 'streamer') return role === 'STREAMER'
  if (permission === 'moderator') return role === 'STREAMER' || role === 'MANAGER'
  if (permission === 'subscriber') return role === 'STREAMER' || role === 'MANAGER' || role === 'SUBSCRIBER'
  return false
}

export function findMatchingCommand(message: string, userRoleCode?: string): BotCommand | null {
  const commands = getCommands()
  const text = message.trim()

  for (const cmd of commands) {
    if (!cmd.enabled) continue
    if (!(text === cmd.trigger || text.startsWith(cmd.trigger + ' '))) continue
    if (!hasPermission(userRoleCode, cmd.permission)) continue

    const now = Date.now()
    const lastUsed = cooldownMap.get(cmd.id) || 0
    if (now - lastUsed < cmd.cooldown * 1000) continue

    cooldownMap.set(cmd.id, now)
    return cmd
  }
  return null
}
