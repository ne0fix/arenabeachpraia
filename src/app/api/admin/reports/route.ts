import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { format } from 'date-fns'
import { formatCurrency } from '@/core/utils/formatCurrency'

const PENDING_REFUND_FLAG = 'PENDING_MANUAL_REFUND'

function isConfirmedRevenue(payment: { status: string; refundReason: string | null } | null | undefined): boolean {
  if (!payment) return false
  if (payment.status !== 'APPROVED') return false
  return !(payment.refundReason?.startsWith(PENDING_REFUND_FLAG) ?? false)
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') ?? format(new Date(), 'yyyy-MM-01')
  const endDate = searchParams.get('endDate') ?? format(new Date(), 'yyyy-MM-dd')
  const courtId = searchParams.get('courtId') ?? undefined
  const outputFormat = searchParams.get('format') ?? 'json'

  const periodStart = new Date(startDate + 'T00:00:00')
  const periodEnd = new Date(endDate + 'T23:59:59')

  const bookings = await prisma.booking.findMany({
    where: {
      // Inclui reservas cujo JOGO ocorre no período (ocupação) OU cujo PAGAMENTO
      // foi confirmado no período (receita). Sem o segundo critério, um pagamento
      // feito hoje para um jogo futuro não apareceria no relatório financeiro.
      OR: [
        { date: { gte: periodStart, lte: periodEnd } },
        { payment: { is: { paidAt: { gte: periodStart, lte: periodEnd } } } },
      ],
      ...(courtId ? { courtId } : {}),
    },
    include: {
      court: { select: { name: true, location: true } },
      user: { select: { name: true, email: true } },
      payment: { select: { method: true, status: true, amount: true, refundAmount: true, refundReason: true, paidAt: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  if (outputFormat === 'csv') {
    const header = 'Data,Quadra,Cliente,Horário,Valor,Status,Pagamento,Observação'
    const rows = bookings.map((b) => {
      const isPendingRefund = b.payment?.refundReason?.startsWith(PENDING_REFUND_FLAG) ?? false
      return [
        format(new Date(b.date), 'dd/MM/yyyy'),
        b.court.name,
        b.user.name,
        b.startTime,
        formatCurrency(Number(b.payment?.amount ?? b.totalValue)),
        b.status,
        b.payment?.method ?? '—',
        isPendingRefund ? 'Aguardando estorno manual' : '',
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-${startDate}-${endDate}.csv"`,
      },
    })
  }

  // Receita real: apenas APPROVED que não estão aguardando estorno manual
  const totalRevenue = bookings
    .filter((b) => isConfirmedRevenue(b.payment))
    .reduce((sum, b) => sum + Number(b.payment!.amount), 0)

  const pendingManualRefundAmount = bookings
    .filter((b) => b.payment?.status === 'APPROVED' && (b.payment?.refundReason?.startsWith(PENDING_REFUND_FLAG) ?? false))
    .reduce((sum, b) => sum + Number(b.payment!.amount), 0)

  const refundedAmount = bookings
    .filter((b) => ['REFUNDED', 'PARTIAL_REFUND'].includes(b.payment?.status ?? ''))
    .reduce((sum, b) => sum + Number(b.payment?.refundAmount ?? 0), 0)

  const dayMap: Record<string, { label: string; revenue: number; refunds: number }> = {}
  const ensureDay = (d: string) => {
    if (!dayMap[d]) dayMap[d] = { label: d, revenue: 0, refunds: 0 }
    return dayMap[d]
  }
  bookings.forEach((b) => {
    // Receita lançada na data do pagamento (paidAt); cai para a data do jogo se ausente
    if (isConfirmedRevenue(b.payment)) {
      const paidDate = b.payment?.paidAt ? new Date(b.payment.paidAt) : new Date(b.date)
      ensureDay(format(paidDate, 'dd/MM')).revenue += Number(b.payment!.amount)
    }
    if (['REFUNDED', 'PARTIAL_REFUND'].includes(b.payment?.status ?? '')) {
      ensureDay(format(new Date(b.date), 'dd/MM')).refunds += Number(b.payment?.refundAmount ?? 0)
    }
  })

  return NextResponse.json({
    bookings,
    summary: {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
      totalRevenue,
      pendingManualRefundAmount,
      refundedAmount,
      netRevenue: totalRevenue - refundedAmount,
    },
    chartData: Object.values(dayMap),
  })
}
