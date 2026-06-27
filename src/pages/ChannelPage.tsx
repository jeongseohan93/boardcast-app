/**
 * [채널 분석 페이지]
 *
 * 채널의 성장 데이터와 시청자 관리를 한 곳에서 볼 수 있도록 묶은 허브 페이지.
 * 방송 중보다는 방송 전/후에 주로 쓰는 기능들이다.
 *
 * 포함된 탭 목록:
 *   - 통계       (stats)       : 시청자 수 추이, 채팅 빈도, 팔로워 증감 등 그래프
 *                                (recharts 라이브러리 의존 — npm install recharts 필요)
 *   - 활동 제한  (restriction) : 특정 시청자의 채팅 차단, 제한 목록 관리
 *
 * 탭 상태 영속화:
 *   localStorage 키 'tab_channel'에 마지막 탭 id 저장.
 *   기본값은 'stats'(통계).
 *
 * 레이아웃:
 *   flex-col + h-full → TabBar 고정, 나머지를 콘텐츠가 꽉 채움.
 */

import { useState } from 'react'
import TabBar from '../components/TabBar'
import StatisticsPage from './StatisticsPage'
import RestrictionPage from './RestrictionPage'

/**
 * 채널 분석 탭 목록.
 * 통계를 먼저, 활동 제한은 부가 기능으로 뒤에.
 */
const TABS = [
  { id: 'stats',       label: '통계' },
  { id: 'restriction', label: '활동 제한' },
]

/** localStorage 탭 상태 키 */
const TAB_STORAGE_KEY = 'tab_channel'

export default function ChannelPage() {
  /**
   * 마지막으로 열었던 탭 복원. 없으면 'stats'.
   */
  const [tab, setTab] = useState<string>(() => localStorage.getItem(TAB_STORAGE_KEY) || 'stats')

  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem(TAB_STORAGE_KEY, id)
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
