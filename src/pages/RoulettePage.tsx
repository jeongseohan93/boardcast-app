/**
 * [룰렛 페이지]
 *
 * 룰렛 설정·항목·테마를 관리하는 메인 페이지.
 * 소켓을 통해 리스트 항목 실시간 업데이트를 수신한다.
 *
 * ── 구조 ────────────────────────────────────────────────────────────────
 *
 *   ┌──────────────────┬─────────────────────────┬────────────────────┐
 *   │  RouletteList    │  RouletteItemsPanel      │ RouletteSettings   │
 *   │  Panel (왼쪽)    │  (중앙 — 항목 편집)      │ Panel (오른쪽)     │
 *   │  · 룰렛 목록    │  · 항목 레이블·가중치    │ · 활성화 토글      │
 *   │  · 리스트 항목  │  · 항목 추가/삭제         │ · 리스트 연결      │
 *   │  · 배그 연동    │  · 비율 자동 계산         │ · 트리거 금액      │
 *   └──────────────────┴─────────────────────────┴────────────────────┘
 *
 * ── 책임 분리 ─────────────────────────────────────────────────────────
 *
 *   이 파일(RoulettePage):
 *     - 전체 공유 상태: roulettes, listItems, selectedId, saving, testing, testAffectsList
 *     - 서버 동기화 핸들러: saveSelected, createRoulette, deleteRoulette
 *     - 소켓 이벤트: rouletteList:update / rouletteList:deleted → listItems 업데이트
 *     - patch: selected 룰렛의 임시 변경 (저장 전 로컬 수정)
 *
 *   하위 컴포넌트로 위임:
 *     - RouletteListPanel  → components/roulette/RouletteListPanel.tsx
 *     - RouletteItemsPanel → components/roulette/RouletteItemsPanel.tsx
 *     - RouletteSettingsPanel → components/roulette/RouletteSettingsPanel.tsx
 */

import { useEffect, useState } from 'react'
import { pubgApi, rouletteApi, rouletteListApi } from '../api/client'
import { useToastStore } from '../store/toastStore'
import { useSocket } from '../hooks/useSocket'
import RouletteListPanel from '../components/roulette/RouletteListPanel'
import RouletteItemsPanel from '../components/roulette/RouletteItemsPanel'
import RouletteSettingsPanel from '../components/roulette/RouletteSettingsPanel'
import type { RouletteConfig, RouletteListItem } from '../components/roulette/types'
import { DEFAULT_ROULETTE } from '../components/roulette/types'

export default function RoulettePage() {
  const addToast = useToastStore((s) => s.addToast)
  const socket   = useSocket()

  const [roulettes,       setRoulettes]       = useState<RouletteConfig[]>([])
  const [listItems,       setListItems]       = useState<RouletteListItem[]>([])
  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [saving,          setSaving]          = useState(false)
  const [testing,         setTesting]         = useState(false)
  const [testAffectsList, setTestAffectsList] = useState(false)

  /* 배그 딜 연동 초기값 — RouletteListPanel이 자체 상태로 이어받음 */
  const [initialPubgTracking, setInitialPubgTracking] = useState<Parameters<typeof RouletteListPanel>[0]['initialPubgTracking']>(null)

  const selected = roulettes.find((r) => r.id === selectedId) ?? null

  /* ── 초기 데이터 로드 ─────────────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      rouletteApi.list(),
      rouletteListApi.list(),
      rouletteApi.getTestList(),
      pubgApi.getTracking(),
    ])
      .then(([rRes, lRes, tRes, pRes]) => {
        const rData = rRes.data as RouletteConfig[]
        const lData = lRes.data as RouletteListItem[]
        setRoulettes(rData)
        setListItems(lData)
        setTestAffectsList(!!(tRes.data as { testAffectsList: boolean }).testAffectsList)
        if (rData.length > 0 && !selectedId) setSelectedId(rData[0].id)
        setInitialPubgTracking(pRes.data)
      })
      .catch(() => addToast({ type: 'error', title: '데이터 로드 실패' }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 소켓: 리스트 항목 실시간 업데이트 ──────────────────────────── */
  useEffect(() => {
    if (!socket) return
    const onUpdate = (item: RouletteListItem) => {
      if (!item?.id) return
      setListItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id)
        if (idx === -1) return [...prev, item]
        const next = [...prev]; next[idx] = item; return next
      })
    }
    const onDeleted = ({ id }: { id: string }) => {
      setListItems((prev) => prev.filter((i) => i.id !== id))
    }
    socket.on('rouletteList:update',  onUpdate)
    socket.on('rouletteList:deleted', onDeleted)
    return () => {
      socket.off('rouletteList:update',  onUpdate)
      socket.off('rouletteList:deleted', onDeleted)
    }
  }, [socket])

  /* ── 공유 핸들러 ────────────────────────────────────────────────── */
  const saveSelected = async (updated: RouletteConfig) => {
    setSaving(true)
    try {
      await rouletteApi.update(updated.id, updated)
      setRoulettes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      addToast({ type: 'info', title: '저장되었습니다.' })
    } catch {
      addToast({ type: 'error', title: '저장 실패' })
    } finally {
      setSaving(false)
    }
  }

  const createRoulette = async () => {
    try {
      const res     = await rouletteApi.create(DEFAULT_ROULETTE)
      const created = res.data as RouletteConfig
      setRoulettes((prev) => [...prev, created])
      setSelectedId(created.id)
    } catch {
      addToast({ type: 'error', title: '룰렛 추가 실패' })
    }
  }

  const deleteRoulette = async (id: string) => {
    try {
      await rouletteApi.delete(id)
      const next = roulettes.filter((r) => r.id !== id)
      setRoulettes(next)
      if (selectedId === id) setSelectedId(next[0]?.id ?? null)
    } catch {
      addToast({ type: 'error', title: '삭제 실패' })
    }
  }

  /** selected 룰렛의 필드를 저장 없이 임시 변경 (저장은 별도 버튼) */
  const patch = (changes: Partial<RouletteConfig>) => {
    if (!selected) return
    setRoulettes((prev) => prev.map((r) => (r.id === selected.id ? { ...r, ...changes } : r)))
  }

  const handleTest = async () => {
    if (!selected) return
    setTesting(true)
    try {
      await rouletteApi.test(selected.id)
    } catch {
      addToast({ type: 'error', title: '테스트 실패 — 오버레이가 열려있는지 확인하세요.' })
    } finally {
      setTimeout(() => setTesting(false), 1500)
    }
  }

  return (
    <div className="flex h-full bg-bg-outer overflow-hidden gap-3 p-3">
      <RouletteListPanel
        roulettes={roulettes}
        selectedId={selectedId}
        listItems={listItems}
        saving={saving}
        initialPubgTracking={initialPubgTracking}
        onSelectId={setSelectedId}
        onCreateRoulette={() => void createRoulette()}
        onDeleteRoulette={(id) => void deleteRoulette(id)}
        onSaveSelected={saveSelected}
        onUpdateListItems={setListItems}
      />

      <RouletteItemsPanel
        selected={selected}
        saving={saving}
        onSaveSelected={saveSelected}
        onPatch={patch}
      />

      <RouletteSettingsPanel
        selected={selected}
        listItems={listItems}
        saving={saving}
        testing={testing}
        testAffectsList={testAffectsList}
        onSaveSelected={saveSelected}
        onPatch={patch}
        onTest={handleTest}
        onSetTestAffectsList={setTestAffectsList}
      />
    </div>
  )
}
