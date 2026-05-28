'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'

const LAST_USER_KEY = 'last_logged_user_id'
const CART_KEY = 'booking_cart'

/**
 * Detecta troca de usuário no mesmo dispositivo e limpa dados do anterior:
 * - Limpa cache do React Query (evita vazamento entre usuários)
 * - Limpa carrinho (sessionStorage)
 *
 * Roda apenas no client. Persiste o último userId em localStorage para
 * detectar mudança até entre sessões do navegador.
 */
export function AuthSyncProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const qc = useQueryClient()
  const lastSeenRef = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    const currentId = (session?.user as any)?.id ?? null

    // Lê o último userId conhecido (entre páginas/recargas)
    if (lastSeenRef.current === null) {
      try {
        lastSeenRef.current = localStorage.getItem(LAST_USER_KEY)
      } catch { /* ignore */ }
    }
    const previousId = lastSeenRef.current

    if (currentId !== previousId) {
      // Trocou de usuário (ou logou/deslogou) — limpa dados do anterior
      qc.clear()
      try {
        sessionStorage.removeItem(CART_KEY)
        window.dispatchEvent(new Event('booking_cart_updated'))
      } catch { /* ignore */ }
      try {
        if (currentId) localStorage.setItem(LAST_USER_KEY, currentId)
        else localStorage.removeItem(LAST_USER_KEY)
      } catch { /* ignore */ }
      lastSeenRef.current = currentId
    }
  }, [session, status, qc])

  return <>{children}</>
}
