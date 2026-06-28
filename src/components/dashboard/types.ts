/**
 * [대시보드 공용 타입 정의]
 *
 * DashboardPage와 하위 컴포넌트들이 공유하는 인터페이스.
 * 여기서 한 번만 정의하고, 각 컴포넌트는 이 파일에서 import한다.
 */

/** 오늘/이달 집계 + 최근 이벤트 목록 */
export interface Summary {
  today: {
    donationSum: number
    subscriptionCount: number
    followCount: number
    unfollowCount?: number
    /** 팔로우 - 언팔로우 순 증감 (서버에서 계산해 내려줌) */
    netFollowCount?: number
  }
  month: {
    donationSum: number
  }
  recentEvents: RecentEvent[]
}

/** 최근 이벤트 피드의 개별 이벤트 항목 */
export interface RecentEvent {
  id: number
  eventType: 'donation' | 'subscription' | 'follow' | 'unfollow'
  nickname?: string
  amount?: number
  month?: number
  follower_count?: number
  created_at: string
}

/** 방송 설정 (제목·카테고리·태그) */
export interface LiveSetting {
  defaultLiveTitle?: string
  category?: Category
  tags?: string[]
}

/** 방송 카테고리 (게임·콘텐츠 분류) */
export interface Category {
  categoryId?: string
  categoryType?: string
  categoryValue?: string
  posterImageUrl?: string
}
