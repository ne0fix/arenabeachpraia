'use client'

import { useState } from 'react'
import { ArrowLeft, Calendar, Plus, Clock, X, CheckCircle, Clock3, XCircle, QrCode, Copy, Check, Share2, MapPin, CreditCard, Banknote } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/views/components/ui/Button'
import { Loader } from '@/views/components/ui/Loader'
import { BookingCard } from '@/views/components/business/BookingCard'
import { useMyBookingsViewModel } from '@/viewmodels/client/useMyBookingsViewModel'
import { cn } from '@/core/utils/helpers'
import { formatCurrency } from '@/core/utils/formatCurrency'
import type { BookingWithDetails, BookingStatus } from '@/models/entities/Booking'

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'past', label: 'Passadas' },
  { key: 'cancelled', label: 'Canceladas' },
] as const

const STATUS_CONFIG: Record<BookingStatus, { icon: any; label: string; color: string; bg: string }> = {
  CONFIRMED: { icon: CheckCircle, label: 'Confirmada', color: 'text-green-700', bg: 'bg-green-100' },
  PENDING:   { icon: Clock3,      label: 'Aguardando pagamento', color: 'text-amber-700', bg: 'bg-amber-100' },
  CANCELLED: { icon: XCircle,     label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-100' },
  NO_SHOW:   { icon: XCircle,     label: 'Não compareceu', color: 'text-red-700', bg: 'bg-red-100' },
  COMPLETED: { icon: CheckCircle, label: 'Realizado', color: 'text-blue-700', bg: 'bg-blue-100' },
}

const METHOD_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
}

