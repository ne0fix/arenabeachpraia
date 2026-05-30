import type { IBookingRepository } from '@/repositories/IBookingRepository'
import type { ICourtRepository } from '@/repositories/ICourtRepository'
import type { IPaymentRepository } from '@/repositories/IPaymentRepository'
import type { Booking } from '@/models/entities/Booking'
import type { Payment, PaymentMethod } from '@/models/entities/Payment'
import { AppError, BookingError } from '@/core/errors/AppError'
import { generateAccessCode, calculateDuration, getEndTime } from '@/core/utils/helpers'
import { MercadoPagoService } from '@/services/MercadoPagoService'
import { randomUUID } from 'crypto'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface CreateBookingInput {
  userId: string
  userEmail: string
  courtId: string
  date: string
  startTime: string
  endTime?: string
  paymentMethod: PaymentMethod
  paymentToken?: string
  cardBrand?: string
  payerCpf?: string
  sport?: string
}

export interface CreateBookingOutput {
  booking: Booking
  payment: Payment
  pixQrCode?: string
  pixQrCodeBase64?: string
}

export class CreateBookingUseCase {
  constructor(
    private bookingRepo: IBookingRepository,
    private courtRepo: ICourtRepository,
    private paymentRepo: IPaymentRepository
  ) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    const court = await this.courtRepo.findById(input.courtId)
    if (!court || !court.isActive) throw new BookingError('COURT_NOT_FOUND')

    const endTime = input.endTime ?? getEndTime(input.startTime, court.slotDuration)
    const duration = calculateDuration(input.startTime, endTime)

    const isAvailable = await this.bookingRepo.checkAvailability(
      input.courtId,
      input.date,
      input.startTime,
      endTime
    )
    if (!isAvailable) throw new BookingError('SLOT_NOT_AVAILABLE')

    const totalValue = Number(court.pricePerHour) * duration

    // Formata data no padrão brasileiro para descrição no MercadoPago
    const dateFormatted = format(
      parse(input.date, 'yyyy-MM-dd', new Date()),
      'dd/MM/yyyy',
      { locale: ptBR }
    )

    const booking = await this.bookingRepo.create({
      userId: input.userId,
      courtId: input.courtId,
      date: new Date(input.date + 'T00:00:00'),
      startTime: input.startTime,
      endTime,
      durationHours: duration,
      totalValue,
      status: 'PENDING',
      accessCode: generateAccessCode(),
      orderId: randomUUID(),
      sport: input.sport ?? null,
      notes: null,
      cancelledAt: null,
      cancelReason: null,
      cancelledBy: null,
    })

    let gatewayId = null
    let gatewayStatus = 'PENDING'
    let mpStatusDetail: string | null = null
    let pixQrCode = null
    let pixQrCodeBase64 = null
    let pixExpiration = null

    try {
      const paymentDescription = {
        courtName: court.name,
        date: dateFormatted,
        startTime: input.startTime,
        endTime,
      }

      const mp = await MercadoPagoService.create()
      if (input.paymentMethod === 'PIX') {
        const mpPayment = await mp.createPixPayment({
          externalReference: booking.id,
          amount: totalValue,
          payerEmail: input.userEmail,
          description: paymentDescription,
        })
        gatewayId = mpPayment.id?.toString() ?? null
        gatewayStatus = mpPayment.status ?? 'PENDING'
        const txData = (mpPayment as any).point_of_interaction?.transaction_data
        pixQrCode = txData?.qr_code ?? null
        pixQrCodeBase64 = txData?.qr_code_base64 ?? null
        pixExpiration = txData?.expiration_date ? new Date(txData.expiration_date) : null
      } else {
        const mpPayment = await mp.createCardPayment({
          externalReference: booking.id,
          amount: totalValue,
          payerEmail: input.userEmail,
          payerCpf: input.payerCpf,
          token: input.paymentToken ?? '',
          paymentMethodId: input.cardBrand ?? 'visa',
          description: paymentDescription,
        })
        gatewayId = mpPayment.id?.toString() ?? null
        gatewayStatus = mpPayment.status ?? 'PENDING'
        mpStatusDetail = (mpPayment as any).status_detail ?? null
      }
    } catch (error) {
      console.error('Failed to create MercadoPago payment:', error)
      throw error
    }

    const APPROVED_STATUSES = ['approved', 'processed', 'accredited']
    const REJECTED_STATUSES = ['rejected', 'cancelled']
    const isApproved = APPROVED_STATUSES.includes(gatewayStatus)
    const isRejected = REJECTED_STATUSES.includes(gatewayStatus)

