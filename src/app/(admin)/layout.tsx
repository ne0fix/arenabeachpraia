'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from '@/views/components/layout/admin/Sidebar'
import { TopBar } from '@/views/components/layout/admin/TopBar'
import { SocketProvider } from '@/views/providers/SocketProvider'
import { LiveNotifications } from '@/views/components/admin/LiveNotifications'
import { AdminDataSync } from '@/views/components/admin/AdminDataSync'
import { Menu, X } from 'lucide-react'
import { cn } from '@/core/utils/helpers'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <SocketProvider room="admin">
    <div className="flex min-h-dvh bg-surface overflow-hidden">
      {/* Sidebar - Desktop: fixed, Mobile: Drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[60] w-64 transform transition-transform duration-300 ease-in-out bg-surface md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </aside>

      {/* Overlay for Mobile Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 px-4 md:px-6 py-2.5 flex items-center justify-between min-h-[56px] md:min-h-[64px]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-surface-container rounded-full md:hidden text-primary"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-headline font-bold text-base text-primary tracking-tight md:hidden">Arena Beach Serra</h2>
          </div>
          <TopBar />
        </header>
        
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <LiveNotifications />
      <AdminDataSync />
    </div>
    </SocketProvider>
  )
}