function BookingDetailModal({ booking, onClose, onCancel }: {
  booking: BookingWithDetails
  onClose: () => void
  onCancel: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const status = STATUS_CONFIG[booking.status]
  const StatusIcon = status.icon
  const bookingDate = new Date((booking.date as any).toString().slice(0, 10) + 'T12:00:00')
  const pixQrCode = (booking as any).payment?.pixQrCode
  const pixQrCodeBase64 = (booking as any).payment?.pixQrCodeBase64

  const copyPix = () => {
    if (pixQrCode) {
      navigator.clipboard.writeText(pixQrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Minha Reserva — Arena Beach',
        text: `Reserva confirmada para ${booking.court?.name} em ${format(bookingDate, "dd/MM/yyyy")} às ${booking.startTime}${booking.accessCode ? ` — código: ${booking.accessCode}` : ''}`,
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
      >
        {/* Imagem do court */}
        <div className="relative h-36 flex-shrink-0">
          {booking.court?.imageUrl ? (
            <Image src={booking.court.imageUrl} alt={booking.court?.name ?? ''} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <span className="font-headline text-primary text-5xl font-black">{booking.court?.name?.[0]}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-4 right-12">
            <h2 className="font-headline text-white text-lg font-black leading-tight">{booking.court?.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Status */}
          <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl w-fit', status.bg)}>
            <StatusIcon className={cn('w-4 h-4', status.color)} />
            <span className={cn('font-headline text-xs font-bold', status.color)}>{status.label}</span>
          </div>

          {/* Info da reserva */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-outline-variant/20">
              <div className="p-4">
                <p className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Data</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-headline text-sm font-bold text-on-surface">
                    {format(bookingDate, "dd 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
                <p className="font-headline text-[10px] text-on-surface-variant mt-0.5">
                  {isToday(bookingDate) ? 'Hoje' : format(bookingDate, 'EEEE', { locale: ptBR })}
                </p>
              </div>
              <div className="p-4">
                <p className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Horário</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-headline text-sm font-bold text-on-surface">{booking.startTime}</span>
                </div>
                <p className="font-headline text-[10px] text-on-surface-variant mt-0.5">até {booking.endTime}</p>
              </div>
            </div>
            <div className="border-t border-outline-variant/20 grid grid-cols-2 divide-x divide-outline-variant/20">
              <div className="p-4">
                <p className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Valor</p>
                <span className="font-headline text-sm font-black text-primary">{formatCurrency(booking.totalValue)}</span>
              </div>
              <div className="p-4">
                <p className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Pagamento</p>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  <span className="font-headline text-xs font-bold text-on-surface">
                    {METHOD_LABEL[(booking as any).payment?.method] ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Código de acesso — apenas CONFIRMED */}
          {booking.status === 'CONFIRMED' && booking.accessCode && (
            <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl p-4 text-center">
              <p className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-2">
                Código de Acesso
              </p>
              <p className="font-headline text-2xl text-primary tracking-[0.25em] font-black uppercase">
                {booking.accessCode}
              </p>
              <p className="font-headline text-[10px] text-on-surface-variant mt-1">
                Apresente este código na arena
              </p>
            </div>
          )}

          {/* QR Code PIX — apenas PENDING */}
          {booking.status === 'PENDING' && pixQrCode && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2.5 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-white" />
                <span className="font-headline text-white font-bold text-sm">Pague via PIX</span>
              </div>
              <div className="p-4 flex flex-col items-center gap-3">
                {pixQrCodeBase64 && (
                  <div className="bg-white p-3 rounded-xl shadow">
                    <Image src={`data:image/png;base64,${pixQrCodeBase64}`} alt="QR Code" width={180} height={180} />
                  </div>
                )}
                <button
                  onClick={copyPix}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-headline text-sm font-bold transition-all',
                    copied ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
                  )}
                >
                  {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código PIX</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-6 pt-3 space-y-2 border-t border-outline-variant/20">
          {booking.status === 'CONFIRMED' && (
            <button
              onClick={share}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container text-on-surface font-headline text-sm font-bold hover:bg-outline-variant/20 transition-all"
            >
              <Share2 className="w-4 h-4" /> Compartilhar Reserva
            </button>
          )}
          {['CONFIRMED', 'PENDING'].includes(booking.status) && (
            <button
              onClick={() => { onCancel(booking.id); onClose() }}
              className="w-full flex items-center justify-center py-3 rounded-xl text-red-600 font-headline text-sm font-bold hover:bg-red-50 transition-all"
            >
              Cancelar Reserva
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function BookingsPage() {
  const router = useRouter()
  const vm = useMyBookingsViewModel()
  const [selected, setSelected] = useState<BookingWithDetails | null>(null)

  return (
    <>
      <header className="px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-container rounded-full transition-all active:scale-90"
        >
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h1 className="font-headline font-bold text-lg text-primary tracking-tight">Minhas Reservas</h1>
      </header>

      <main className="w-full px-6 pb-24 md:pb-12 max-w-4xl mx-auto overflow-x-hidden">
        <section className="mb-6 -mx-6 px-6">
          <div className="flex gap-2 overflow-x-auto pb-2 court-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => vm.setFilter(f.key)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full font-headline text-sm font-medium transition-all',
                  vm.filter === f.key
                    ? 'bg-primary text-white sun-shadow'
                    : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {vm.isLoading ? (
          <Loader />
        ) : vm.filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-on-surface-variant" />
            </div>
            <h3 className="font-headline text-xl text-on-surface font-bold mb-2">Nenhuma reserva</h3>
            <p className="text-on-surface-variant text-sm mb-6">Você ainda não fez nenhuma reserva.</p>
            <Button className="w-full" onClick={() => router.push('/')}>
              Agendar Agora
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {vm.filtered.map((booking, i) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <BookingCard
                  booking={booking}
                  onCancel={(id) => vm.cancelBooking(id)}
                  onClick={() => setSelected(booking)}
                />
              </motion.div>
            ))}
          </div>
        )}

        <section className="mt-8">
          <Button
            variant="outline"
            className="w-full"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => router.push('/')}
          >
            Nova Reserva
          </Button>
        </section>
      </main>

      <AnimatePresence>
        {selected && (
          <BookingDetailModal
            booking={selected}
            onClose={() => setSelected(null)}
            onCancel={(id) => { vm.cancelBooking(id); setSelected(null) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
