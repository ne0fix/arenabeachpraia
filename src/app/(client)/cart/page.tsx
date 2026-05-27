'use client'

import { useRouter } from 'next/navigation'
import { ShoppingCart, Trash2, Calendar, Clock, ArrowLeft, ShoppingBag } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/views/components/ui/Button'
import { useBookingCart } from '@/lib/useBookingCart'
import { formatCurrency } from '@/core/utils/formatCurrency'

export default function CartPage() {
  const router = useRouter()
  const cart = useBookingCart()

  const handleCheckout = (index: number) => {
    const item = cart.items[index]
    router.push(
      `/payment?courtId=${item.courtId}&date=${item.date}&startTime=${item.startTime}&endTime=${item.endTime}&cartItemId=${item.id}`
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
          <span className="ml-auto bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full font-headline">
            {cart.totalCount} {cart.totalCount === 1 ? 'item' : 'itens'}
          </span>
        )}
      </header>

      <main className="w-full px-4 md:px-6 pb-32 md:pb-12 max-w-2xl mx-auto">
        {cart.items.length === 0 ? (
          /* Estado vazio */
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
          <div className="space-y-3">
            <AnimatePresence>
              {cart.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-headline text-base font-bold text-primary">{item.courtName}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span className="font-headline text-xs text-on-surface-variant">
                          {format(new Date(item.date + 'T12:00:00'), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span className="font-headline text-xs text-on-surface-variant">
                          {item.startTime} — {item.endTime} · {item.durationHours}h
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => cart.removeItem(item.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                    <p className="font-headline text-xl font-bold text-primary">
                      {formatCurrency(item.totalAmount)}
                    </p>
                    <Button size="sm" onClick={() => handleCheckout(index)}>
                      Pagar este horário
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Rodapé com total e checkout de todos */}
            {cart.items.length > 1 && (
              <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/20 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-headline text-sm font-bold text-on-surface-variant uppercase tracking-wider">
                    Total
                  </span>
                  <span className="font-headline text-2xl font-bold text-primary">
                    {formatCurrency(cart.totalAmount)}
                  </span>
                </div>
                <p className="font-headline text-[11px] text-on-surface-variant text-center mb-3">
                  Cada reserva é processada individualmente.
                </p>
                <Button className="w-full h-12" leftIcon={<ShoppingCart className="w-4 h-4" />} onClick={() => handleCheckout(0)}>
                  Pagar primeiro item
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
