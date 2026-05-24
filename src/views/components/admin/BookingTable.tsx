'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, XCircle, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/views/components/ui/Badge'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { CancellationModal } from './CancellationModal'
import { RefundModal } from './RefundModal'
import type { BookingWithDetails } from '@/models/entities/Booking'

interface BookingTableProps {
  bookings: BookingWithDetails[]
  isLoading?: boolean
}

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

const paymentLabel: Record<string, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão',
  DEBIT_CARD: 'Débito',
}

export function BookingTable({ bookings, isLoading }: BookingTableProps) {
  const [cancelModal, setCancelModal] = useState<BookingWithDetails | null>(null)
  const [refundModal, setRefundModal] = useState<BookingWithDetails | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-surface-container animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/30">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant/30">
              {['Cliente', 'Quadra', 'Data', 'Horário', 'Valor', 'Status', 'Pagamento', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-headline text-[10px] text-on-surface-variant uppercase tracking-widest font-bold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center font-headline text-on-surface-variant">
                  Nenhum agendamento encontrado
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-headline text-sm text-on-surface font-bold">{b.user.name}</p>
                    <p className="font-headline text-xs text-on-surface-variant">{b.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-headline text-sm text-on-surface">{b.court.name}</td>
                  <td className="px-4 py-3 font-headline text-sm text-on-surface whitespace-nowrap">
                    {format(new Date(String(b.date).slice(0, 10) + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 font-headline text-sm text-on-surface">{b.startTime}</td>
                  <td className="px-4 py-3 font-headline text-sm text-primary font-bold whitespace-nowrap">
                    {formatCurrency(b.totalValue)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[b.status]}>{statusLabel[b.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 font-headline text-xs text-on-surface-variant">
                    {b.payment ? paymentLabel[b.payment.method] : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {['CONFIRMED', 'PENDING'].includes(b.status) && (
                        <button
                          onClick={() => setCancelModal(b)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-on-surface-variant hover:text-red-600"
                          title="Cancelar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {b.status === 'CANCELLED' && b.payment?.status === 'APPROVED' && (
                        <button
                          onClick={() => setRefundModal(b)}
                          className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors text-on-surface-variant hover:text-amber-600"
                          title="Estornar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cancelModal && (
        <CancellationModal
          booking={cancelModal}
          open={!!cancelModal}
          onClose={() => setCancelModal(null)}
        />
      )}
      {refundModal && refundModal.payment && (
        <RefundModal
          bookingId={refundModal.id}
          maxAmount={refundModal.payment.amount}
          open={!!refundModal}
          onClose={() => setRefundModal(null)}
        />
      )}
    </>
  )
}
