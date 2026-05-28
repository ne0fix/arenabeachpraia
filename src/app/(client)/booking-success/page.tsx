'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Calendar, Clock, Share2, Home, XCircle, AlertTriangle, Loader2, QrCode, Copy, Check, ShoppingCart } from 'lucide-react'
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
  const cart = useBookingCart()

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
  if (booking.status === 'CANCELLED' && booking.cancelReason === 'SLOT_CONFLICT') {
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
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-[300px] mx-auto">
            Outro cliente confirmou este horário ao mesmo tempo que você. O seu pagamento será
            <strong> estornado automaticamente</strong> em até 5 dias úteis.
          </p>
        </div>

        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="font-headline text-xs text-amber-800 leading-relaxed">
            Escolha outro horário disponível para completar sua reserva.
            Se o estorno não aparecer em 5 dias úteis, entre em contato com nosso suporte.
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
        )}

        <Button variant="outline" className="w-full h-12" onClick={() => router.push('/')}>
          <Home className="w-5 h-5 mr-2" /> Ir para o Início
        </Button>
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
