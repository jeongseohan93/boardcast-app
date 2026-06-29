/**
 * [토스트 알림 스토어]
 *
 * 화면 우하단에 표시되는 단발성 알림(토스트)을 관리하는 Zustand 스토어.
 *
 * ── 자동 제거 (5000ms) ────────────────────────────────────────────────────
 *   addToast 호출 즉시 setTimeout을 등록해 5초 후 해당 id를 필터링 제거한다.
 *   id는 Math.random().toString(36).slice(2) 로 생성하며,
 *   closure 내부에 캡처되므로 복수의 토스트가 동시에 존재해도 각자 독립적으로 만료된다.
 *
 * ── type 종류 ──────────────────────────────────────────────────────────────
 *   donation     → 후원 이벤트 (노란 테두리)
 *   subscription → 구독 이벤트 (보라 테두리)
 *   follow       → 팔로우/언팔로우 이벤트 (핑크 테두리)
 *   info         → 시스템 안내 (민트 테두리)
 *   error        → API 오류 등 실패 알림 (빨간 테두리)
 *
 * ── removeToast ───────────────────────────────────────────────────────────
 *   사용자가 X 버튼을 누르면 ToastContainer 에서 직접 호출해 즉시 제거한다.
 *   5초 만료 setTimeout 과 중복 제거되더라도 filter 는 멱등하므로 안전하다.
 */
import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'donation' | 'subscription' | 'follow' | 'info' | 'error'
  title: string
  message?: string
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
