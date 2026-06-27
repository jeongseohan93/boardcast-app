import { useState } from 'react'
import TabBar from '../components/TabBar'
import StatisticsPage from './StatisticsPage'
import RestrictionPage from './RestrictionPage'

const TABS = [
  { id: 'stats',       label: '통계' },
  { id: 'restriction', label: '활동 제한' },
]

export default function ChannelPage() {
  const [tab, setTab] = useState(() => localStorage.getItem('tab_channel') || 'stats')

  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem('tab_channel', id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TabBar tabs={TABS} active={tab} onChange={handleChange} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'stats'       && <StatisticsPage />}
        {tab === 'restriction' && <RestrictionPage />}
      </div>
    </div>
  )
}
