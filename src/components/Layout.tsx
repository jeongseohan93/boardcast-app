/**
 * [앱 레이아웃 컴포넌트]
 *
 * 사이드바(Sidebar) + 메인 컨텐츠 영역으로 구성된 전체 앱 레이아웃 래퍼.
 *
 * ── h-full 의 중요성 ─────────────────────────────────────────────────────
 *   Electron 렌더러 창은 높이가 뷰포트 전체를 채워야 한다.
 *   부모 `<div>` 와 `<main>` 모두 h-full 을 가져야 중첩 flex 레이아웃이 올바르게 동작한다.
 *   어느 한 레벨에서라도 h-full 이 빠지면 페이지 컨텐츠가 뷰포트를 넘어 스크롤이 깨진다.
 *
 * ── overflow-y-auto (페이지 레벨 스크롤) ───────────────────────────────
 *   <main> 에 overflow-y-auto 를 설정해 각 페이지 컴포넌트가 전체 창에 대해 독립적으로 스크롤하도록 한다.
 *   페이지가 아닌 레이아웃이 스크롤을 담당해야 사이드바는 항상 고정된 상태를 유지한다.
 */
import { ReactNode } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full bg-bg-outer overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-y-auto h-full">
        {children}
      </main>
    </div>
  )
}
