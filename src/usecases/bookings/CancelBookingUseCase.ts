import type { IBookingRepository } from '@/repositories/IBookingRepository'
import type { IPaymentRepository } from '@/repositories/IPaymentRepository'
import type { Booking } from '@/models/entities/Booking'
import type { Payment } from '@/models/entities/Payment'
import { BookingError, PaymentError } from '@/core/errors/AppError'
import { prisma } from '@/infrastructure/database/prisma'
import { MercadoPagoService } from '@/services/MercadoPagoService'

export interface CancelBookingInput {
  bookingId: string
  cancelledBy: string
  reason: string
  refund: boolean
  isAdmin: boolean
}

export interface CancelBookingOutput {
  booking: Booking
  payment: Payment | null
  refundProcessed: boolean
}

export class CancelBookingUseCase {
  constructor(
    private bookingRepo: IBookingRepository,
    private paymentRepo: IPaymentRepository
  ) {}

  async execute(input: CancelBookingInput): Promise<CancelBookingOutput> {
    const booking = await this.bookingRepo.findById(input.bookingId)
    if (!booking) throw new BookingError('BOOKING_NOT_FOUND')

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BookingError('BOOKING_NOT_CANCELLABLE')
    }

    if (!input.isAdmin && booking.userId !== input.cancelledBy) {
      throw new BookingError('UNAUTHORIZED')
    }

    let refundProcessed = false
    let updatedPayment: Payment | null = null
    const payment = booking.payment

    if (payment?.gatewayId) {
      // Detecta se este pagamento é parte de um batch (mesmo gatewayId em outros bookings)
      const siblings = await prisma.payment.count({
        where: {
          gatewayId: payment.gatewayId,
          bookingId: { not: booking.id },
        },
      })
      const isBatch = siblings > 0

      if (payment.status === 'PENDING') {
        if (isBatch) {
          // Em batch PENDING não dá pra cancelar só este; o PIX é único
          // Marca o payment do booking como cancelado mas não toca no MP
          updatedPayment = await this.paymentRepo.update(payment.id, {
            status: 'CANCELLED',
            gatewayStatus: 'cancelled',
          })
        } else {
          // Single: cancela o PIX no MP para invalidar o QR code
          try {
            const mp = await MercadoPagoService.create()
            await mp.cancelPayment(Number(payment.gatewayId))
            console.log('PIX cancelado no MP para booking', booking.id)
          } catch (err) {
            console.error('Falha ao cancelar PIX no MP:', err)
          }
          updatedPayment = await this.paymentRepo.update(payment.id, {
            status: 'CANCELLED',
            gatewayStatus: 'cancelled',
          })
        }
      } else if (input.refund && payment.status === 'APPROVED') {
        // Estorno real no MercadoPago (refund parcial pelo amount deste booking)
        const refundAmount = Number(payment.amount)
        try {
          const mp = await MercadoPagoService.create()
          const mpRefund = await mp.refundPayment(Number(payment.gatewayId), refundAmount)
          const refundId = (mpRefund as any).id?.toString() || `REFUND-${Date.now()}`
          updatedPayment = await this.paymentRepo.update(payment.id, {
            status: 'REFUNDED',
            refundedAt: new Date(),
            refundedBy: input.cancelledBy,
            refundAmount,
            refundReason: input.reason,
            refundGatewayId: refundId,
          })
          refundProcessed = true
        } catch (err: any) {
          const detail = err?.cause?.message ?? err?.message ?? 'Erro desconhecido'
          console.error('MercadoPago Refund Error:', JSON.stringify(err?.cause ?? err))
          throw new PaymentError('REFUND_GATEWAY_ERROR', `Erro MercadoPago: ${detail}`)
        }
      }
    }

    const updatedBooking = await this.bookingRepo.update(booking.id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: input.reason,
      cancelledBy: input.cancelledBy,
    })

    await prisma.auditLog.create({
      data: {
        userId: input.cancelledBy,
        bookingId: booking.id,
        action: 'BOOKING_CANCELLED',
        entityType: 'Booking',
        entityId: booking.id,
        oldData: { status: booking.status } as any,
        newData: { status: 'CANCELLED', refund: input.refund, refundProcessed } as any,
      },
    })

    return { booking: updatedBooking, payment: updatedPayment, refundProcessed }
  }
}
