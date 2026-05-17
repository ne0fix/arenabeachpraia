import { NextResponse } from 'next/server'
import { prisma } from '@/infrastructure/database/prisma'
import { mercadoPagoService } from '@/services/MercadoPagoService'
import { Payment } from 'mercadopago'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-signature')
    const requestId = req.headers.get('x-request-id')
    const bodyText = await req.text()
    const body = JSON.parse(bodyText)

    const { type, data } = body
    const resourceId = data?.id

    if (resourceId === '123456' || resourceId === 123456) {
      console.log('MercadoPago Webhook: Simulação detectada (ID 123456)')
      return NextResponse.json({ ok: true, message: 'Simulação recebida com sucesso' })
    }

    if (process.env.MERCADOPAGO_WEBHOOK_SECRET && signature) {
      const [tsPart, v1Part] = signature.split(',')
      const ts = tsPart.split('=')[1]
      const v1 = v1Part.split('=')[1]
      const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`
      const hmac = crypto.createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
      hmac.update(manifest)
      const digest = hmac.digest('hex')
      if (digest !== v1) {
        console.error('MercadoPago Webhook: Assinatura Inválida')
      }
    }

    if (type === 'payment' || type === 'order') {
      if (!resourceId) return NextResponse.json({ ok: true })

      let mpData: any
      if (type === 'payment') {
        const paymentClient = new Payment(mercadoPagoService.client)
        mpData = await paymentClient.get({ id: String(resourceId) })
      } else {
        mpData = await mercadoPagoService.getOrder(String(resourceId))
      }

      const externalReference = mpData.external_reference
      if (!externalReference) return NextResponse.json({ ok: true })

      const payment = await prisma.payment.findFirst({
        where: { bookingId: externalReference },
        include: { booking: true },
      })
      if (!payment || !payment.booking) return NextResponse.json({ ok: true })

      // Evita reprocessar pagamentos já finalizados
      if (['APPROVED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
        return NextResponse.json({ ok: true })
      }

      const mpStatus = mpData.status

      if (['approved', 'processed', 'accredited'].includes(mpStatus)) {
        const booking = payment.booking

        // ── Transação atômica para evitar dupla reserva ──────────────────────
        const result = await prisma.$transaction(async (tx) => {
          // Verifica se já existe outro booking CONFIRMED para o mesmo slot
          const conflict = await tx.booking.findFirst({
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
            // Este booking perde a corrida — cancela
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: 'CANCELLED',
                cancelReason: 'SLOT_CONFLICT',
                cancelledAt: new Date(),
                cancelledBy: 'system',
              },
            })
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'CANCELLED',
                gatewayStatus: mpStatus,
                gatewayId: String(resourceId),
              },
            })
            return { outcome: 'conflict' as const, gatewayId: String(resourceId) }
          }

          // Sem conflito — confirma
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'APPROVED',
              paidAt: new Date(),
              gatewayStatus: mpStatus,
              gatewayId: String(resourceId),
            },
          })
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'CONFIRMED' },
          })
          return { outcome: 'confirmed' as const }
        })

        // ── Estorno automático para o perdedor ───────────────────────────────
        if (result.outcome === 'conflict') {
          console.log(`Webhook: conflito de horário — cancelando booking ${booking.id}, tentando estorno ${result.gatewayId}`)
          try {
            const paymentClient = new Payment(mercadoPagoService.client)
            await paymentClient.refunds.create({ id: Number(result.gatewayId) })
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'REFUNDED',
                refundedAt: new Date(),
                refundReason: 'Horário já reservado por outro cliente',
                refundAmount: payment.amount,
              },
            })
            console.log(`Webhook: estorno realizado para booking ${booking.id}`)
          } catch (refundErr) {
            console.error(`Webhook: falha no estorno automático para booking ${booking.id}:`, refundErr)
            // Mantém como CANCELLED para o admin estornar manualmente
          }
        }

      } else if (['rejected', 'cancelled', 'expired'].includes(mpStatus)) {
        const newStatus = mpStatus === 'rejected' ? 'REJECTED'
          : mpStatus === 'expired' ? 'EXPIRED'
          : 'CANCELLED'

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: newStatus as any, gatewayStatus: mpStatus },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
