/**
 * [방송 설정 페이지]
 *
 * 스트리밍 중 자주 조작하는 기능들을 하나의 페이지 안에서 탭으로 묶어 놓은 허브 페이지.
 *
 * 포함된 탭 목록:
 *   - 채팅 봇    (bot)        : 자동 채팅 명령어, 스팸 필터, 봇 설정
 *   - 후원/알림  (alerts)     : 별풍선·구독 도착 이력 및 알림음 설정
 *   - 팔로워     (followers)  : 팔로워 목록 조회 및 관리
 *   - 이모티콘파티(emote)     : 채팅 이모티콘 파티 실행/설정
 *   - 룰렛       (roulette)   : 딜룰렛(피해 기반 룰렛) 설정 및 현황
 *   - 다마고치   (tamagotchi) : 채팅 참여형 다마고치 미니게임 설정
 *
 * 탭 상태 영속화:
 *   localStorage 키 'tab_stream'에 마지막으로 선택한 탭 id를 저장해 두어
 *   앱을 재시작하거나 다른 페이지를 갔다가 돌아와도 같은 탭이 열린다.
 *   초기값이 없으면 'bot'(채팅 봇) 탭이 기본값이다.
 *
 * 레이아웃:
 *   flex-col + h-full 로 부모가 주는 높이를 꽉 채우고,
 *   TabBar 아래 flex-1 min-h-0 으로 탭 콘텐츠 영역이 남은 공간 전부를 차지한다.
 *   각 하위 페이지(BotPage 등)도 h-full + overflow-auto 구조를 그대로 쓴다.
 */

import { useState } from 'react'
import TabBar from '../components/TabBar'
import BotPage from './BotPage'
import AlertHistoryPage from './AlertHistoryPage'
import FollowerListPage from './FollowerListPage'
import EmotePartyPage from './EmotePartyPage'
import RoulettePage from './RoulettePage'
import TamagotchiPage from './TamagotchiPage'

/**
 * 방송 설정 탭 목록.
 *
 * 순서가 화면 표시 순서이므로, 사용 빈도가 높은 항목을 앞에 배치한다.
 * 딜룰렛을 자주 쓰는 배그 스트리머 기준으로 봇·룰렛이 가장 중요하다.
 */
const TABS = [
  { id: 'bot',        label: '채팅 봇' },
  { id: 'alerts',     label: '후원/알림' },
  { id: 'followers',  label: '팔로워' },
  { id: 'emote',      label: '이모티콘 파티' },
  { id: 'roulette',   label: '룰렛' },
  { id: 'tamagotchi', label: '다마고치' },
]

/** localStorage에서 이 페이지의 탭 상태를 읽고 쓸 때 사용하는 키 */
const TAB_STORAGE_KEY = 'tab_stream'

export default function StreamSettingsPage() {
  /**
   * 초기 탭:
   *   localStorage에 저장된 값이 있으면 그것을 쓰고, 없으면 'bot'.
   *   useState 초기화 함수를 쓰는 이유는 렌더마다 localStorage를 읽지 않기 위함.
   */
  const [tab, setTab] = useState<string>(() => localStorage.getItem(TAB_STORAGE_KEY) || 'bot')

  /**
   * 탭 전환 핸들러.
   * state와 localStorage를 동시에 업데이트해서 새로고침/재시작 후에도 복원.
   */
  const handleChange = (id: string) => {
    setTab(id)
    localStorage.setItem(TAB_STORAGE_KEY, id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 상단 탭 바 — shrink-0이므로 높이가 고정됨 */}
      <TabBar tabs={TABS} active={tab} onChange={handleChange} />

      {/* 탭 콘텐츠 영역 — flex-1 + min-h-0 으로 탭 바 아래 남은 공간 전부 차지 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* 조건부 렌더링: 활성 탭에 해당하는 페이지만 마운트 */}
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
