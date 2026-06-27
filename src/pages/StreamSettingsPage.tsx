import { useState } from 'react'
import TabBar from '../components/TabBar'
import BotPage from './BotPage'
import AlertHistoryPage from './AlertHistoryPage'
import FollowerListPage from './FollowerListPage'
import EmotePartyPage from './EmotePartyPage'
import RoulettePage from './RoulettePage'
import TamagotchiPage from './TamagotchiPage'

const TABS = [
  { id: 'bot',        label: '채팅 봇' },
  { id: 'alerts',     label: '후원/알림' },
  { id: 'followers',  label: '팔로워' },
  { id: 'emote',      label: '이모티콘 파티' },
  { id: 'roulette',   label: '룰렛' },
  { id: 'tamagotchi', label: '다마고치' },
]

export default function StreamSettingsPage() {
  const [tab, setTab] = useState(() => localStorage.getItem('tab_stream') || 'bot')

  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem('tab_stream', id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TabBar tabs={TABS} active={tab} onChange={handleChange} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'bot'        && <BotPage />}
        {tab === 'alerts'     && <AlertHistoryPage />}
        {tab === 'followers'  && <FollowerListPage />}
        {tab === 'emote'      && <EmotePartyPage />}
        {tab === 'roulette'   && <RoulettePage />}
        {tab === 'tamagotchi' && <TamagotchiPage />}
      </div>
    </div>
  )
}
