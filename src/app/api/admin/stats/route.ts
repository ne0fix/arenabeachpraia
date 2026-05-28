import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, parse, addMinutes, differenceInMinutes } from 'date-fns'

const PENDING_REFUND_FLAG = 'PENDING_MANUAL_REFUND'

function isPendingManualRefund(p: { refundReason: string | null }): boolean {
  return p.refundReason?.startsWith(PENDING_REFUND_FLAG) ?? false
}

// Calcula slots disponíveis por dia para uma quadra (considera períodos manhã/tarde)
function slotsPerDay(court: {
  morningEnabled: boolean
  morningOpen: string
  morningClose: string
  afternoonEnabled: boolean
  afternoonOpen: string
  afternoonClose: string
  openTime: string
  closeTime: string
  slotDuration: number
}): number {
  const duration = court.slotDuration || 60
  let total = 0
  const periodSlots = (open: string, close: string) => {
    const start = parse(open, 'HH:mm', new Date())
    const end = parse(close, 'HH:mm', new Date())
    return Math.max(0, Math.floor(differenceInMinutes(end, start) / duration))
  }
  if (court.morningEnabled) total += periodSlots(court.morningOpen, court.morningClose)
  if (court.afternoonEnabled) total += periodSlots(court.afternoonOpen, court.afternoonClose)
  if (!court.morningEnabled && !court.afternoonEnabled) {
    total += periodSlots(court.openTime, court.closeTime)
  }
  return total
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'daily'
  const dateStr = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd')
  const baseDate = new Date(dateStr + 'T12:00:00')

  let startDate: Date
  let endDate: Date

  if (period === 'daily') {
    startDate = startOfDay(baseDate)
    endDate = endOfDay(baseDate)
  } else if (period === 'weekly') {
    startDate = startOfWeek(baseDate, { weekStartsOn: 1 })
    endDate = endOfWeek(baseDate, { weekStartsOn: 1 })
  } else {
    startDate = startOfMonth(baseDate)
    endDate = endOfMonth(baseDate)
  }

  const [bookings, payments, courts, recentBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { payment: true, court: { select: { id: true, name: true } } },
    }),
    prisma.payment.findMany({
      where: {
        booking: { date: { gte: startDate, lte: endDate } },
        status: { in: ['APPROVED', 'REFUNDED', 'PARTIAL_REFUND'] },
      },
      select: { status: true, amount: true, refundAmount: true, refundReason: true },
    }),
    prisma.court.findMany({ where: { isActive: true } }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        court: { select: { id: true, name: true } },
        user: { select: { name: true } },
        payment: { select: { status: true, amount: true } },
      },
    }),
  ])

  const totalBookings = bookings.length
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED').length
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED').length
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED').length

  // Receita exclui pagamentos pendentes de estorno manual
  const totalRevenue = payments
    .filter((p) => p.status === 'APPROVED' && !isPendingManualRefund(p))
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const pendingManualRefundAmount = payments
    .filter((p) => p.status === 'APPROVED' && isPendingManualRefund(p))
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const refundedAmount = payments
    .filter((p) => ['REFUNDED', 'PARTIAL_REFUND'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.refundAmount ?? 0), 0)

  const netRevenue = totalRevenue - refundedAmount

  // Ocupação real: soma de slots disponíveis em todas as quadras × dias do intervalo
  const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate })
  const totalSlots = courts.reduce(
    (sum, c) => sum + slotsPerDay(c) * daysInInterval.length,
    0
  )
  const occupancyRate = totalSlots > 0 ? (confirmedBookings / totalSlots) * 100 : 0

  const courtCounts: Record<string, { id: string; name: string; count: number }> = {}
  bookings.forEach((b) => {
    if (!courtCounts[b.courtId]) {
      courtCounts[b.courtId] = { id: b.courtId, name: b.court.name, count: 0 }
    }
    courtCounts[b.courtId].count++
  })
  const topCourt = Object.values(courtCounts).sort((a, b) => b.count - a.count)[0] ?? null

  const hourMap: Record<string, number> = {}
  for (let h = 6; h <= 21; h++) {
    hourMap[`${h.toString().padStart(2, '0')}:00`] = 0
  }
  bookings.forEach((b) => {
    const key = b.startTime
    if (hourMap[key] !== undefined) hourMap[key]++
  })
  const bookingsByHour = Object.entries(hourMap).map(([hour, count]) => ({ hour, count }))

  // Granularidade adaptada ao período: dia (semanal), dia do mês (mensal), hora (diário)
  let bookingsByDay: { day: string; count: number }[]
  if (period === 'daily') {
    // Já temos bookingsByHour — replica o gráfico em formato compatível
    bookingsByDay = bookingsByHour.map((h) => ({ day: h.hour, count: h.count }))
  } else {
    const dayMap: Record<string, number> = {}
    daysInInterval.forEach((d) => {
      dayMap[format(d, 'dd/MM')] = 0
    })
    bookings.forEach((b) => {
      const d = format(new Date(b.date), 'dd/MM')
      if (dayMap[d] !== undefined) dayMap[d]++
    })
    bookingsByDay = Object.entries(dayMap).map(([day, count]) => ({ day, count }))
  }

  return NextResponse.json({
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    completedBookings,
    totalRevenue,
    pendingManualRefundAmount,
    refundedAmount,
    netRevenue,
    occupancyRate,
    topCourt,
    bookingsByHour,
    bookingsByDay,
    bookingsByWeek: bookingsByDay,
    recentBookings,
  })
}
