import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { prisma } from '@/infrastructure/database/prisma'
import { emitToRoom } from '@/lib/socket-server'

const schema = z.object({ orderId: z.string().min(1) })

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

  const { orderId } = result.data

  try {
    // Confirma todos os bookings PENDING do pedido
    const { count: bookingsConfirmed } = await prisma.booking.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    })

    // Aprova os pagamentos PENDING associados ao pedido
    const bookingIds = await prisma.booking.findMany({
      where: { orderId },
      select: { id: true },
    }).then((bs) => bs.map((b) => b.id))

    const { count: paymentsApproved } = await prisma.payment.updateMany({
      where: {
        bookingId: { in: bookingIds },
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: 'APPROVED',
        paidAt: new Date(),
        gatewayStatus: 'manual_approval',
      },
    })

    emitToRoom('admin', 'data:changed', { type: 'order_confirmed', orderId })

    return NextResponse.json({ bookingsConfirmed, paymentsApproved })
  } catch (e: any) {
    console.error('[confirm order]', e)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
