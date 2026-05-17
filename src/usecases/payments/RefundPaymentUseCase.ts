import type { IPaymentRepository } from '@/repositories/IPaymentRepository'
import type { IBookingRepository } from '@/repositories/IBookingRepository'
import type { Payment } from '@/models/entities/Payment'
import { PaymentError } from '@/core/errors/AppError'
import { prisma } from '@/infrastructure/database/prisma'
import { mercadoPagoService } from '@/services/MercadoPagoService'

export interface RefundPaymentInput {
  bookingId: string
  refundedBy: string
  reason: string
  amount?: number
}

export interface RefundPaymentOutput {
  payment: Payment
  refundId: string
}

export class RefundPaymentUseCase {
  constructor(
    private paymentRepo: IPaymentRepository,
    private bookingRepo: IBookingRepository
  ) {}

  async execute(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const payment = await this.paymentRepo.findByBookingId(input.bookingId)
    if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND')
    if (payment.status === 'REFUNDED') throw new PaymentError('ALREADY_REFUNDED')
    if (payment.status !== 'APPROVED') throw new PaymentError('NOT_APPROVED')
    if (!payment.gatewayId) throw new PaymentError('GATEWAY_ID_MISSING')

    const refundAmount = input.amount ?? Number(payment.amount)
    const isPartial = refundAmount < Number(payment.amount)

    let refundId = `REFUND-${Date.now()}`
    
    try {
      const mpRefund = await mercadoPagoService.refundPayment(Number(payment.gatewayId), refundAmount)
      refundId = (mpRefund as any).id?.toString() || refundId
    } catch (error) {
      console.error('MercadoPago Refund Error:', error)
      throw new PaymentError('REFUND_GATEWAY_ERROR')
    }

    const updatedPayment = await this.paymentRepo.update(payment.id, {
      status: isPartial ? 'PARTIAL_REFUND' : 'REFUNDED',
      refundedAt: new Date(),
      refundedBy: input.refundedBy,
      refundAmount,
      refundGatewayId: refundId,
      refundReason: input.reason,
    })

    await this.bookingRepo.update(input.bookingId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: input.reason,
      cancelledBy: input.refundedBy,
    })

    await prisma.auditLog.create({
      data: {
        userId: input.refundedBy,
        bookingId: input.bookingId,
        action: 'PAYMENT_REFUNDED',
        entityType: 'Payment',
        entityId: payment.id,
        oldData: { status: payment.status } as any,
        newData: { status: updatedPayment.status, refundAmount, refundId } as any,
      },
    })

    return { payment: updatedPayment, refundId }
  }
}
