import { MercadoPagoConfig, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: { timeout: 10000 }
})

const paymentClient = new Payment(client)

export interface CreatePixInput {
  externalReference: string
  amount: number
  payerEmail: string
}

export interface CreateCardInput {
  externalReference: string
  amount: number
  payerEmail: string
  token: string
  paymentMethodId: string
}

export class MercadoPagoService {
  public client = client

  async createPixPayment(input: CreatePixInput) {
    try {
      const notificationUrl = process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL}/api/payments/webhook`
        : undefined

      const result = await paymentClient.create({
        body: {
          transaction_amount: input.amount,
          payment_method_id: 'pix',
          external_reference: input.externalReference,
          payer: { email: input.payerEmail },
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        } as any,
        requestOptions: { idempotencyKey: input.externalReference },
      })
      console.log('MP PIX created:', { id: result.id, status: result.status, external_reference: result.external_reference })
      return result
    } catch (error: any) {
      console.error('MercadoPago createPixPayment error:', JSON.stringify(error?.cause ?? error?.message ?? error))
      throw error
    }
  }

  async createCardPayment(input: CreateCardInput) {
    try {
      const result = await paymentClient.create({
        body: {
          transaction_amount: input.amount,
          payment_method_id: input.paymentMethodId,
          token: input.token,
          installments: 1,
          external_reference: input.externalReference,
          payer: { email: input.payerEmail },
        },
        requestOptions: { idempotencyKey: input.externalReference },
      })
      return result
    } catch (error: any) {
      console.error('MercadoPago createCardPayment error:', JSON.stringify(error?.cause ?? error))
      throw error
    }
  }

  async getPayment(paymentId: string) {
    try {
      const result = await paymentClient.get({ id: paymentId })
      return result
    } catch (error: any) {
      console.error('MercadoPago getPayment error:', JSON.stringify(error?.cause ?? error))
      throw error
    }
  }

  async refundPayment(paymentId: number, amount?: number) {
    try {
      const result = await paymentClient.refunds.create({
        id: paymentId,
        ...(amount ? { body: { amount } } : {}),
      })
      return result
    } catch (error: any) {
      console.error('MercadoPago refundPayment error:', JSON.stringify(error?.cause ?? error))
      throw error
    }
  }
}

export const mercadoPagoService = new MercadoPagoService()
