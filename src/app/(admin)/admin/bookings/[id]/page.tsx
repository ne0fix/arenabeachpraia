'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Clock, MapPin, User, CreditCard, XCircle, RotateCcw, ReceiptText } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/views/components/ui/Button'
import { Badge } from '@/views/components/ui/Badge'
import { CancellationModal } from '@/views/components/admin/CancellationModal'
import { RefundModal } from '@/views/components/admin/RefundModal'
import { formatCurrency } from '@/core/utils/formatCurrency'
import type { BookingWithDetails } from '@/models/entities/Booking'

const statusVariant: Record<string, any> = {
  CONFIRMED: 'success',
  PENDING: 'warning',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  COMPLETED: 'info',
}

const statusLabel: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
  COMPLETED: 'Realizado',
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [showCancel, setShowCancel] = useState(false)
  const [showRefund, setShowRefund] = useState(false)

  const { data: booking, isLoading } = useQuery<BookingWithDetails>({
    queryKey: ['booking', id],
    queryFn: () => fetch(`/api/bookings/${id}`).then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface-container animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!booking) return <div className="p-8 text-center font-headline">Agendamento não encontrado.</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-container rounded-full transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
        </button>
        <div>
          <h1 className="font-headline text-2xl text-on-surface font-bold">Detalhe do Agendamento</h1>
          <p className="font-headline text-xs text-on-surface-variant uppercase tracking-wider">
            #{booking.accessCode}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sun-shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-lg text-on-surface font-bold">Agendamento</h2>
            <Badge variant={statusVariant[booking.status]}>{statusLabel[booking.status]}</Badge>
          </div>

          {[
            { icon: MapPin, label: 'Quadra', value: booking.court.name },
            { icon: Calendar, label: 'Data', value: format(new Date(String(booking.date).slice(0, 10) + 'T12:00:00'), "EEEE, dd 'de' MMMM yyyy", { locale: ptBR }) },
            { icon: Clock, label: 'Horário', value: `${booking.startTime} – ${booking.endTime}` },
          ].map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <div className="p-2 bg-surface-container rounded-xl">
                <row.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  {row.label}
                </p>
                <p className="font-headline text-sm text-on-surface font-bold">{row.value}</p>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-outline-variant/20">
            <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">
              Valor Total
            </p>
            <p className="font-headline text-2xl text-primary font-black mb-4">
              {formatCurrency(booking.totalValue)}
            </p>

            {['CONFIRMED', 'PENDING'].includes(booking.status) && (
              <div className="grid grid-cols-2 gap-2">
                {booking.payment?.status === 'APPROVED' && (
                  <button
                    onClick={() => setShowRefund(true)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-headline text-xs font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Estorno
                  </button>
                )}
                <button
                  onClick={() => setShowCancel(true)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-headline text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors ${booking.payment?.status !== 'APPROVED' ? 'col-span-2' : ''}`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sun-shadow">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-headline text-lg text-on-surface font-bold">Cliente</h2>
            </div>
            <p className="font-headline text-sm text-on-surface font-bold mb-1">{booking.user.name}</p>
            <p className="font-headline text-xs text-on-surface-variant">{booking.user.email}</p>
            {booking.user.phone && (
              <p className="font-headline text-xs text-on-surface-variant">{booking.user.phone}</p>
            )}
          </div>

          {booking.payment && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sun-shadow">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="font-headline text-lg text-on-surface font-bold">Pagamento</h2>
              </div>
              {[
                { label: 'Método', value: booking.payment.method === 'PIX' ? 'Pix' : booking.payment.method === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Débito' },
                { label: 'Status', value: booking.payment.status },
                { label: 'Valor', value: formatCurrency(booking.payment.amount) },
                ...(booking.payment.paidAt ? [{ label: 'Pago em', value: format(new Date(booking.payment.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) }] : []),
                ...(booking.payment.refundedAt ? [{ label: 'Estornado em', value: format(new Date(booking.payment.refundedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) }] : []),
                ...(booking.payment.refundAmount ? [{ label: 'Valor estornado', value: formatCurrency(booking.payment.refundAmount) }] : []),
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2 border-b border-outline-variant/10 last:border-0">
                  <span className="font-headline text-xs text-on-surface-variant uppercase font-bold">{row.label}</span>
                  <span className="font-headline text-sm text-on-surface font-bold">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {booking.cancelReason && (() => {
        const isPendingManualRefund = booking.cancelReason === 'SLOT_TAKEN_BY_OTHER'
        const reasonLabel: Record<string, string> = {
          SLOT_CONFLICT: 'Conflito de horário (estorno automático)',
          SLOT_TAKEN_BY_OTHER: 'Slot tomado por outro cliente — ESTORNO MANUAL PENDENTE',
          PAYMENT_FAILED: 'Falha no pagamento',
          PIX_EXPIRED: 'PIX expirou sem pagamento',
          PAYMENT_CANCELLED: 'Pagamento cancelado',
          REFUNDED: 'Cancelado após estorno',
        }
        const display = reasonLabel[booking.cancelReason] ?? booking.cancelReason
        return (
          <div className={isPendingManualRefund
            ? "bg-amber-50 border-2 border-amber-300 rounded-2xl p-4"
            : "bg-red-50 border border-red-200 rounded-2xl p-4"
          }>
            <p className={isPendingManualRefund
              ? "font-headline text-xs text-amber-700 font-bold uppercase mb-1"
              : "font-headline text-xs text-red-600 font-bold uppercase mb-1"
            }>Motivo do Cancelamento</p>
            <p className={isPendingManualRefund ? "text-sm text-amber-800 font-bold" : "text-sm text-red-700"}>
              {display}
            </p>
            {isPendingManualRefund && booking.payment?.status === 'APPROVED' && (
              <p className="text-xs text-amber-700 mt-2">
                Cliente pagou após outro confirmar o slot. Use o botão Estorno para processar o reembolso no MercadoPago.
              </p>
            )}
          </div>
        )
      })()}

      {showCancel && (
        <CancellationModal booking={booking} open={showCancel} onClose={() => setShowCancel(false)} />
      )}
      {showRefund && booking.payment && (
        <RefundModal
          bookingId={booking.id}
          maxAmount={booking.payment.amount}
          open={showRefund}
          onClose={() => setShowRefund(false)}
        />
      )}
    </div>
  )
}
