import { prisma } from '@/infrastructure/database/prisma'
import { MercadoPagoService } from '@/services/MercadoPagoService'

/**
 * Reconcilia o status de um pagamento do Mercado Pago com o banco de dados.
 *
 * É a fonte de verdade compartilhada entre:
 *   - o webhook (/api/payments/webhook), acionado pelo MP
 *   - o polling ativo (/api/bookings/[id]), acionado pela tela de pagamento
 *
 * Consulta o pagamento no MP pelo resourceId (= gatewayId armazenado),
 * confirma/cancela os bookings correspondentes e trata conflitos de horário.
 * Cobre tanto reservas únicas quanto batch (vários payments com o mesmo gatewayId).
 *
 * É idempotente: pagamentos já finalizados (APPROVED/REFUNDED/CANCELLED) são ignorados.
 *
 * @returns true se algum pagamento foi processado, false caso contrário.
 */
export async function reconcilePaymentByResourceId(
  resourceId: string | number,
  mpService?: MercadoPagoService
): Promise<boolean> {
  if (!resourceId) return false

  const mp = mpService ?? await MercadoPagoService.create()

  let mpData: any
  try {
    mpData = await mp.getPayment(String(resourceId))
  } catch (err: any) {
    console.error('Reconciliação: erro ao buscar pagamento MP:', err?.message ?? err)
    return false
  }

  if (!mpData) return false

  const externalReference = mpData.external_reference
  const mpStatus = mpData.status
  console.log('Reconciliação: MP status=', mpStatus, 'external_reference=', externalReference, 'resourceId=', resourceId)

  if (!externalReference) {
    console.warn('Reconciliação: external_reference ausente no pagamento MP', resourceId)
    return false
  }

  // Busca por gatewayId (cobre single e batch com o mesmo MP payment id)
  let payments = await prisma.payment.findMany({
    where: { gatewayId: String(resourceId) },
    include: { booking: true },
  })

  // Fallback: busca pelo externalReference (bookingId) para pagamentos antigos
  if (!payments.length) {
    const fallback = await prisma.payment.findFirst({
      where: { bookingId: externalReference },
      include: { booking: true },
    })
    if (fallback) payments = [fallback]
  }

  if (!payments.length) {
    console.warn('Reconciliação: nenhum payment encontrado para gatewayId=', resourceId, 'externalRef=', externalReference)
    return false
  }

  // Filtra apenas os não-finalizados
  const pending = payments.filter(p => !['APPROVED', 'REFUNDED', 'CANCELLED'].includes(p.status))
  if (!pending.length) {
    console.log('Reconciliação: todos os pagamentos já finalizados, ignorando')
    return false
  }

  if (['approved', 'processed', 'accredited'].includes(mpStatus)) {
    let totalRefunded = 0

    for (const payment of pending) {
      const booking = payment.booking
      if (!booking) continue

      // Reserva cancelada antes do pagamento
      if (booking.status === 'CANCELLED') {
        const refundAmt = Number(payment.amount)
        try {
          await mp.refundPayment(Number(resourceId), refundAmt)
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED', refundedAt: new Date(), refundReason: 'Reserva cancelada antes do pagamento', refundAmount: payment.amount },
          })
          totalRefunded += refundAmt
          console.log('Reconciliação: estorno de reserva cancelada, bookingId=', booking.id)
        } catch (err) {
          console.error('Reconciliação: falha no estorno de reserva cancelada:', err)
          await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CANCELLED' } })
        }
        continue
      }

      // Verifica conflito de horário
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: booking.id },
          courtId: booking.courtId,
          date: booking.date,
          status: 'CONFIRMED',
          OR: [
            { startTime: { gte: booking.startTime, lt: booking.endTime } },
            { endTime: { gt: booking.startTime, lte: booking.endTime } },
            { startTime: { lte: booking.startTime }, endTime: { gte: booking.endTime } },
          ],
        },
      })

      if (conflict) {
        // Pagamento aprovado MAS slot já confirmado por outro cliente → estorno manual
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED', cancelReason: 'SLOT_TAKEN_BY_OTHER', cancelledAt: new Date(), cancelledBy: 'system' },
        })
        // Mantém payment APPROVED para o admin ver no painel financeiro e estornar manualmente
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'APPROVED',
            paidAt: new Date(),
            gatewayStatus: mpStatus,
            gatewayId: String(resourceId),
            refundReason: 'PENDING_MANUAL_REFUND: outro cliente confirmou primeiro',
          },
        })
        console.log('Reconciliação: CONFLITO — pagamento aprovado, marcado para estorno manual. bookingId=', booking.id)
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'APPROVED', paidAt: new Date(), gatewayStatus: mpStatus, gatewayId: String(resourceId) },
        })
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED' },
        })
        console.log('Reconciliação: booking confirmado =', booking.id)
      }
    }

    if (totalRefunded > 0) {
      console.log(`Reconciliação: total estornado = R$${totalRefunded.toFixed(2)}`)
    }
    return true

  } else if (['rejected', 'cancelled', 'expired'].includes(mpStatus)) {
    const newStatus = mpStatus === 'rejected' ? 'REJECTED' : mpStatus === 'expired' ? 'EXPIRED' : 'CANCELLED'
    for (const payment of pending) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: newStatus as any, gatewayStatus: mpStatus },
      })
      if (['expired', 'cancelled'].includes(mpStatus) && payment.booking?.status === 'PENDING') {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: 'CANCELLED',
            cancelReason: mpStatus === 'expired' ? 'PIX_EXPIRED' : 'PAYMENT_CANCELLED',
            cancelledAt: new Date(),
            cancelledBy: 'system',
          },
        })
        console.log('Reconciliação: booking cancelado por', mpStatus, '=', payment.bookingId)
      }
    }
    console.log(`Reconciliação: ${pending.length} payment(s) → ${newStatus}`)
    return true
  }

  console.log('Reconciliação: status MP ignorado:', mpStatus)
  return false
}
