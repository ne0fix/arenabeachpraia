import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago'
import { prisma } from '@/infrastructure/database/prisma'

export interface PaymentDescription {
  courtName: string
  date: string
  startTime: string
  endTime: string
}

export interface CreatePixInput {
  externalReference: string
  amount: number
  payerEmail: string
  description: PaymentDescription | string
}

export interface CreateCardInput {
  externalReference: string
  amount: number
  payerEmail: string
  payerCpf?: string
  token: string
  paymentMethodId: string
  description: PaymentDescription | string
}

export class MercadoPagoService {
  public client: MercadoPagoConfig
  private paymentClient: Payment
  private refundClient: PaymentRefund

  constructor(accessToken: string) {
    this.client = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } })
    this.paymentClient = new Payment(this.client)
    this.refundClient = new PaymentRefund(this.client)
  }

  static async create(): Promise<MercadoPagoService> {
    const s = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null)
    const token = (s?.mpAccessToken?.trim())
      ? s.mpAccessToken.trim()
      : (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '')
    const notifUrl = (s?.mpNotificationUrl?.trim()) || undefined
    const svc = new MercadoPagoService(token)
    svc.notificationUrl = notifUrl
    return svc
  }

  public notificationUrl?: string

  private buildDescription(d: PaymentDescription | string): string {
    if (typeof d === 'string') return d.slice(0, 255)
    return `${d.courtName} | ${d.date} | ${d.startTime}–${d.endTime}`
  }

  async createPixPayment(input: CreatePixInput) {
    try {
      // Prioridade: URL configurada no banco → NEXTAUTH_URL (apenas HTTPS)
      const notificationUrl = this.notificationUrl
        ?? (() => {
          const base = (process.env.NEXTAUTH_URL ?? '').trim().replace(/\/+$/, '')
          return base.startsWith('https://') ? `${base}/api/payments/webhook` : undefined
        })()

      const description = this.buildDescription(input.description)
      const meta = typeof input.description === 'string'
        ? { booking_id: input.externalReference, summary: input.description }
        : {
            court_name: input.description.courtName,
            date: input.description.date,
            start_time: input.description.startTime,
            end_time: input.description.endTime,
            booking_id: input.externalReference,
          }
      const result = await this.paymentClient.create({
        body: {
          transaction_amount: input.amount,
          payment_method_id: 'pix',
          description,
          external_reference: input.externalReference,
          payer: { email: input.payerEmail },
          metadata: meta,
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        } as any,
        requestOptions: { idempotencyKey: input.externalReference },
      })
      console.log('MP PIX created:', { id: result.id, status: result.status })
      return result
    } catch (error: any) {
      console.error('MercadoPago createPixPayment error:', JSON.stringify(error?.cause ?? error?.message ?? error))
      throw error
    }
  }

  async createCardPayment(input: CreateCardInput) {
    try {
      const notificationUrl = this.notificationUrl
        ?? (() => {
          const base = (process.env.NEXTAUTH_URL ?? '').trim().replace(/\/+$/, '')
          return base.startsWith('https://') ? `${base}/api/payments/webhook` : undefined
        })()

      const description = this.buildDescription(input.description)
      const meta = typeof input.description === 'string'
        ? { booking_id: input.externalReference, summary: input.description }
        : {
            court_name: input.description.courtName,
            date: input.description.date,
            start_time: input.description.startTime,
            end_time: input.description.endTime,
            booking_id: input.externalReference,
          }
      const cpf = input.payerCpf?.replace(/\D/g, '')
      const result = await this.paymentClient.create({
        body: {
          transaction_amount: input.amount,
          payment_method_id: input.paymentMethodId,
          token: input.token,
          installments: 1,
          description,
          statement_descriptor: 'ARENA BEACH SERRA',
          external_reference: input.externalReference,
          payer: {
            email: input.payerEmail,
            ...(cpf ? { identification: { type: 'CPF', number: cpf } } : {}),
          },
          metadata: meta,
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        },
        requestOptions: { idempotencyKey: input.externalReference },
      })
      console.log('MP Card created:', { id: result.id, status: result.status })
      return result
    } catch (error: any) {
      console.error('MercadoPago createCardPayment error:', JSON.stringify(error?.cause ?? error))
      throw error
    }
  }

  async getPayment(paymentId: string) {
    try {
      return await this.paymentClient.get({ id: paymentId })
    } catch (error: any) {
      console.error('MercadoPago getPayment error:', JSON.stringify(error?.cause ?? error))
      throw error
    }
  }

  async cancelPayment(paymentId: number) {
    try {
      const result = await (this.paymentClient as any).update({
        id: paymentId,
        body: { status: 'cancelled' },
      })
      console.log('MP Payment cancelled:', { paymentId })
      return result
    } catch (error: any) {
      console.error('MercadoPago cancelPayment error:', JSON.stringify(error?.cause ?? error?.message ?? error))
      throw error
    }
  }

  async refundPayment(paymentId: number, amount?: number) {
    try {
      const result = await this.refundClient.create({
        payment_id: paymentId,
        ...(amount ? { body: { amount } } : {}),
      })
      console.log('MP Refund created:', { paymentId, refundId: (result as any).id })
      return result
    } catch (error: any) {
      console.error('MercadoPago refundPayment error:', JSON.stringify(error?.cause ?? error))
      throw error
    }
  }
}

// Mantido para compatibilidade com código legado — prefira MercadoPagoService.create()
export const mercadoPagoService = new MercadoPagoService(process.env.MERCADOPAGO_ACCESS_TOKEN ?? '')
