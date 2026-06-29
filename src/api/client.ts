/**
 * [API 진입점 — 하위 호환 re-export]
 *
 * 기존 import 경로(`from '../api/client'`)가 깨지지 않도록 모든 도메인 API를 여기서 재내보낸다.
 * 새로운 코드를 작성할 때는 도메인 파일을 직접 import하는 것을 권장:
 *   import { liveApi } from '../api/live'
 *   import { chatApi } from '../api/chat'
 *
 * 도메인별 파일 위치:
 *   base.ts          — axios 인스턴스
 *   auth.ts          — 인증 (토큰·자격증명)
 *   live.ts          — 방송 설정 (제목·카테고리·태그)
 *   channel.ts       — 채널 관리 (팔로워·구독자·활동제한)
 *   chat.ts          — 채팅 (전송·공지·블라인드·설정)
 *   categories.ts    — 방송 카테고리 검색
 *   events.ts        — 이벤트 히스토리 (후원·구독·팔로우)
 *   bot.ts           — 봇 명령어 + 자동 공지
 *   roulette.ts      — 룰렛 + 결과 리스트
 *   tamagotchi.ts    — 다마고치
 *   pubg.ts          — PUBG 전적 + 딜 추적
 *   videoDonation.ts — 영상 도네이션(영도)
 */

export { api, BASE_URL } from './base'
export { authApi }        from './auth'
export { liveApi }        from './live'
export { channelApi }     from './channel'
export { chatApi }        from './chat'
export { categoryApi }    from './categories'
export { eventsApi }      from './events'
export { botApi, autoNoticeApi } from './bot'
export { rouletteApi, rouletteListApi } from './roulette'
export { tamagotchiApi }  from './tamagotchi'
export { pubgApi }        from './pubg'
export { videoDonationApi } from './videoDonation'
export { attendanceApi }  from './attendance'
export type { AttendanceSettings, AttendanceRow } from './attendance'
export { donationAlertApi } from './donationAlert'
export type { DonationAlertRule } from './donationAlert'
export { ttsDonationApi } from './ttsDonation'
export type { TtsDonationSettings } from './ttsDonation'
