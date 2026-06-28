/**
 * [오버레이 허브 페이지]
 *
 * 방송 화면에 띄우는 오버레이(브라우저 소스)를 관리하는 허브 페이지.
 * OBS/StreamLabs에서 브라우저 소스로 불러올 URL을 복사하거나, 오버레이 동작을 설정한다.
 *
 * 포함된 탭 목록:
 *   - URL 목록      (urls)     : 각 오버레이별 브라우저 소스 URL 표시 및 복사 버튼.
 *                               포트 번호가 바뀔 때 이 페이지에서 확인하면 된다.
 *   - 오버레이 설정 (settings) : 오버레이 애니메이션 속도, 색상, 폰트 등 세부 설정.
 *
 * 탭 상태 영속화:
 *   localStorage 키 'tab_overlay'에 마지막 탭 id 저장.
 *   기본값은 'urls'(URL 목록).
 *
 * 레이아웃:
 *   flex-col + h-full → TabBar 고정, 나머지를 콘텐츠가 꽉 채움.
 */

import { useState } from 'react'
import TabBar from '../components/TabBar'
import OverlayPage from './OverlayPage'
import OverlaySettingsPage from './OverlaySettingsPage'

/**
 * 오버레이 탭 목록.
 * URL을 먼저 보여주고, 설정은 두 번째로.
 */
const TABS = [
  { id: 'urls',     label: 'URL 목록' },
  { id: 'settings', label: '오버레이 설정' },
]

/** localStorage 탭 상태 키 */
const TAB_STORAGE_KEY = 'tab_overlay'

export default function OverlayHubPage() {
  /**
   * 마지막으로 열었던 탭 복원. 없으면 'urls'.
   */
  const [tab, setTab] = useState<string>(() => localStorage.getItem(TAB_STORAGE_KEY) || 'urls')

  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem(TAB_STORAGE_KEY, id)
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
