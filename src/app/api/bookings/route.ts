import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { CreateBookingUseCase } from '@/usecases/bookings/CreateBookingUseCase'
import { PrismaBookingRepository } from '@/infrastructure/repositories/PrismaBookingRepository'
import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PrismaPaymentRepository'
import { AppError } from '@/core/errors/AppError'
import { emitToRoom } from '@/lib/socket-server'

const createSchema = z.object({
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD']),
  paymentToken: z.string().optional(),
  cardBrand: z.string().optional(),
  sport: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || !session.user.email || !session.user.id) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ message: 'Dados inválidos', errors: result.error.flatten() }, { status: 400 })
  }

  try {
    const useCase = new CreateBookingUseCase(
      new PrismaBookingRepository(),
      new PrismaCourtRepository(),
      new PrismaPaymentRepository()
    )
    const output = await useCase.execute({
      ...result.data,
      userId: session.user.id,
      userEmail: session.user.email
    })

    // Notifica admin em tempo real sobre novo agendamento
    emitToRoom('admin', 'booking:new', {
      courtId: result.data.courtId,
      date: result.data.date,
      startTime: result.data.startTime,
      userName: session.user.name,
    })

    return NextResponse.json(output, { status: 201 })
  } catch (e: any) {
    if (e instanceof AppError) return NextResponse.json({ message: e.message, code: e.code }, { status: e.statusCode })
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const repo = new PrismaBookingRepository()
  const result = await repo.findOrdersForAdmin({
    status: searchParams.get('status') as any,
    courtId: searchParams.get('courtId') ?? undefined,
    date: searchParams.get('date') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  })

  return NextResponse.json(result)
}
