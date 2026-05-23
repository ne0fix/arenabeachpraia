import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns'

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

  const totalRevenue = payments
    .filter((p) => p.status === 'APPROVED')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const refundedAmount = payments
    .filter((p) => ['REFUNDED', 'PARTIAL_REFUND'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.refundAmount ?? 0), 0)

  const netRevenue = totalRevenue - refundedAmount

  const totalSlots = courts.length * 13
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

  const dayMap: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    const d = format(subDays(endDate, 6 - i), 'dd/MM')
    dayMap[d] = 0
  }
  bookings.forEach((b) => {
    const d = format(new Date(b.date), 'dd/MM')
    if (dayMap[d] !== undefined) dayMap[d]++
  })
  const bookingsByDay = Object.entries(dayMap).map(([day, count]) => ({ day, count }))

  return NextResponse.json({
    totalBookings,
    confirmedBookings,
    cancelledBookings,
    completedBookings,
    totalRevenue,
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
