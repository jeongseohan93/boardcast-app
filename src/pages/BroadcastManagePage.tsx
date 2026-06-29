/**
 * [방송 관리 페이지]
 *
 * 방송 중 시청자와 상호작용하는 기능들을 하나의 탭 페이지로 묶은 허브.
 * 모두 "방송 중에 실시간으로 쓰는" 기능들이라 같은 그룹으로 묶었다.
 *
 * 포함된 탭 목록:
 *   - 공지     (notice)     : 채팅창에 공지사항 전송, 반복 공지 설정
 *   - 투표     (vote)       : 시청자 투표 생성·집계·종료
 *   - 영도관리 (video)      : 영상 도네이션(영도) 목록 및 재생 제어
 *   - 출석체크 (attendance) : 채팅 키워드 기반 출석 체크 및 누적 기록 관리
 *
 * 탭 상태 영속화:
 *   localStorage 키 'tab_broadcast'에 마지막 선택 탭 id를 저장.
 *   기본값은 'notice'(공지).
 *
 * 레이아웃:
 *   flex-col + h-full → TabBar 고정, 나머지를 콘텐츠 영역이 꽉 채움.
 */

import { useState } from 'react'
import TabBar from '../components/TabBar'
import NoticePage from './NoticePage'
import VotePage from './VotePage'
import VideoDonationPage from './VideoDonationPage'
import AttendancePage from './AttendancePage'

/**
 * 방송 관리 탭 목록.
 */
const TABS = [
  { id: 'notice',     label: '공지' },
  { id: 'vote',       label: '투표' },
  { id: 'video',      label: '영도 관리' },
  { id: 'attendance', label: '출석 체크' },
]

/** localStorage 탭 상태 키 */
const TAB_STORAGE_KEY = 'tab_broadcast'

export default function BroadcastManagePage() {
  /**
   * 마지막으로 열었던 탭을 복원. 없으면 'notice'.
   */
  const [tab, setTab] = useState<string>(() => localStorage.getItem(TAB_STORAGE_KEY) || 'notice')

  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem(TAB_STORAGE_KEY, id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TabBar tabs={TABS} active={tab} onChange={handleChange} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'notice'     && <NoticePage />}
        {tab === 'vote'       && <VotePage />}
        {tab === 'video'      && <VideoDonationPage />}
        {tab === 'attendance' && <AttendancePage />}
      </div>
    </div>
  )
}
