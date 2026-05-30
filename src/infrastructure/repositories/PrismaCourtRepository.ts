import { prisma } from '@/infrastructure/database/prisma'
import type { ICourtRepository } from '@/repositories/ICourtRepository'
import type { Court, DayAvailability, TimeSlot } from '@/models/entities/Court'
import { addMinutes, format, parse } from 'date-fns'

function toEntity(c: any): Court {
  return {
    ...c,
    pricePerHour: Number(c.pricePerHour),
  }
}

export class PrismaCourtRepository implements ICourtRepository {
  async findAll(filters?: { isActive?: boolean | null; type?: string }): Promise<Court[]> {
    const where: Record<string, unknown> = {}
    // null = sem filtro (todas); undefined = apenas ativas (default)
    if (filters?.isActive === null) { /* sem filtro */ }
    else where.isActive = filters?.isActive ?? true
    if (filters?.type) where.type = filters.type

    const courts = await prisma.court.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    return courts.map(toEntity)
  }

  async findById(id: string): Promise<Court | null> {
    const court = await prisma.court.findUnique({ where: { id } })
    return court ? toEntity(court) : null
  }

  async getAvailability(courtId: string, date: string): Promise<DayAvailability> {
    const court = await prisma.court.findUnique({ where: { id: courtId } })
    if (!court) return { date, slots: [] }

    const dateObj = new Date(date + 'T00:00:00')

    const [bookings, unavailabilities] = await Promise.all([
      prisma.booking.findMany({
        where: {
          courtId,
          date: dateObj,
          status: 'CONFIRMED',
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.courtUnavailability.findMany({
        where: { courtId, date: dateObj },
      }),
    ])

    // Verifica bloqueios por período.
    // period ausente/null é tratado como ALL_DAY para retrocompatibilidade
    // com registros antigos e mocks de teste.
    const hasAllDay    = unavailabilities.some((u) => !(u as any).period || (u as any).period === 'ALL_DAY')
    const hasMorning   = unavailabilities.some((u) => (u as any).period === 'MORNING')
    const hasAfternoon = unavailabilities.some((u) => (u as any).period === 'AFTERNOON')

    if (hasAllDay) {
      return { date, slots: [], blockedPeriod: 'ALL_DAY' }
    }

    // Horário atual no Brasil (UTC-3) para filtrar slots já passados
    const now = new Date()
    const brazilDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now) // "YYYY-MM-DD"
    const brazilTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }).format(now).substring(0, 5) // "HH:MM"
    const isToday = date === brazilDate

    const slots: TimeSlot[] = []

    const generatePeriodSlots = (periodOpen: string, periodClose: string) => {
      const start = parse(periodOpen, 'HH:mm', new Date())
      const end = parse(periodClose, 'HH:mm', new Date())
      let current = start
      while (current < end) {
        const time = format(current, 'HH:mm')
        const slotEnd = addMinutes(current, court.slotDuration)
        // Se for hoje, ocultar slots cujo horário de início já passou
        if (isToday && time <= brazilTime) {
          current = slotEnd
          continue
        }
        const isBooked = bookings.some(
          (b) => b.startTime === time || (b.startTime < time && b.endTime > time)
        )
        slots.push({ time, available: !isBooked })
        current = slotEnd
      }
    }

    if (court.morningEnabled && !hasMorning) {
      generatePeriodSlots(court.morningOpen, court.morningClose)
    }
    if (court.afternoonEnabled && !hasAfternoon) {
      generatePeriodSlots(court.afternoonOpen, court.afternoonClose)
    }

    // fallback para quadras sem campos de período (dados legados)
    if (!court.morningEnabled && !court.afternoonEnabled) {
      generatePeriodSlots(court.openTime, court.closeTime)
    }

    const blockedPeriod = hasMorning && hasAfternoon ? 'ALL_DAY'
      : hasMorning ? 'MORNING'
      : hasAfternoon ? 'AFTERNOON'
      : undefined

    return { date, slots, blockedPeriod }
  }

  async create(data: Omit<Court, 'id' | 'createdAt' | 'updatedAt'>): Promise<Court> {
    const court = await prisma.court.create({ data: { ...data, type: data.type as any } })
    return toEntity(court)
  }

  async update(id: string, data: Partial<Court>): Promise<Court> {
    const court = await prisma.court.update({ where: { id }, data: data as any })
    return toEntity(court)
  }

  async delete(id: string): Promise<void> {
    await prisma.court.update({ where: { id }, data: { isActive: false } })
  }
}
