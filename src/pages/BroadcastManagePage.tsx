import { useState } from 'react'
import TabBar from '../components/TabBar'
import NoticePage from './NoticePage'
import MissionPage from './MissionPage'
import VotePage from './VotePage'
import VideoDonationPage from './VideoDonationPage'

const TABS = [
  { id: 'notice', label: '공지' },
  { id: 'mission', label: '미션' },
  { id: 'vote', label: '투표' },
  { id: 'video', label: '영도 관리' },
]

export default function BroadcastManagePage() {
  const [tab, setTab] = useState(() => localStorage.getItem('tab_broadcast') || 'notice')

  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem('tab_broadcast', id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TabBar tabs={TABS} active={tab} onChange={handleChange} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'notice'  && <NoticePage />}
        {tab === 'mission' && <MissionPage />}
        {tab === 'vote'    && <VotePage />}
        {tab === 'video'   && <VideoDonationPage />}
      </div>
    </div>
  )
}
