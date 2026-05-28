import { NextResponse } from 'next/server'
import { prisma } from '@/infrastructure/database/prisma'
import { MercadoPagoService } from '@/services/MercadoPagoService'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const mp = await MercadoPagoService.create()
    const signature = req.headers.get('x-signature')
    const requestId = req.headers.get('x-request-id')
    const bodyText = await req.text()
    const dbSettings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null)
    const webhookSecret = (dbSettings?.mpWebhookSecret && dbSettings.mpWebhookSecret.trim())
      ? dbSettings.mpWebhookSecret.trim()
      : (process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '')

    let body: any
    try {
      body = JSON.parse(bodyText)
    } catch {
      console.error('Webhook: body inválido:', bodyText.slice(0, 200))
      return NextResponse.json({ ok: true })
    }

    const { type, data, topic } = body
    const resourceId = data?.id

    console.log('Webhook recebido:', { type, topic, resourceId, body: JSON.stringify(body).slice(0, 300) })

    if (resourceId === '123456' || resourceId === 123456) {
      console.log('Webhook: Simulação detectada (ID 123456)')
      return NextResponse.json({ ok: true })
    }

    if (webhookSecret) {
      if (!signature) {
        console.warn('Webhook: assinatura ausente (secret configurado)')
        return NextResponse.json({ error: 'Assinatura ausente' }, { status: 401 })
      }
      try {
        const [tsPart, v1Part] = signature.split(',')
        const ts = tsPart?.split('=')[1]
        const v1 = v1Part?.split('=')[1]
        if (!ts || !v1) {
          console.warn('Webhook: formato de assinatura inválido')
          return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
        }
        const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`
        const hmac = crypto.createHmac('sha256', webhookSecret)
        hmac.update(manifest)
        const digest = hmac.digest('hex')
        if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(v1))) {
          console.warn('Webhook: assinatura HMAC inválida')
          return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
        }
      } catch (sigErr) {
        console.warn('Webhook: erro ao validar assinatura:', sigErr)
        return NextResponse.json({ error: 'Erro ao validar assinatura' }, { status: 401 })
      }
    }

    // Suporte a type="payment" (novo formato) e topic="payment" (IPN legado)
    const isPaymentEvent = type === 'payment' || topic === 'payment'

    if (isPaymentEvent) {
      if (!resourceId) {
        console.warn('Webhook: resourceId ausente')
        return NextResponse.json({ ok: true })
      }

      console.log('Webhook: buscando pagamento MP id=', resourceId)
      let mpData: any
      try {
        mpData = await mp.getPayment(String(resourceId))
      } catch (err: any) {
        console.error('Webhook: erro ao buscar pagamento MP:', err?.message ?? err)
        return NextResponse.json({ ok: true })
      }

      const externalReference = mpData.external_reference
      const mpStatus = mpData.status
      console.log('Webhook: MP status=', mpStatus, 'external_reference=', externalReference)

      if (!externalReference) {
        console.warn('Webhook: external_reference ausente no pagamento MP', resourceId)
        return NextResponse.json({ ok: true })
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
        console.warn('Webhook: nenhum payment encontrado para gatewayId=', resourceId, 'externalRef=', externalReference)
        return NextResponse.json({ ok: true })
      }

      console.log(`Webhook: ${payments.length} payment(s) encontrado(s) para gatewayId=${resourceId}`)

      // Filtra apenas os não-finalizados
      const pending = payments.filter(p => !['APPROVED', 'REFUNDED', 'CANCELLED'].includes(p.status))
      if (!pending.length) {
        console.log('Webhook: todos os pagamentos já finalizados, ignorando')
        return NextResponse.json({ ok: true })
      }

      if (['approved', 'processed', 'accredited'].includes(mpStatus)) {
        // Processa cada booking individualmente
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
              console.log('Webhook: estorno de reserva cancelada, bookingId=', booking.id)
            } catch (err) {
              console.error('Webhook: falha no estorno de reserva cancelada:', err)
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
            await prisma.booking.update({
              where: { id: booking.id },
              data: { status: 'CANCELLED', cancelReason: 'SLOT_CONFLICT', cancelledAt: new Date(), cancelledBy: 'system' },
            })
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'CANCELLED', gatewayStatus: mpStatus, gatewayId: String(resourceId) },
            })
            const refundAmt = Number(payment.amount)
            try {
              await mp.refundPayment(Number(resourceId), refundAmt)
              await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUNDED', refundedAt: new Date(), refundReason: 'Horário já reservado por outro cliente', refundAmount: payment.amount },
              })
              totalRefunded += refundAmt
              console.log('Webhook: estorno por conflito, bookingId=', booking.id)
            } catch (err) {
              console.error('Webhook: falha no estorno por conflito:', err)
            }
          } else {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'APPROVED', paidAt: new Date(), gatewayStatus: mpStatus, gatewayId: String(resourceId) },
            })
            await prisma.booking.update({
              where: { id: booking.id },
              data: { status: 'CONFIRMED' },
            })
            console.log('Webhook: booking confirmado =', booking.id)
          }
        }

        if (totalRefunded > 0) {
          console.log(`Webhook: total estornado = R$${totalRefunded.toFixed(2)}`)
        }

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
            console.log('Webhook: booking cancelado por', mpStatus, '=', payment.bookingId)
          }
        }
        console.log(`Webhook: ${pending.length} payment(s) → ${newStatus}`)
      } else {
        console.log('Webhook: status MP ignorado:', mpStatus)
      }
    } else {
      console.log('Webhook: tipo não tratado:', type ?? topic)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Webhook erro geral:', error?.message ?? error)
    return NextResponse.json({ ok: true })
  }
}
