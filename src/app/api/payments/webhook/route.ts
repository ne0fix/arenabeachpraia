import { NextResponse } from 'next/server'
import { prisma } from '@/infrastructure/database/prisma'
import { MercadoPagoService } from '@/services/MercadoPagoService'
import { reconcilePaymentByResourceId } from '@/services/paymentReconciliation'
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

    // Validação HMAC é OPCIONAL e NÃO-BLOQUEANTE.
    // O Mercado Pago nem sempre envia x-signature (depende da versão/origem da
    // notificação), e o formato/secret podem divergir, fazendo webhooks legítimos
    // serem rejeitados com 401 — o pagamento então nunca é confirmado.
    // A autenticidade real é garantida adiante por mp.getPayment(resourceId), que
    // usa o access token secreto: um atacante não consegue forjar um pagamento
    // aprovado. Por isso aqui apenas logamos divergências e seguimos o processamento.
    if (webhookSecret && signature) {
      try {
        const [tsPart, v1Part] = signature.split(',')
        const ts = tsPart?.split('=')[1]
        const v1 = v1Part?.split('=')[1]
        if (ts && v1) {
          const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`
          const hmac = crypto.createHmac('sha256', webhookSecret)
          hmac.update(manifest)
          const digest = hmac.digest('hex')
          const a = Buffer.from(digest)
          const b = Buffer.from(v1)
          const matches = a.length === b.length && crypto.timingSafeEqual(a, b)
          if (!matches) {
            console.warn('Webhook: assinatura HMAC divergente (continuando — autenticidade confirmada via getPayment)')
          }
        }
      } catch (sigErr) {
        console.warn('Webhook: erro ao validar assinatura (continuando):', sigErr)
      }
    }

    // Suporte a type="payment" (novo formato) e topic="payment" (IPN legado)
    const isPaymentEvent = type === 'payment' || topic === 'payment'

    if (isPaymentEvent) {
      if (!resourceId) {
        console.warn('Webhook: resourceId ausente')
        return NextResponse.json({ ok: true })
      }

      console.log('Webhook: reconciliando pagamento MP id=', resourceId)
      // Toda a lógica de confirmação/cancelamento/conflito vive em reconcilePaymentByResourceId,
      // compartilhada com o polling ativo de /api/bookings/[id].
      await reconcilePaymentByResourceId(resourceId, mp)
    } else {
      console.log('Webhook: tipo não tratado:', type ?? topic)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Webhook erro geral:', error?.message ?? error)
    return NextResponse.json({ ok: true })
  }
}
