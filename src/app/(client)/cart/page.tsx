'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Trash2, Calendar, Clock, ArrowLeft, ShoppingBag, Sunrise, Sun } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/views/components/ui/Button'
import { useBookingCart, type CartItem } from '@/lib/useBookingCart'
import { formatCurrency } from '@/core/utils/formatCurrency'

function getShift(startTime: string): 'manha' | 'tarde' {
  return parseInt(startTime.split(':')[0]) < 12 ? 'manha' : 'tarde'
}

export default function CartPage() {
  const router = useRouter()
  const cart = useBookingCart()

  const groups = useMemo(() => {
    const map = new Map<string, CartItem[]>()
    for (const item of cart.items) {
      const key = `${item.courtId}|${item.date}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.values()).map((items) =>
      [...items].sort((a, b) => a.startTime.localeCompare(b.startTime))
    )
  }, [cart.items])

  const handleCheckout = () => {
    const first = cart.items[0]
    if (!first) return
    router.push(
      `/payment?courtId=${first.courtId}&date=${first.date}&startTime=${first.startTime}&endTime=${first.endTime}&cartItemId=${first.id}`
    )
  }

  return (
    <>
      <header className="px-6 py-4 flex items-center gap-4 w-full">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-container rounded-full transition-all active:scale-90"
        >
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h1 className="font-headline font-bold text-lg text-primary tracking-tight">Carrinho de Reservas</h1>
        {cart.totalCount > 0 && (
          <span className="ml-auto flex-shrink-0 whitespace-nowrap bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full font-headline">
            {cart.totalCount} {cart.totalCount === 1 ? 'item' : 'itens'}
          </span>
        )}
      </header>

      <main className="w-full px-4 md:px-6 pb-32 md:pb-12 max-w-2xl mx-auto">
        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center pt-24 gap-6 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-outline/40" />
            </div>
            <div>
              <p className="font-headline text-lg font-bold text-on-surface mb-1">Carrinho vazio</p>
              <p className="font-headline text-sm text-on-surface-variant">
                Adicione horários de quadras para reservar.
              </p>
            </div>
            <Button onClick={() => router.push('/')} className="px-8">
              Ver Quadras Disponíveis
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {groups.map((groupItems) => {
                const first = groupItems[0]

                return (
                  <motion.div
                    key={`${first.courtId}|${first.date}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm"
                  >
                    {/* Cabeçalho: quadra + data */}
                    <div className="px-4 pt-4 pb-3 border-b border-outline-variant/15">
                      <p className="font-headline text-base font-bold text-primary">{first.courtName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-on-surface-variant flex-shrink-0" />
                        <span className="font-headline text-xs text-on-surface-variant">
                          {format(new Date(first.date + 'T12:00:00'), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Linhas de horário */}
                    <div className="divide-y divide-outline-variant/10">
                      {groupItems.map((item) => {
                        const isManha = getShift(item.startTime) === 'manha'
                        return (
                          <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            {/* Esquerda: badge + horário empilhados */}
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md self-start flex-shrink-0 ${isManha ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-600'}`}>
                                {isManha
                                  ? <Sunrise className="w-3 h-3 flex-shrink-0" />
                                  : <Sun className="w-3 h-3 flex-shrink-0" />
                                }
                                <span className="font-headline text-[10px] font-bold uppercase tracking-wide">
                                  {isManha ? 'Manhã' : 'Tarde'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-on-surface-variant flex-shrink-0" />
                                <span className="font-headline text-sm font-bold text-on-surface">
                                  {item.startTime} — {item.endTime}
                                </span>
                                <span className="font-headline text-[10px] text-on-surface-variant">
                                  · {item.durationHours}h
                                </span>
                              </div>
                            </div>

                            {/* Direita: valor + remover */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-headline text-sm font-bold text-primary whitespace-nowrap">
                                {formatCurrency(item.totalAmount)}
                              </span>
                              <button
                                onClick={() => cart.removeItem(item.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Rodapé global: total + botão único */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-headline text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Total · {cart.totalCount} {cart.totalCount === 1 ? 'reserva' : 'reservas'}
                  </p>
                  <p className="font-headline text-2xl font-bold text-primary">{formatCurrency(cart.totalAmount)}</p>
                </div>
              </div>
              <Button
                className="w-full h-12"
                leftIcon={<ShoppingCart className="w-4 h-4" />}
                onClick={handleCheckout}
              >
                Pagar Reserva{cart.totalCount > 1 ? 's' : ''}
              </Button>
              {cart.totalCount > 1 && (
                <p className="font-headline text-[10px] text-on-surface-variant text-center mt-2">
                  As reservas são processadas individualmente em sequência.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
