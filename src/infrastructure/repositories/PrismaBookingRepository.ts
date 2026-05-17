import { prisma } from '@/infrastructure/database/prisma'
import type { IBookingRepository, ListBookingsFilter } from '@/repositories/IBookingRepository'
import type { Booking, BookingWithDetails } from '@/models/entities/Booking'

function toEntity(b: any): BookingWithDetails {
  return {
    ...b,
    totalValue: Number(b.totalValue),
    durationHours: Number(b.durationHours),
    court: b.court
      ? { ...b.court }
      : undefined,
    user: b.user
      ? { ...b.user }
      : undefined,
    payment: b.payment
      ? {
          ...b.payment,
          amount: Number(b.payment.amount),
          refundAmount: b.payment.refundAmount ? Number(b.payment.refundAmount) : null,
        }
      : null,
  }
}

const withDetails = {
  court: { select: { id: true, name: true, imageUrl: true, location: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
  payment: {
    select: {
      id: true,
      method: true,
      status: true,
      amount: true,
      gatewayId: true,
      paidAt: true,
      refundedAt: true,
      refundAmount: true,
    },
  },
}

export class PrismaBookingRepository implements IBookingRepository {
  async findById(id: string): Promise<BookingWithDetails | null> {
    const b = await prisma.booking.findUnique({ where: { id }, include: withDetails })
    return b ? toEntity(b) : null
  }

  async findAll(filter: ListBookingsFilter): Promise<{ bookings: BookingWithDetails[]; total: number }> {
    const { page = 1, limit = 20, status, courtId, userId, date, startDate, endDate } = filter
    const where: any = {}
    if (status) where.status = status
    if (courtId) where.courtId = courtId
    if (userId) where.userId = userId
    if (date) where.date = new Date(date + 'T00:00:00')
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate + 'T00:00:00'), lte: new Date(endDate + 'T23:59:59') }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: withDetails,
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ])

    return { bookings: bookings.map(toEntity), total }
  }

  async findByUser(userId: string, filter?: ListBookingsFilter): Promise<{ bookings: BookingWithDetails[]; total: number }> {
    return this.findAll({ ...filter, userId })
  }

  async checkAvailability(courtId: string, date: string, startTime: string, endTime: string): Promise<boolean> {
    // Apenas bookings CONFIRMED bloqueiam o slot. PENDING não reserva — o webhook
    // decide quem ganha quando dois pagamentos chegam ao mesmo tempo.
    const conflict = await prisma.booking.findFirst({
      where: {
        courtId,
        date: new Date(date + 'T00:00:00'),
        status: 'CONFIRMED',
        OR: [
          { startTime: { gte: startTime, lt: endTime } },
          { endTime: { gt: startTime, lte: endTime } },
          { startTime: { lte: startTime }, endTime: { gte: endTime } },
        ],
      },
    })
    return !conflict
  }

  async create(data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    const b = await prisma.booking.create({
      data: {
        ...data,
        date: data.date instanceof Date ? data.date : new Date(data.date + 'T00:00:00'),
        totalValue: data.totalValue,
        durationHours: data.durationHours,
        status: data.status as any,
      },
    })
    return { ...b, totalValue: Number(b.totalValue), durationHours: Number(b.durationHours) }
  }

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    const b = await prisma.booking.update({ where: { id }, data: data as any })
    return { ...b, totalValue: Number(b.totalValue), durationHours: Number(b.durationHours) }
  }
}