    // Cartão recusado: registra o pagamento como REJECTED, cancela o booking
    // e lança erro para que a API retorne 400 e o cliente veja PAYMENT_FAILED.
    if (isRejected) {
      await this.paymentRepo.create({
        bookingId: booking.id,
        method: input.paymentMethod,
        status: 'REJECTED',
        amount: totalValue,
        gatewayId: gatewayId?.toString() || null,
        gatewayStatus,
        pixQrCode: null,
        pixQrCodeBase64: null,
        pixExpiration: null,
        cardLastFour: null,
        cardBrand: input.cardBrand ?? null,
        installments: 1,
        paidAt: null,
        refundedAt: null,
        refundedBy: null,
        refundAmount: null,
        refundGatewayId: null,
        refundReason: null,
      })
      await this.bookingRepo.update(booking.id, {
        status: 'CANCELLED',
        cancelReason: 'PAYMENT_FAILED',
        cancelledAt: new Date(),
        cancelledBy: 'system',
      })
      throw new AppError('CARD_REJECTED', translateMpRejection(mpStatusDetail), 402)
    }

    const payment = await this.paymentRepo.create({
      bookingId: booking.id,
      method: input.paymentMethod,
      status: isApproved ? 'APPROVED' : 'PENDING',
      amount: totalValue,
      gatewayId: gatewayId?.toString() || null,
      gatewayStatus: gatewayStatus,
      pixQrCode,
      pixQrCodeBase64,
      pixExpiration,
      cardLastFour: null,
      cardBrand: input.cardBrand ?? null,
      installments: 1,
      paidAt: isApproved ? new Date() : null,
      refundedAt: null,
      refundedBy: null,
      refundAmount: null,
      refundGatewayId: null,
      refundReason: null,
    })

    // Para cartão aprovado imediatamente: confirma o booking sem esperar webhook.
    // Verifica conflito de slot (first-paid-wins) antes de confirmar.
    if (isApproved && input.paymentMethod !== 'PIX') {
      // checkAvailability só conta CONFIRMED — o booking atual é PENDING, não conflita consigo mesmo
      const stillAvailable = await this.bookingRepo.checkAvailability(
        input.courtId,
        input.date,
        input.startTime,
        endTime,
      )

      if (stillAvailable) {
        const confirmed = await this.bookingRepo.update(booking.id, { status: 'CONFIRMED' })
        booking.status = confirmed.status
      } else {
        // Outro cliente confirmou o slot durante o processamento — cancela e agenda estorno
        await this.bookingRepo.update(booking.id, {
          status: 'CANCELLED',
          cancelReason: 'SLOT_TAKEN_BY_OTHER',
          cancelledAt: new Date(),
          cancelledBy: 'system',
        })
        booking.status = 'CANCELLED'
        booking.cancelReason = 'SLOT_TAKEN_BY_OTHER'
        console.warn(`Slot tomado durante pagamento do booking ${booking.id} — estorno manual necessário`)
      }
    }

    return {
      booking,
      payment,
      pixQrCode: pixQrCode || undefined,
      pixQrCodeBase64: pixQrCodeBase64 || undefined
    }
  }
}

function translateMpRejection(detail: string | null): string {
  const map: Record<string, string> = {
    cc_rejected_high_risk:             'Cartão recusado por segurança. Tente outro cartão ou contate seu banco.',
    cc_rejected_insufficient_amount:   'Saldo insuficiente. Verifique o limite do cartão.',
    cc_rejected_bad_filled_card_number:'Número do cartão inválido.',
    cc_rejected_bad_filled_date:       'Data de validade inválida.',
    cc_rejected_bad_filled_security_code: 'CVV inválido.',
    cc_rejected_bad_filled_other:      'Dados do cartão inválidos. Verifique e tente novamente.',
    cc_rejected_card_disabled:         'Cartão desativado. Contate seu banco.',
    cc_rejected_duplicated_payment:    'Pagamento duplicado. Aguarde alguns minutos e tente novamente.',
    cc_rejected_other_reason:          'Cartão recusado. Tente outro cartão ou contate seu banco.',
    cc_rejected_max_attempts:          'Limite de tentativas atingido. Tente outro cartão.',
    cc_amount_rate_limit_exceeded:     'Limite de valor excedido. Tente um valor menor.',
  }
  return detail ? (map[detail] ?? `Cartão recusado (${detail}). Contate seu banco.`) : 'Cartão recusado. Tente outro cartão.'
}
