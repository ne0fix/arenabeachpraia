import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { prisma } from '@/infrastructure/database/prisma'
import { CancelBookingUseCase } from '@/usecases/bookings/CancelBookingUseCase'
import { PrismaBookingRepository } from '@/infrastructure/repositories/PrismaBookingRepository'
import { PrismaPaymentRepository } from '@/infrastructure/repositories/PrismaPaymentRepository'
import { emitToRoom } from '@/lib/socket-server'

const schema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(3).default('Cancelado pelo administrador'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
  }

  const { orderId, reason } = result.data

  // Busca todos os bookings ativos do pedido
  const activeBookings = await prisma.booking.findMany({
    where: { orderId, status: { in: ['PENDING', 'CONFIRMED'] } },
    include: { payment: true },
  })

  if (activeBookings.length === 0) {
    return NextResponse.json({ message: 'Nenhum agendamento ativo neste pedido' }, { status: 404 })
  }

  const useCase = new CancelBookingUseCase(
    new PrismaBookingRepository(),
    new PrismaPaymentRepository(),
  )

  const results: { id: string; refunded: boolean; error?: string }[] = []

  for (const booking of activeBookings) {
    const shouldRefund = booking.payment?.status === 'APPROVED'
    try {
      await useCase.execute({
        bookingId: booking.id,
        cancelledBy: session.user.id!,
        reason,
        refund: shouldRefund,
        isAdmin: true,
      })
      results.push({ id: booking.id, refunded: shouldRefund })
    } catch (e: any) {
      results.push({ id: booking.id, refunded: false, error: e?.message ?? 'Erro' })
    }
  }

  emitToRoom('admin', 'data:changed', { type: 'order_cancelled', orderId })

  const errors = results.filter((r) => r.error)
  if (errors.length > 0) {
    return NextResponse.json({
      message: `${results.length - errors.length} cancelados, ${errors.length} com erro`,
      results,
    }, { status: 207 })
  }

  return NextResponse.json({ cancelled: results.length, results })
}
