import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaBookingRepository } from '@/infrastructure/repositories/PrismaBookingRepository'
import { reconcilePaymentByResourceId } from '@/services/paymentReconciliation'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const repo = new PrismaBookingRepository()
  let booking = await repo.findById(id)

  if (!booking) return NextResponse.json({ message: 'Não encontrado' }, { status: 404 })

  const isOwner = booking.userId === session.user.id
  const isAdmin = ['MANAGER', 'ADMIN'].includes(session.user.role)
  if (!isOwner && !isAdmin) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })

  // Reconciliação ativa: se a reserva ainda está PENDING e há um pagamento com
  // gatewayId, consulta o Mercado Pago diretamente. Garante a confirmação mesmo
  // que o webhook não tenha sido entregue (notification_url, HMAC, timeout etc).
  if (booking.status === 'PENDING' && booking.payment?.gatewayId) {
    try {
      const changed = await reconcilePaymentByResourceId(booking.payment.gatewayId)
      if (changed) {
        const refreshed = await repo.findById(id)
        if (refreshed) booking = refreshed
      }
    } catch (e) {
      console.error('Polling: erro ao reconciliar pagamento', e)
    }
  }

  return NextResponse.json(booking)
}
