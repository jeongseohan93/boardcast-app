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
