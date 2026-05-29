import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'

export async function GET() {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const repo = new PrismaCourtRepository()
  const courts = await repo.findAll({ isActive: undefined })
  return NextResponse.json(courts)
}

const createCourtSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['REGULAR', 'EXCLUSIVE']).default('REGULAR'),
  location: z.string().min(1),
  maxPlayers: z.number().int().min(1).max(20),
  pricePerHour: z.number().min(0),
  slotDuration: z.number().int().min(30).max(120).default(60),
  morningEnabled: z.boolean().default(true),
  morningOpen: z.string().regex(/^\d{2}:\d{2}$/).default('06:00'),
  morningClose: z.string().regex(/^\d{2}:\d{2}$/).default('12:00'),
  afternoonEnabled: z.boolean().default(true),
  afternoonOpen: z.string().regex(/^\d{2}:\d{2}$/).default('13:00'),
  afternoonClose: z.string().regex(/^\d{2}:\d{2}$/).default('22:00'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const result = createCourtSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Dados inválidos', errors: result.error.flatten() }, { status: 400 })
  }

  const repo = new PrismaCourtRepository()
  const court = await repo.create({
    ...result.data,
    pricePerHour: result.data.pricePerHour as any,
    imageUrl: null,
    images: [],
    amenities: [],
    isActive: true,
    showCapacity: true,
    courtWhatsapp: '',
    openTime: result.data.morningOpen,
    closeTime: result.data.afternoonClose,
    sports: [],
  })

  return NextResponse.json(court, { status: 201 })
}
