import { X } from 'lucide-react'
import { useToastStore, Toast } from '../store/toastStore'

const BORDER_COLOR: Record<Toast['type'], string> = {
  donation: 'border-accent-mint',
  subscription: 'border-accent-purple',
  follow: 'border-accent-success',
  info: 'border-border',
  error: 'border-accent-danger',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-xs w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-bg-card border ${BORDER_COLOR[toast.type]} rounded-lg px-4 py-3 shadow-xl animate-slide-in flex items-start gap-3`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-text-secondary mt-0.5 truncate">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-text-muted hover:text-text-secondary transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
