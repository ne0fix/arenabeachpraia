import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { CancelBookingUseCase } from '@/usecases/bookings/CancelBookingUseCase'
import { PrismaBookingRepository } from '@/infrastructure/repositories/PrismaBookingRepository'
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PrismaPaymentRepository'
import { AppError } from '@/core/errors/AppError'
import { emitToRoom } from '@/lib/socket-server'

const schema = z.object({
  reason: z.string().min(3, 'Motivo muito curto'),
  refund: z.boolean().default(false),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ message: 'Dados inválidos', errors: result.error.flatten() }, { status: 400 })
  }

  try {
    const useCase = new CancelBookingUseCase(
      new PrismaBookingRepository(),
      new PrismaPaymentRepository()
    )
    const isAdmin = ['MANAGER', 'ADMIN'].includes(session.user.role)
    const output = await useCase.execute({
      bookingId: id,
      cancelledBy: session.user.id,
      reason: result.data.reason,
      refund: result.data.refund,
      isAdmin,
    })
    // Notifica o painel em tempo real para atualizar todas as telas
    emitToRoom('admin', 'data:changed', { type: 'booking_cancelled', bookingId: id })
    return NextResponse.json(output)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ message: e.message, code: e.code }, { status: e.statusCode })
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
