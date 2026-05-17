'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Palmtree,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/core/utils/helpers'
import { ROUTES } from '@/core/constants/config'

const nav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: ROUTES.ADMIN.DASHBOARD },
  { icon: CalendarDays, label: 'Agendamentos', path: ROUTES.ADMIN.BOOKINGS },
  { icon: Palmtree, label: 'Quadras', path: ROUTES.ADMIN.COURTS },
  { icon: Users, label: 'Clientes', path: ROUTES.ADMIN.CLIENTS },
  { icon: CreditCard, label: 'Financeiro', path: ROUTES.ADMIN.PAYMENTS },
  { icon: BarChart3, label: 'Relatórios', path: ROUTES.ADMIN.REPORTS },
  { icon: Settings, label: 'Configurações', path: ROUTES.ADMIN.SETTINGS },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="w-full h-full bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col shadow-2xl md:shadow-none">
      <div className="p-5 md:p-6 border-b border-outline-variant/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
            <Image src="/logo.svg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-headline font-bold text-sm text-primary">Arena Beach</p>
            <p className="font-headline text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Admin</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-full md:hidden text-outline"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const isActive = pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-headline text-sm font-bold',
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-on-surface-variant hover:bg-secondary-container/50 hover:text-primary'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-primary')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-outline-variant/30">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-headline text-sm font-bold"
        >
          <LogOut className="w-5 h-5" />
          Sair do Painel
        </button>
      </div>
    </aside>
  )
}

