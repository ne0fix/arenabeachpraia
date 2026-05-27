'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogOut, User, ShoppingCart } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBookingCart } from '@/lib/useBookingCart'

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const cart = useBookingCart()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between transition-all w-full overflow-hidden">
      <Link href="/" className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center overflow-hidden">
          <Image src="/logo.svg" alt="Arena Beach Serra" width={48} height={48} className="w-full h-full object-cover" />
        </div>
        <h1 className="font-headline font-bold text-base md:text-xl text-primary tracking-tight truncate">Arena Beach Serra</h1>
      </Link>
      
      <div className="flex items-center gap-2 md:gap-4">
        {/* Ícone de carrinho com badge */}
        <Link href="/cart" className="relative p-2 md:p-2.5 hover:bg-surface-container rounded-full transition-colors text-primary">
          <ShoppingCart className="w-6 h-6 md:w-7 md:h-7" />
          {cart.totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {cart.totalCount}
            </span>
          )}
        </Link>

        {session ? (
          <button
            onClick={handleLogout}
            className="p-2 md:p-2.5 hover:bg-red-50 rounded-full transition-colors text-red-600"
            title="Sair"
          >
            <LogOut className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        ) : (
          <Link href="/login" className="p-2 md:p-2.5 hover:bg-surface-container rounded-full transition-colors text-primary">
            <User className="w-6 h-6 md:w-8 md:h-8" />
          </Link>
        )}
        <Link href="/profile" className="hidden md:flex items-center gap-2 bg-surface-container hover:bg-secondary-container px-4 py-2 rounded-xl transition-all">
          <User className="w-5 h-5 text-primary" />
          <span className="font-headline text-sm font-bold text-primary">Minha Conta</span>
        </Link>
      </div>
    </header>
  )
}
