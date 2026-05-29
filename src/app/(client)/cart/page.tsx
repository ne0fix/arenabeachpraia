'use client'

import { useMemo, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Trash2, Calendar, Clock, ArrowLeft, ShoppingBag, Sunrise, Sun, AlertTriangle } from 'lucide-react'
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
  const [unavailableInfo, setUnavailableInfo] = useState<{ items: CartItem[] } | null>(null)
  const itemsRef = useRef(cart.items)
  itemsRef.current = cart.items

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

  // Polling: checa disponibilidade dos itens do carrinho a cada 15s
  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const current = itemsRef.current
      if (current.length === 0) return
      try {
        const res = await fetch('/api/cart/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: current.map(i => ({
              cartItemId: i.id,
              courtId: i.courtId,
              date: i.date,
              startTime: i.startTime,
              endTime: i.endTime,
            })),
          }),
        })
        if (!res.ok || cancelled) return
        const data = await res.json() as { unavailable: string[] }
        if (data.unavailable.length > 0) {
          const removed = current.filter(i => data.unavailable.includes(i.id))
          // Remove os itens indisponíveis do carrinho
          for (const id of data.unavailable) cart.removeItem(id)
          setUnavailableInfo({ items: removed })
        }
      } catch (e) {
        console.error('Erro ao verificar disponibilidade:', e)
      }
    }

    check()
    const interval = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCheckout = () => {
    if (!cart.items.length) return
    if (cart.items.length === 1) {
      const item = cart.items[0]
      const sportsParam = item.sports?.length ? `&sports=${encodeURIComponent(item.sports.join(','))}` : ''
      router.push(`/payment?courtId=${item.courtId}&date=${item.date}&startTime=${item.startTime}&endTime=${item.endTime}&cartItemId=${item.id}${sportsParam}`)
    } else {
      router.push('/payment?batch=true')
    }
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
            {/* Aviso de pagamento garantido somente após confirmação */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="font-headline text-[11px] text-amber-800 leading-relaxed">
                O horário só fica reservado para você após a <strong>confirmação do pagamento</strong>.
                Caso outro cliente conclua o pagamento antes, seu valor será estornado.
              </p>
            </div>

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
            </div>
          </div>
        )}
      </main>

      {/* Modal de alerta — algum item ficou indisponível */}
      <AnimatePresence>
        {unavailableInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center p-4"
            onClick={() => setUnavailableInfo(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-surface max-w-md w-full rounded-3xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <h2 className="font-headline text-lg font-bold text-on-surface mb-2">
                  {unavailableInfo.items.length === 1 ? 'Horário indisponível' : 'Horários indisponíveis'}
                </h2>
                <p className="font-headline text-sm text-on-surface-variant mb-4 leading-relaxed">
                  Outro cliente confirmou o pagamento antes. {unavailableInfo.items.length === 1 ? 'O horário abaixo foi removido' : 'Os horários abaixo foram removidos'} do seu carrinho:
                </p>
                <div className="w-full bg-surface-container rounded-xl p-3 mb-4 space-y-1.5">
                  {unavailableInfo.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-left">
                      <div className="min-w-0">
                        <p className="font-headline text-xs font-bold text-on-surface truncate">{item.courtName}</p>
                        <p className="font-headline text-[10px] text-on-surface-variant">
                          {format(new Date(item.date + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })} · {item.startTime} — {item.endTime}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-11" onClick={() => setUnavailableInfo(null)}>
                  Entendi
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
