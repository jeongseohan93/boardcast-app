interface Tab {
  id: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-bg-card border-b border-border shrink-0 overflow-x-auto scrollbar-hide">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0
            ${active === t.id
              ? 'bg-accent-mint/15 text-accent-mint'
              : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
