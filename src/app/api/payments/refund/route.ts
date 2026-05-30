import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { RefundPaymentUseCase } from '@/usecases/payments/RefundPaymentUseCase'
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PrismaPaymentRepository'
import { PrismaBookingRepository } from '@/infrastructure/repositories/PrismaBookingRepository'
import { AppError } from '@/core/errors/AppError'
import { emitToRoom } from '@/lib/socket-server'

const schema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().min(3),
  amount: z.number().positive().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ message: 'Dados inválidos', errors: result.error.flatten() }, { status: 400 })
  }

  try {
    const useCase = new RefundPaymentUseCase(
      new PrismaPaymentRepository(),
      new PrismaBookingRepository()
    )
    const output = await useCase.execute({ ...result.data, refundedBy: session.user.id })
    // Notifica o painel em tempo real para atualizar todas as telas
    emitToRoom('admin', 'data:changed', { type: 'payment_refunded', bookingId: result.data.bookingId })
    return NextResponse.json(output)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ message: e.message, code: e.code }, { status: e.statusCode })
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
