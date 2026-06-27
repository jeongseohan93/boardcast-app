/**
 * [알림 히스토리 JSX 상수]
 *
 * JSX 아이콘 노드를 포함하는 TABS 상수는 .tsx 확장자가 필요하므로
 * types.ts와 별도 파일로 분리한다.
 */

import { Gift, Heart, HeartOff, Star } from 'lucide-react'
import type { Tab } from './types'

export const TABS: { label: string; value: Tab; icon?: React.ReactNode }[] = [
  { label: '전체',        value: 'all' },
  { label: '후원',        value: 'donation',     icon: <Gift    size={11} /> },
  { label: '구독',        value: 'subscription', icon: <Star    size={11} /> },
  { label: '팔로우',      value: 'follow',       icon: <Heart   size={11} /> },
  { label: '팔로우 취소', value: 'unfollow',     icon: <HeartOff size={11} /> },
]
