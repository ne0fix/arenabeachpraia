import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { prisma } from '@/infrastructure/database/prisma'
import { MercadoPagoService } from '@/services/MercadoPagoService'
import { generateAccessCode, calculateDuration } from '@/core/utils/helpers'
import { emitToRoom } from '@/lib/socket-server'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { randomUUID } from 'crypto'

const batchSchema = z.object({
  items: z.array(z.object({
    courtId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    cartItemId: z.string(),
    sport: z.string().optional(),
  })).min(2),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD']),
  paymentToken: z.string().optional(),
  cardBrand: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Dados inválidos', errors: parsed.error.flatten() }, { status: 400 })
  }

  const { items, paymentMethod, paymentToken, cardBrand } = parsed.data

  // Buscar quadras
  const courtIds = [...new Set(items.map(i => i.courtId))]
  const courts = await prisma.court.findMany({ where: { id: { in: courtIds }, isActive: true } })
  const courtMap = new Map(courts.map(c => [c.id, c]))

  if (courts.length !== courtIds.length) {
    return NextResponse.json({ message: 'Uma ou mais quadras não encontradas' }, { status: 404 })
  }

  // Verificar disponibilidade: apenas CONFIRMED bloqueia (otimista — first-paid-wins)
  for (const item of items) {
    const conflict = await prisma.booking.findFirst({
      where: {
        courtId: item.courtId,
        date: new Date(item.date + 'T00:00:00'),
        status: 'CONFIRMED',
        OR: [
          { startTime: { gte: item.startTime, lt: item.endTime } },
          { endTime: { gt: item.startTime, lte: item.endTime } },
          { startTime: { lte: item.startTime }, endTime: { gte: item.endTime } },
        ],
      },
    })
    if (conflict) {
      const dateFormatted = format(parse(item.date, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
      return NextResponse.json({
        message: `Horário ${item.startTime} de ${dateFormatted} não está mais disponível`,
        code: 'SLOT_NOT_AVAILABLE',
      }, { status: 409 })
    }
  }

  // Calcular totais por item
  const enriched = items.map(item => {
    const court = courtMap.get(item.courtId)!
    const duration = calculateDuration(item.startTime, item.endTime)
    const amount = Number(court.pricePerHour) * duration
    const dateFormatted = format(parse(item.date, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
    return { ...item, court, duration, amount, dateFormatted }
  })
  const totalAmount = enriched.reduce((s, i) => s + i.amount, 0)

  // orderId + accessCode comuns: unificam todos os horários deste checkout em
  // um único pedido (como um carrinho de e-commerce: 1 pedido, vários itens).
  const orderId = randomUUID()
  const accessCode = generateAccessCode()

  // Criar todos os bookings em transação
  const bookings = await prisma.$transaction(
    enriched.map(d =>
      prisma.booking.create({
        data: {
          userId: session.user.id!,
          courtId: d.courtId,
          date: new Date(d.date + 'T00:00:00'),
          startTime: d.startTime,
          endTime: d.endTime,
          durationHours: d.duration,
          totalValue: d.amount,
          status: 'PENDING',
          accessCode,
          orderId,
          sport: d.sport ?? null,
        },
      })
    )
  )

  // Descrição combinada para o MercadoPago (máx 255 chars) — detalha o pedido inteiro
  // para constar corretamente em "Vendas" no painel do Mercado Pago.
  const descLines = enriched.map(d => `${d.court.name} ${d.dateFormatted} ${d.startTime}-${d.endTime}`)
  const description = `Arena Beach Serra - ${enriched.length} reservas: ${descLines.join(' | ')}`.slice(0, 255)

  const mp = await MercadoPagoService.create()

  let pixQrCode: string | null = null
  let pixQrCodeBase64: string | null = null
  let pixExpiration: Date | null = null
  let gatewayId: string | null = null
  let gatewayStatus = 'PENDING'

  // external_reference = ID do primeiro booking (o webhook vai buscar todos pelo gatewayId)
  const primaryBookingId = bookings[0].id

  try {
    if (paymentMethod === 'PIX') {
      const mpPayment = await mp.createPixPayment({
        externalReference: primaryBookingId,
        amount: totalAmount,
        payerEmail: session.user.email!,
        description,
      })
      gatewayId = mpPayment.id?.toString() ?? null
      gatewayStatus = mpPayment.status ?? 'PENDING'
      const txData = (mpPayment as any).point_of_interaction?.transaction_data
      pixQrCode = txData?.qr_code ?? null
      pixQrCodeBase64 = txData?.qr_code_base64 ?? null
      pixExpiration = txData?.expiration_date ? new Date(txData.expiration_date) : null
    } else {
      const mpPayment = await mp.createCardPayment({
        externalReference: primaryBookingId,
        amount: totalAmount,
        payerEmail: session.user.email!,
        token: paymentToken ?? '',
        paymentMethodId: cardBrand ?? 'visa',
        description,
      })
      gatewayId = mpPayment.id?.toString() ?? null
      gatewayStatus = mpPayment.status ?? 'PENDING'
    }
  } catch (error) {
    // Cancela os bookings se MP falhar
    await prisma.booking.updateMany({
      where: { id: { in: bookings.map(b => b.id) } },
      data: { status: 'CANCELLED', cancelReason: 'PAYMENT_FAILED', cancelledAt: new Date(), cancelledBy: 'system' },
    })
    console.error('Batch MercadoPago error:', error)
    return NextResponse.json({ message: 'Erro ao processar pagamento' }, { status: 500 })
  }

  const isApproved = ['approved', 'processed', 'accredited'].includes(gatewayStatus)

  // Se cartão aprovou imediatamente, checa conflito de cada slot antes de confirmar
  // (entre criar PENDING e processar, outro cliente pode ter confirmado um slot)
  const conflictedIds = new Set<string>()
  if (isApproved) {
    for (const booking of bookings) {
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
        select: { id: true },
      })
      if (conflict) conflictedIds.add(booking.id)
    }
  }

  // Criar registros de pagamento — todos com o mesmo gatewayId
  await prisma.$transaction(
    bookings.map((booking, idx) => {
      const isConflict = conflictedIds.has(booking.id)
      return prisma.payment.create({
        data: {
          bookingId: booking.id,
          method: paymentMethod,
          status: isApproved ? 'APPROVED' : 'PENDING',
          amount: enriched[idx].amount,
          gatewayId: gatewayId?.toString() || null,
          gatewayStatus,
          // QR code armazenado apenas no registro do booking primário
          pixQrCode: idx === 0 ? pixQrCode : null,
          pixQrCodeBase64: idx === 0 ? pixQrCodeBase64 : null,
          pixExpiration,
          cardLastFour: null,
          cardBrand: null,
          installments: 1,
          paidAt: isApproved ? new Date() : null,
          refundedAt: null,
          refundedBy: null,
          refundAmount: null,
          refundGatewayId: null,
          // Flag para estorno manual quando outro cliente confirmou o slot primeiro
          refundReason: isApproved && isConflict
            ? 'PENDING_MANUAL_REFUND: outro cliente confirmou primeiro'
            : null,
        },
      })
    })
  )

  // Se cartão aprovado: confirma apenas os bookings sem conflito;
  // os conflitados ficam CANCELLED com SLOT_TAKEN_BY_OTHER
  if (isApproved) {
    const confirmableIds = bookings.filter(b => !conflictedIds.has(b.id)).map(b => b.id)
    if (confirmableIds.length > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: confirmableIds } },
        data: { status: 'CONFIRMED' },
      })
    }
    if (conflictedIds.size > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: Array.from(conflictedIds) } },
        data: {
          status: 'CANCELLED',
          cancelReason: 'SLOT_TAKEN_BY_OTHER',
          cancelledAt: new Date(),
          cancelledBy: 'system',
        },
      })
      console.log(`Batch: ${conflictedIds.size} slot(s) já tomados — marcados para estorno manual`)
    }
  }

  // Notifica admin em tempo real
  for (const d of enriched) {
    emitToRoom('admin', 'booking:new', {
      courtId: d.courtId,
      date: d.date,
      startTime: d.startTime,
      userName: session.user.name,
    })
  }

  return NextResponse.json({
    primaryBookingId,
    bookingIds: bookings.map(b => b.id),
    pixQrCode,
    pixQrCodeBase64,
    totalAmount,
  }, { status: 201 })
}
