'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, User, MessageCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/core/utils/helpers'

const NAV_ITEMS = [
  { label: 'Início', icon: Home, path: '/' },
  { label: 'Reservas', icon: CalendarDays, path: '/bookings' },
  { label: 'Contato', icon: MessageCircle, path: '/contact' },
  { label: 'Perfil', icon: User, path: '/profile' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-outline-variant/30 px-6 py-2 z-50 flex justify-between items-center pb-safe">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            href={item.path}
            scroll={!isActive}
            className={cn(
              'relative flex flex-col items-center gap-1 py-1 min-w-[64px] transition-all active:scale-90',
              isActive ? 'text-primary' : 'text-on-surface-variant/50'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive && 'fill-primary/10')} />
            <span className="text-[10px] font-bold font-headline uppercase tracking-tighter">
              {item.label}
            </span>
            
            {isActive && (
              <motion.div
                layoutId="bottom-nav-underline"
                className="absolute -bottom-1 w-8 h-1 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
