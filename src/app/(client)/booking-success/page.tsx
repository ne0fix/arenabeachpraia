'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Calendar, Clock, Share2, Home, XCircle, AlertTriangle, Loader2, QrCode, Copy, Check, ShoppingCart, ChevronRight, X } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { useState } from 'react'
import { useBookingCart } from '@/lib/useBookingCart'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'motion/react'
import Image from 'next/image'
import { Button } from '@/views/components/ui/Button'
import type { BookingWithDetails } from '@/models/entities/Booking'

function SuccessContent() {
  const params = useSearchParams()
  const router = useRouter()
  const bookingId = params.get('bookingId')
  const cartItemId = params.get('cartItemId')
  const batchIds = params.get('batchIds')?.split(',').filter(Boolean) ?? []
  const isBatch = batchIds.length > 1
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const cart = useBookingCart()

  // Em batch, busca todos os bookings para mostrar no modal de detalhes
  const { data: batchData } = useQuery<{ bookings: Array<{ id: string; date: string; startTime: string; endTime: string; status: string; court: { name: string }; payment: { amount: number } | null }> }>({
    queryKey: ['batch-bookings', batchIds.join(',')],
    queryFn: () => fetch(`/api/bookings/by-ids?ids=${batchIds.join(',')}`).then((r) => r.json()),
    enabled: isBatch,
    refetchInterval: 5000,
  })
  const batchBookings = batchData?.bookings ?? []
  const batchTotal = batchBookings.reduce((s, b) => s + Number(b.payment?.amount ?? 0), 0)

  const copyPix = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { data: booking, isLoading } = useQuery<BookingWithDetails>({
    queryKey: ['booking', bookingId],
    queryFn: () => fetch(`/api/bookings/${bookingId}`).then((r) => r.json()),
    enabled: !!bookingId,
    // Faz polling enquanto PENDING, para detectar confirmação ou conflito do webhook
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'PENDING') return 3000
      return false
    },
    refetchIntervalInBackground: false,
  })

  // Remove este item do carrinho quando a reserva for confirmada
  useEffect(() => {
    if (booking?.status === 'CONFIRMED' && cartItemId) {
      cart.removeItem(cartItemId)
    }
  }, [booking?.status, cartItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !booking) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="font-headline text-sm text-on-surface-variant">Verificando reserva...</p>
      </main>
    )
  }

  // ── Cancelado por conflito de horário ─────────────────────────────────────
  if (booking.status === 'CANCELLED' && (booking.cancelReason === 'SLOT_CONFLICT' || booking.cancelReason === 'SLOT_TAKEN_BY_OTHER')) {
    const isManualRefund = booking.cancelReason === 'SLOT_TAKEN_BY_OTHER'
    return (
      <main className="flex-1 w-full max-w-md mx-auto px-6 flex flex-col items-center justify-center pt-12 pb-24 md:py-12">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative mb-8">
          <div className="relative bg-surface-container-lowest sun-shadow w-24 h-24 rounded-full flex items-center justify-center border-4 border-surface-container">
            <XCircle className="w-12 h-12 text-red-500" fill="currentColor" />
          </div>
        </motion.div>

        <div className="text-center mb-8">
          <h1 className="font-headline text-2xl text-red-600 font-bold mb-3">
            Horário não disponível
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-[320px] mx-auto">
            {isManualRefund ? (
              <>
                Outro cliente confirmou o pagamento deste horário antes do seu. O valor pago será
                <strong> estornado pela nossa equipe</strong> em até 2 dias úteis.
              </>
            ) : (
              <>
                Outro cliente confirmou este horário ao mesmo tempo que você. O seu pagamento será
                <strong> estornado automaticamente</strong> em até 5 dias úteis.
              </>
            )}
          </p>
        </div>

        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="font-headline text-xs text-amber-800 leading-relaxed">
            {isManualRefund
              ? <>Você receberá uma notificação assim que o estorno for processado. Em caso de dúvidas, entre em contato com nosso suporte.</>
              : <>Escolha outro horário disponível para completar sua reserva. Se o estorno não aparecer em 5 dias úteis, entre em contato com nosso suporte.</>
            }
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button
            className="w-full h-12"
            onClick={() => router.push(`/booking/${booking.court.id}`)}
          >
            Escolher Outro Horário
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => router.push('/')}>
            <Home className="w-5 h-5 mr-2" /> Voltar ao Início
          </Button>
        </div>
      </main>
    )
  }

  // ── Aguardando confirmação do pagamento (PIX) ─────────────────────────────
  if (booking.status === 'PENDING') {
    const pixQrCode = (booking as any).payment?.pixQrCode
    const pixQrCodeBase64 = (booking as any).payment?.pixQrCodeBase64

    return (
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-8 pb-24 md:py-8 space-y-4">
        {/* Status */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="text-center">
            <h1 className="font-headline text-xl text-primary font-bold">Aguardando Pagamento PIX</h1>
            <p className="font-headline text-xs text-on-surface-variant mt-1">
              Esta tela atualiza automaticamente após o pagamento
            </p>
          </div>
        </div>

        {/* QR Code */}
        {(pixQrCode || pixQrCodeBase64) && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-white" />
              <span className="font-headline text-white font-bold text-sm">Escaneie o QR Code</span>
            </div>
            <div className="p-4 flex flex-col items-center gap-3">
              {pixQrCodeBase64 && (
                <div className="bg-white p-3 rounded-xl shadow border border-outline-variant/10">
                  <Image
                    src={`data:image/png;base64,${pixQrCodeBase64}`}
                    alt="QR Code Pix"
                    width={200}
                    height={200}
                    priority
                  />
                </div>
              )}
              {pixQrCode && (
                <>
                  <div className="w-full bg-surface-container rounded-lg px-3 py-2 border border-outline-variant/20">
                    <code className="font-headline text-[11px] text-on-surface-variant break-all line-clamp-2">{pixQrCode}</code>
                  </div>
                  <button
                    onClick={() => copyPix(pixQrCode)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-headline text-sm font-bold transition-all ${
                      copied ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código PIX</>}
                  </button>
                </>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-headline text-[11px] text-on-surface-variant">Válido por 30 minutos</span>
              </div>
            </div>
          </div>
        )}

        {/* Resumo da reserva */}
        {booking.court && (
          isBatch ? (
            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30">
              <p className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Reservas ({batchIds.length})
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-headline text-sm font-bold truncate">
                      {batchIds.length} horário{batchIds.length > 1 ? 's' : ''} · {formatCurrency(batchTotal)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-headline text-xs text-on-surface-variant">
                      Total a pagar com este PIX
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 text-primary font-headline text-xs font-bold hover:bg-primary/20 transition-colors whitespace-nowrap"
                >
                  Detalhes
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 space-y-2">
              <p className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Reserva</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-headline text-sm font-bold">{booking.court.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-headline text-sm">
                  {format(new Date((booking.date as any).toString().slice(0, 10) + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} às {booking.startTime}
                </span>
              </div>
            </div>
          )
        )}

        <Button variant="outline" className="w-full h-12" onClick={() => router.push('/')}>
          <Home className="w-5 h-5 mr-2" /> Ir para o Início
        </Button>

        {/* Modal de detalhes — só em batch */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 flex items-end md:items-center justify-center p-4"
              onClick={() => setShowDetails(false)}
            >
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-surface max-w-md w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cabeçalho */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/20">
                  <div>
                    <h2 className="font-headline text-base font-bold text-on-surface">Detalhes das Reservas</h2>
                    <p className="font-headline text-xs text-on-surface-variant">
                      {batchBookings.length} horário{batchBookings.length > 1 ? 's' : ''} neste pagamento
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-surface-container rounded-full transition-colors"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>

                {/* Lista de reservas */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {batchBookings.length === 0 ? (
                    <p className="font-headline text-sm text-on-surface-variant text-center py-8">Carregando…</p>
                  ) : (
                    batchBookings.map((b) => {
                      const dateStr = format(new Date(String(b.date).slice(0, 10) + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })
                      return (
                        <div key={b.id} className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="font-headline text-sm font-bold text-primary truncate">{b.court.name}</p>
                            <span className="font-headline text-sm font-bold text-primary whitespace-nowrap">
                              {formatCurrency(Number(b.payment?.amount ?? 0))}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{b.startTime} — {b.endTime}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Rodapé com total e botão fechar */}
                <div className="px-5 py-4 border-t border-outline-variant/20 bg-surface-container/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-headline text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Total a pagar
                    </span>
                    <span className="font-headline text-xl font-bold text-primary">
                      {formatCurrency(batchTotal)}
                    </span>
                  </div>
                  <Button className="w-full h-11" onClick={() => setShowDetails(false)}>
                    Fechar e continuar pagamento
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    )
  }

  // ── Confirmado ────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 flex flex-col items-center justify-center pt-12 pb-24 md:py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative mb-8">
        <div className="absolute inset-0 bg-secondary-container opacity-20 rounded-full scale-150 blur-3xl" />
        <div className="relative bg-surface-container-lowest sun-shadow w-24 h-24 rounded-full flex items-center justify-center border-4 border-surface-container">
          <CheckCircle className="w-12 h-12 text-primary" fill="currentColor" />
        </div>
      </motion.div>

      <div className="text-center mb-8">
        <h1 className="font-headline text-3xl text-primary font-bold mb-2">
          {isBatch ? 'Reservas Confirmadas!' : 'Reserva Confirmada!'}
        </h1>
        <p className="text-on-surface-variant max-w-[280px] mx-auto text-sm leading-relaxed">
          {isBatch
            ? `${batchIds.length} reservas confirmadas. Tudo pronto para os seus jogos!`
            : 'Tudo pronto para o seu jogo. A Arena Beach Serra te espera!'
          }
        </p>
      </div>

      {booking && (
        <div className="w-full bg-surface-container-lowest rounded-3xl p-6 sun-shadow border border-surface-container-high relative overflow-hidden mb-6">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-secondary-container p-3 rounded-2xl text-primary">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="font-headline text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                  Quadra
                </p>
                <p className="font-headline text-lg text-primary font-bold">{booking.court?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-surface-container pt-6">
              <div className="flex items-start gap-2">
                <Calendar className="w-5 h-5 text-primary-container" />
                <div>
                  <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold">Data</p>
                  <p className="font-headline text-sm font-bold text-on-surface">
                    {format(new Date((booking.date as any).toString().slice(0, 10) + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-primary-container" />
                <div>
                  <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold">Horário</p>
                  <p className="font-headline text-sm font-bold text-on-surface">{booking.startTime}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface rounded-full shadow-inner" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface rounded-full shadow-inner" />
        </div>
      )}

      {booking && (
        <div className="w-full flex flex-col items-center py-6 border-2 border-dashed border-outline-variant rounded-3xl bg-surface-container/30 mb-8">
          <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-2">
            Código de Acesso
          </p>
          <p className="font-headline text-2xl text-primary tracking-[0.2em] font-black uppercase">
            {booking.accessCode}
          </p>
        </div>
      )}

      <div className="w-full space-y-4">
        {/* Próximo item do carrinho — vai direto para o pagamento */}
        {cart.items.length > 0 && (() => {
          const next = cart.items[0]
          return (
            <Button
              className="w-full h-14 text-lg"
              leftIcon={<ShoppingCart className="w-6 h-6" />}
              onClick={() => router.push(`/payment?courtId=${next.courtId}&date=${next.date}&startTime=${next.startTime}&endTime=${next.endTime}&cartItemId=${next.id}`)}
            >
              Pagar próxima reserva ({cart.items.length} restante{cart.items.length !== 1 ? 's' : ''})
            </Button>
          )
        })()}

        <Button
          variant={cart.items.length > 0 ? 'outline' : 'primary'}
          className="w-full h-14 text-lg"
          leftIcon={<Home className="w-6 h-6" />}
          onClick={() => router.push('/')}
        >
          Voltar ao Início
        </Button>
        <Button
          variant="outline"
          className="w-full h-14 text-lg"
          leftIcon={<Share2 className="w-6 h-6" />}
          onClick={() => {
            if (navigator.share && booking) {
              navigator.share({
                title: 'Minha Reserva - Arena Beach',
                text: `Reserva confirmada para ${booking.court?.name} — código: ${booking.accessCode}`,
                url: window.location.href,
              })
            }
          }}
        >
          Compartilhar com Amigos
        </Button>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
