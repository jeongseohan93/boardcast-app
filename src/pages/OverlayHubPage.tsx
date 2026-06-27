import { useState } from 'react'
import TabBar from '../components/TabBar'
import OverlayPage from './OverlayPage'
import OverlaySettingsPage from './OverlaySettingsPage'

const TABS = [
  { id: 'urls',     label: 'URL 목록' },
  { id: 'settings', label: '오버레이 설정' },
]

export default function OverlayHubPage() {
  const [tab, setTab] = useState(() => localStorage.getItem('tab_overlay') || 'urls')

  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem('tab_overlay', id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TabBar tabs={TABS} active={tab} onChange={handleChange} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'urls'     && <OverlayPage />}
        {tab === 'settings' && <OverlaySettingsPage />}
      </div>
    </div>
  )
}
