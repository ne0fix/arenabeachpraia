'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { Eye, XCircle, RotateCcw, ChevronRight, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/views/components/ui/Badge'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { CancellationModal } from './CancellationModal'
import { RefundModal } from './RefundModal'
import type { AdminOrder, BookingWithDetails } from '@/models/entities/Booking'

interface BookingTableProps {
  orders: AdminOrder[]
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

function fmtDate(d: BookingWithDetails['date']) {
  return format(new Date(String(d).slice(0, 10) + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })
}

export function BookingTable({ orders, isLoading }: BookingTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [cancelModal, setCancelModal] = useState<BookingWithDetails | null>(null)
  const [refundModal, setRefundModal] = useState<BookingWithDetails | null>(null)

  const toggle = (orderId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(orderId) ? next.delete(orderId) : next.add(orderId)
      return next
    })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-surface-container animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  // Ações de um horário individual (reusado na linha simples e na expansão)
  const bookingActions = (b: BookingWithDetails) => (
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
  )

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/30">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant/30">
              {['Cliente', 'Quadra', 'Pedido', 'Valor', 'Status', 'Pagamento', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-headline text-[10px] text-on-surface-variant uppercase tracking-widest font-bold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center font-headline text-on-surface-variant">
                  Nenhum agendamento encontrado
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const multi = order.bookings.length > 1
                const isOpen = expanded.has(order.orderId)
                const single = order.bookings[0]

                return (
                  <Fragment key={order.orderId}>
                    {/* Linha do pedido */}
                    <tr
                      className={`hover:bg-surface-container/50 transition-colors ${multi ? 'cursor-pointer' : ''}`}
                      onClick={multi ? () => toggle(order.orderId) : undefined}
                    >
                      <td className="px-4 py-3">
                        <p className="font-headline text-sm text-on-surface font-bold">{order.user.name}</p>
                        <p className="font-headline text-xs text-on-surface-variant">{order.user.email}</p>
                      </td>
                      <td className="px-4 py-3 font-headline text-sm text-on-surface">
                        {order.courtNames.length === 1 ? order.courtNames[0] : `${order.courtNames.length} quadras`}
                      </td>
                      <td className="px-4 py-3 font-headline text-sm text-on-surface whitespace-nowrap">
                        {multi ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {order.bookings.length} horários
                          </span>
                        ) : (
                          <span>{fmtDate(single.date)} · {single.startTime}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-headline text-sm text-primary font-bold whitespace-nowrap">
                        {formatCurrency(order.totalValue)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 font-headline text-xs text-on-surface-variant">
                        {order.paymentMethod ? paymentLabel[order.paymentMethod] : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {multi ? (
                          <button
                            onClick={() => toggle(order.orderId)}
                            className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
                            title={isOpen ? 'Recolher' : 'Ver horários'}
                          >
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : (
                          bookingActions(single)
                        )}
                      </td>
                    </tr>

                    {/* Horários do pedido (expandido) */}
                    {multi && isOpen && order.bookings.map((b) => (
                      <tr key={b.id} className="bg-surface-container/30">
                        <td className="px-4 py-2 pl-10" colSpan={2}>
                          <span className="font-headline text-xs text-on-surface-variant">{b.court.name}</span>
                        </td>
                        <td className="px-4 py-2 font-headline text-sm text-on-surface whitespace-nowrap">
                          {fmtDate(b.date)} · {b.startTime}–{b.endTime}
                        </td>
                        <td className="px-4 py-2 font-headline text-sm text-on-surface whitespace-nowrap">
                          {formatCurrency(Number(b.payment?.amount ?? b.totalValue))}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={statusVariant[b.status]}>{statusLabel[b.status]}</Badge>
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">{bookingActions(b)}</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })
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
