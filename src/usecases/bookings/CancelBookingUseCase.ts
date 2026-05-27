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

    if (booking.payment?.status === 'PENDING' && booking.payment?.gatewayId) {
      // PIX gerado mas ainda não pago: cancela no MercadoPago para invalidar o QR code
      try {
        const mp = await MercadoPagoService.create()
        await mp.cancelPayment(Number(booking.payment.gatewayId))
        console.log('PIX cancelado no MercadoPago para booking', booking.id)
      } catch (err) {
        // Não bloqueia o cancelamento — MP pode estar indisponível ou o PIX já expirou
        console.error('Falha ao cancelar PIX no MercadoPago:', err)
      }
      updatedPayment = await this.paymentRepo.update(booking.payment.id, {
        status: 'CANCELLED',
        gatewayStatus: 'cancelled',
      })
    } else if (input.refund && booking.payment?.status === 'APPROVED') {
      // Integração real: chamar MercadoPago refund aqui
      // Por ora, simula estorno bem-sucedido
      updatedPayment = await this.paymentRepo.update(booking.payment.id, {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedBy: input.cancelledBy,
        refundAmount: booking.payment.amount,
        refundReason: input.reason,
        refundGatewayId: `REFUND-${Date.now()}`,
      })
      refundProcessed = true
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
        newData: { status: 'CANCELLED', refund: input.refund } as any,
      },
    })

    return { booking: updatedBooking, payment: updatedPayment, refundProcessed }
  }
}
