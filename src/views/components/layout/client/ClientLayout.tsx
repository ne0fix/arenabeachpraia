import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNav } from './BottomNav'
import { LGPDNotice } from './LGPDNotice'

interface ClientLayoutProps {
  children: ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="min-h-dvh w-full flex flex-col bg-surface overflow-x-hidden">
      <Header />
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
      <Footer />
      <BottomNav />
      <LGPDNotice />
    </div>
  )
}
