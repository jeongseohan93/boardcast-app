import { useEffect, useMemo, useState } from 'react'
import { Copy, Megaphone, Plus, Send, Star, Trash2 } from 'lucide-react'
import { chatApi } from '../api/client'
import { useToastStore } from '../store/toastStore'

interface NoticeTemplate {
  id: string
  message: string
  createdAt: string
}

const STORAGE_KEY = 'noticeTemplates'
const MAX_NOTICE_LENGTH = 100

function loadTemplates(): NoticeTemplate[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTemplates(templates: NoticeTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export default function NoticePage() {
  const addToast = useToastStore((s) => s.addToast)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<NoticeTemplate[]>(() => loadTemplates())

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  const remaining = MAX_NOTICE_LENGTH - message.length
  const canSend = message.trim().length > 0 && message.length <= MAX_NOTICE_LENGTH

  const previewLines = useMemo(() => {
    const text = message.trim() || '공지 내용을 입력하면 이곳에서 미리 볼 수 있습니다.'
    return text.split('\n').slice(0, 3)
  }, [message])

  const updateMessage = (value: string) => {
    setMessage(value.slice(0, MAX_NOTICE_LENGTH))
  }

  const sendNotice = async () => {
    const text = message.trim()
    if (!text || text.length > MAX_NOTICE_LENGTH) return
    setSending(true)
    try {
      await chatApi.notice({ message: text })
      addToast({ type: 'info', title: '공지 등록 완료', message: text })
    } catch {
      addToast({ type: 'error', title: '공지 등록 실패' })
    } finally {
      setSending(false)
    }
  }

  const addTemplate = () => {
    const text = message.trim()
    if (!text) return
    const exists = templates.some((item) => item.message === text)
    if (exists) {
      addToast({ type: 'info', title: '이미 저장된 공지입니다' })
      return
    }
    setTemplates((prev) => [
      { id: crypto.randomUUID(), message: text, createdAt: new Date().toISOString() },
      ...prev,
    ].slice(0, 20))
    addToast({ type: 'info', title: '공지 문구 저장 완료' })
  }

  const removeTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((item) => item.id !== id))
  }

  const duplicate = async () => {
    if (!message.trim()) return
    try {
      await navigator.clipboard.writeText(message.trim())
      addToast({ type: 'info', title: '공지 문구 복사 완료' })
    } catch {
      addToast({ type: 'error', title: '복사 실패' })
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-outer overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Megaphone size={18} className="text-accent-mint" />
        <div>
          <h1 className="text-base font-bold text-text-primary">공지 작성</h1>
          <p className="text-xs text-text-muted mt-0.5">치지직 채팅 공지를 작성하고 오버레이에도 표시합니다</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">공지 내용</p>
                <p className="text-xs text-text-muted mt-0.5">치지직 공지는 최대 100자까지 등록할 수 있습니다</p>
              </div>
              <span className={`text-xs font-semibold ${remaining < 15 ? 'text-accent-warning' : 'text-text-muted'}`}>
                {message.length}/{MAX_NOTICE_LENGTH}
              </span>
            </div>

            <div className="p-4 space-y-4">
              <textarea
                value={message}
                onChange={(e) => updateMessage(e.target.value)}
                className="w-full h-40 resize-none bg-bg-outer border border-border rounded-2xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20"
                placeholder="예: 오늘 방송 일정은 오후 8시 참여 이벤트 후 배틀그라운드입니다!"
              />

              <div className="rounded-2xl border border-border bg-bg-outer p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg bg-accent-mint/10 text-accent-mint flex items-center justify-center">
                    <Megaphone size={14} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-text-secondary">미리보기</p>
                    <p className="text-[10px] text-text-muted">채팅 오버레이 공지와 비슷한 형태로 표시됩니다</p>
                  </div>
                </div>
                <div className="rounded-xl border border-accent-mint/25 bg-accent-mint/10 px-4 py-3">
                  <p className="text-[10px] font-bold text-accent-mint mb-1">NOTICE</p>
                  {previewLines.map((line, index) => (
                    <p key={index} className="text-sm text-text-primary break-words leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={sendNotice}
                  disabled={!canSend || sending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-mint text-bg-outer rounded-xl text-sm font-semibold hover:brightness-110 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                  {sending ? '등록 중' : '공지 등록'}
                </button>
                <button
                  type="button"
                  onClick={addTemplate}
                  disabled={!message.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-40"
                >
                  <Star size={14} /> 문구 저장
                </button>
                <button
                  type="button"
                  onClick={duplicate}
                  disabled={!message.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-40"
                >
                  <Copy size={14} /> 복사
                </button>
              </div>
            </div>
          </section>

          <aside className="bg-bg-card border border-border rounded-2xl overflow-hidden h-fit">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-yellow-400" />
                <span className="text-sm font-semibold text-text-primary">저장한 공지</span>
              </div>
              <span className="text-xs text-text-muted">{templates.length}</span>
            </div>

            <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
              {templates.length === 0 ? (
                <div className="py-10 text-center">
                  <Megaphone size={24} className="mx-auto text-border mb-2" />
                  <p className="text-xs text-text-muted">저장한 공지가 없습니다</p>
                </div>
              ) : templates.map((template) => (
                <div key={template.id} className="rounded-xl bg-bg-outer border border-border p-3">
                  <p className="text-sm text-text-secondary leading-relaxed break-words">{template.message}</p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => setMessage(template.message)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-mint/10 text-accent-mint text-xs hover:bg-accent-mint/15 transition-colors"
                    >
                      <Plus size={12} /> 불러오기
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTemplate(template.id)}
                      className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
