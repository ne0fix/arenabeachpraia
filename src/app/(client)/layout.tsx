import { ClientLayout } from '@/views/components/layout/client/ClientLayout'
import { SocketProvider } from '@/views/providers/SocketProvider'
import { SiteSettingsProvider } from '@/views/providers/SiteSettingsProvider'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <SiteSettingsProvider>
      <SocketProvider room="client">
        <ClientLayout>{children}</ClientLayout>
      </SocketProvider>
    </SiteSettingsProvider>
  )
}
