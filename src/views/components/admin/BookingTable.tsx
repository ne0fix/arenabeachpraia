'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, XCircle, RotateCcw, X, Hash, CreditCard, CheckCircle2, Clock, BadgeCheck, Trash2, Loader2, QrCode, Copy, Check, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
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

const paymentStatusLabel: Record<string, string> = {
  APPROVED: 'Pago / Confirmado',
  PENDING: 'Aguardando pagamento',
  PROCESSING: 'Processando',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Estornado',
  PARTIAL_REFUND: 'Estorno parcial',
  EXPIRED: 'Expirado',
}

function fmtDate(d: BookingWithDetails['date']) {
  return format(new Date(String(d).slice(0, 10) + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })
}

// ─── Painel PIX para admin ───────────────────────────────────────────────────
function PixPanel({
  pixQrCode, pixQrCodeBase64, expiresAt, waLink,
}: {
  pixQrCode: string
  pixQrCodeBase64: string | null
  expiresAt: string
  waLink: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(pixQrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-white" />
          <span className="font-headline text-white font-bold text-sm">PIX Aguardando Pagamento</span>
        </div>
        <span className="font-headline text-[10px] text-white/80 bg-white/20 px-2 py-0.5 rounded-full font-bold">
          Válido até {expiresAt}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* QR Code */}
        {pixQrCodeBase64 && (
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl shadow border border-green-100">
              <Image
                src={`data:image/png;base64,${pixQrCodeBase64}`}
                alt="QR Code PIX"
                width={160}
                height={160}
              />
            </div>
          </div>
        )}

        {/* Chave copia e cola */}
        <div className="bg-white border border-green-200 rounded-xl p-3">
          <p className="font-headline text-[9px] text-green-700 uppercase tracking-widest font-bold mb-1.5">
            PIX Copia e Cola
          </p>
          <p className="font-headline text-[10px] text-on-surface-variant break-all leading-relaxed line-clamp-3">
            {pixQrCode}
          </p>
        </div>

        {/* Botões */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copy}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-headline text-[11px] font-bold transition-all ${
              copied ? 'bg-green-600 text-white' : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Chave</>}
          </button>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366] text-white font-headline text-[11px] font-bold hover:bg-[#1ebe5b] transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Enviar WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de detalhes do pedido ────────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
  onCancel,
  onRefund,
  onConfirmOrder,
  onCancelOrder,
}: {
  order: AdminOrder
  onClose: () => void
  onCancel: (b: BookingWithDetails) => void
  onRefund: (b: BookingWithDetails) => void
  onConfirmOrder: (order: AdminOrder) => Promise<void>
  onCancelOrder: (order: AdminOrder) => Promise<void>
}) {
  const [confirmingOrder, setConfirmingOrder] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState(false)
  const [confirmCancelAll, setConfirmCancelAll] = useState(false)

  const paid = order.paymentStatus === 'APPROVED'
  const hasPartialRefund = order.paymentStatus === 'PARTIAL_REFUND'
  const refundedAmount = order.refundedAmount ?? 0
  const hasActiveBookings = order.bookings.some((b) => ['CONFIRMED', 'PENDING'].includes(b.status))
  const isPending = order.paymentStatus !== 'APPROVED' && hasActiveBookings

  // Pix pendente — dados computados uma única vez
  const isPixPending = order.paymentMethod === 'PIX' && order.paymentStatus === 'PENDING'
  const pixBooking = order.bookings.find(b => (b as any).payment?.pixQrCode)
  const pixQrCode = (pixBooking as any)?.payment?.pixQrCode as string | null
  const pixQrCodeBase64 = (pixBooking as any)?.payment?.pixQrCodeBase64 as string | null
  const pixExpiration = (pixBooking as any)?.payment?.pixExpiration as string | null
  const expiresAt = pixExpiration
    ? format(new Date(pixExpiration), "dd/MM 'às' HH:mm", { locale: ptBR })
    : '30 min'
  const activeBookings = order.bookings.filter(b => b.status !== 'CANCELLED')
  const slotLines = activeBookings.map(b => `• ${b.court.name} — ${fmtDate(b.date)} às ${b.startTime}`).join('\n')
  const pixTotal = formatCurrency(order.activeValue ?? order.totalValue)
  const waMsg = encodeURIComponent(
    `Olá ${order.user.name.split(' ')[0]}! 🏖️\n\n` +
    `Segue o código PIX para confirmar sua reserva na *Arena Beach Serra*:\n\n` +
    `${pixQrCode}\n\n` +
    `*Horários:*\n${slotLines}\n\n` +
    `*Total:* ${pixTotal}\n` +
    `*Válido até:* ${expiresAt}\n\n` +
    `Após o pagamento, sua reserva é confirmada automaticamente. ✅`
  )
  const phone = (order.user.phone ?? '').replace(/\D/g, '')
  const waLink = phone ? `https://wa.me/55${phone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`
  const showPixPanel = isPixPending && !!pixQrCode

  const handleConfirm = async () => {
    setConfirmingOrder(true)
    try { await onConfirmOrder(order) } finally { setConfirmingOrder(false) }
  }

  const handleCancelAll = async () => {
    if (!confirmCancelAll) { setConfirmCancelAll(true); return }
    setCancellingOrder(true)
    setConfirmCancelAll(false)
    try { await onCancelOrder(order) } finally { setCancellingOrder(false) }
  }

  // Bloco de resumo reutilizado nas duas variantes de layout
  const summaryGrid = (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-surface-container rounded-xl px-3 py-2.5">
        <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-1">
          <Hash className="w-3 h-3" /> Nº do Pedido
        </p>
        <p className="font-headline text-sm text-on-surface font-bold mt-0.5">{order.accessCode}</p>
      </div>
      <div className="bg-surface-container rounded-xl px-3 py-2.5">
        <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Pagamento
        </p>
        <p className="font-headline text-sm text-on-surface font-bold mt-0.5">
          {order.paymentMethod ? paymentLabel[order.paymentMethod] : '—'}
        </p>
      </div>
      <div className={`rounded-xl px-3 py-2.5 ${hasPartialRefund ? 'bg-amber-50 border border-amber-200' : 'bg-surface-container'}`}>
        <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-1">
          {paid ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : hasPartialRefund ? <CheckCircle2 className="w-3 h-3 text-amber-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
          Status
        </p>
        <p className={`font-headline text-sm font-bold mt-0.5 ${paid ? 'text-green-700' : hasPartialRefund ? 'text-amber-700' : 'text-amber-700'}`}>
          {order.paymentStatus ? (paymentStatusLabel[order.paymentStatus] ?? order.paymentStatus) : '—'}
        </p>
      </div>
      <div className="bg-surface-container rounded-xl px-3 py-2.5">
        <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
          {refundedAmount > 0 ? 'Valor Ativo' : 'Total'}
        </p>
        <p className="font-headline text-sm text-primary font-bold mt-0.5">
          {formatCurrency(order.activeValue ?? order.totalValue)}
        </p>
      </div>
    </div>
  )

  const refundRow = refundedAmount > 0 && (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
      <div>
        <p className="font-headline text-[10px] uppercase tracking-widest text-amber-700 font-bold">Valor Original</p>
        <p className="font-headline text-sm text-on-surface-variant line-through">{formatCurrency(order.totalValue)}</p>
      </div>
      <div className="text-right">
        <p className="font-headline text-[10px] uppercase tracking-widest text-amber-700 font-bold">Estornado</p>
        <p className="font-headline text-sm text-amber-700 font-bold">− {formatCurrency(refundedAmount)}</p>
      </div>
    </div>
  )

  const gatewayRow = order.gatewayId && (
    <p className="font-headline text-[10px] text-on-surface-variant">
      ID transação MP: <span className="font-bold">{order.gatewayId}</span>
    </p>
  )

  const slotsList = (
    <div className="space-y-2">
      <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
        {order.bookings.length} {order.bookings.length === 1 ? 'horário' : 'horários'}
      </p>
      {order.bookings.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-headline text-sm font-bold text-on-surface truncate">{b.court.name}</p>
            <p className="font-headline text-xs text-on-surface-variant">
              {fmtDate(b.date)} · {b.startTime}–{b.endTime} · {formatCurrency(Number(b.payment?.amount ?? b.totalValue))}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant={statusVariant[b.status]}>{statusLabel[b.status]}</Badge>
            <Link
              href={`/admin/bookings/${b.id}`}
              className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
              title="Abrir reserva"
            >
              <Eye className="w-4 h-4" />
            </Link>
            {['CONFIRMED', 'PENDING'].includes(b.status) && (
              <button
                onClick={() => onCancel(b)}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-on-surface-variant hover:text-red-600"
                title="Cancelar horário"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
            {b.status === 'CANCELLED' && b.payment?.status === 'APPROVED' && (
              <button
                onClick={() => onRefund(b)}
                className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors text-on-surface-variant hover:text-amber-600"
                title="Estornar"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const footer = (isPending || hasActiveBookings) && (
    <div className="border-t border-outline-variant/20 px-6 py-4 space-y-2">
      {isPending && (
        <button
          onClick={handleConfirm}
          disabled={confirmingOrder || cancellingOrder}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-headline text-sm font-bold hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {confirmingOrder
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
            : <><BadgeCheck className="w-4 h-4" /> Confirmar Pagamento Manualmente</>
          }
        </button>
      )}
      {hasActiveBookings && (
        confirmCancelAll ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
            <p className="font-headline text-xs text-red-700 font-bold text-center">
              Cancelar todos os horários{paid ? ' e estornar todos os valores' : ''}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancelAll(false)}
                className="flex-1 py-2 rounded-lg border border-outline-variant/40 font-headline text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all"
              >
                Não
              </button>
              <button
                onClick={handleCancelAll}
                disabled={cancellingOrder}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-headline text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {cancellingOrder ? 'Cancelando...' : 'Sim, cancelar tudo'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleCancelAll}
            disabled={confirmingOrder || cancellingOrder}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-headline text-sm font-bold hover:bg-red-100 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {cancellingOrder
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
              : <><Trash2 className="w-4 h-4" /> Cancelar Pedido{paid ? ' + Estornar Tudo' : ''}</>
            }
          </button>
        )
      )}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`bg-surface w-full ${showPixPanel ? 'max-w-2xl' : 'max-w-lg'} rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 flex-shrink-0">
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface">Pedido</h2>
            <p className="font-headline text-xs text-on-surface-variant">{order.user.name} · {order.user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-all">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {showPixPanel ? (
          /* ── Layout 2 colunas: info + horários | Pix QR ── */
          <div
            className="overflow-y-auto flex-1 px-6 py-5"
            onClick={(e) => { if (confirmCancelAll) { setConfirmCancelAll(false); e.stopPropagation() } }}
          >
            <div className="grid grid-cols-2 gap-5 items-start">
              {/* Coluna esquerda: resumo + horários */}
              <div className="space-y-4">
                {summaryGrid}
                {refundRow}
                {gatewayRow}
                {slotsList}
              </div>
              {/* Coluna direita: QR Code Pix */}
              <div className="sticky top-0">
                <PixPanel
                  pixQrCode={pixQrCode!}
                  pixQrCodeBase64={pixQrCodeBase64}
                  expiresAt={expiresAt}
                  waLink={waLink}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ── Layout coluna única: demais métodos ── */
          <div
            className="overflow-y-auto flex-1 px-6 py-5 space-y-5"
            onClick={(e) => { if (confirmCancelAll) { setConfirmCancelAll(false); e.stopPropagation() } }}
          >
            {summaryGrid}
            {refundRow}
            {gatewayRow}
            {slotsList}
          </div>
        )}

        {footer}
      </motion.div>
    </motion.div>
  )
}

// ─── Tabela de pedidos ───────────────────────────────────────────────────────

export function BookingTable({ orders, isLoading, onRefresh }: BookingTableProps & { onRefresh?: () => void }) {
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null)
  const [cancelModal, setCancelModal] = useState<BookingWithDetails | null>(null)
  const [refundModal, setRefundModal] = useState<BookingWithDetails | null>(null)

  // Mantém o modal de detalhes sincronizado com os dados recarregados após
  // cancelar/estornar — atualiza o pedido aberto sem precisar reabrir o modal.
  useEffect(() => {
    if (!detailOrder) return
    const updated = orders.find((o) => o.orderId === detailOrder.orderId)
    if (updated) {
      if (updated !== detailOrder) setDetailOrder(updated)
    } else {
      setDetailOrder(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  const handleConfirmOrder = async (order: AdminOrder) => {
    const res = await fetch('/api/admin/orders/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.orderId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.message ?? 'Erro ao confirmar pedido')
    }
    onRefresh?.()
  }

  const handleCancelOrder = async (order: AdminOrder) => {
    const res = await fetch('/api/admin/orders/cancel-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.orderId, reason: 'Cancelado pelo administrador' }),
    })
    if (!res.ok && res.status !== 207) {
      const err = await res.json().catch(() => ({}))
      alert(err.message ?? 'Erro ao cancelar pedido')
    }
    onRefresh?.()
  }

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
                const single = order.bookings[0]
                return (
                  <tr key={order.orderId} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-headline text-sm text-on-surface font-bold">{order.user.name}</p>
                      <p className="font-headline text-xs text-on-surface-variant">{order.user.email}</p>
                    </td>
                    <td className="px-4 py-3 font-headline text-sm text-on-surface">
                      {order.courtNames.length === 1 ? order.courtNames[0] : `${order.courtNames.length} quadras`}
                    </td>
                    <td className="px-4 py-3 font-headline text-sm text-on-surface whitespace-nowrap">
                      {multi ? (
                        <span className="font-bold text-primary">{order.bookings.length} horários</span>
                      ) : (
                        <span>{fmtDate(single.date)} · {single.startTime}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-headline text-sm font-bold whitespace-nowrap">
                      <span className="text-primary">{formatCurrency(order.activeValue ?? order.totalValue)}</span>
                      {(order.refundedAmount ?? 0) > 0 && (
                        <span className="block font-headline text-[9px] text-amber-600 font-bold">
                          − {formatCurrency(order.refundedAmount!)} est.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 font-headline text-xs text-on-surface-variant">
                      {order.paymentMethod ? paymentLabel[order.paymentMethod] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailOrder(order)}
                        className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
                        title="Ver detalhes do pedido"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {detailOrder && (
          <OrderDetailModal
            order={detailOrder}
            onClose={() => setDetailOrder(null)}
            onCancel={(b) => setCancelModal(b)}
            onRefund={(b) => setRefundModal(b)}
            onConfirmOrder={handleConfirmOrder}
            onCancelOrder={handleCancelOrder}
          />
        )}
      </AnimatePresence>

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
