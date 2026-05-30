'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useSiteSettings } from '@/views/providers/SiteSettingsProvider'
import { useBookingCart } from '@/lib/useBookingCart'

type PaymentMethod = 'PIX' | 'CREDIT_CARD'

declare global {
  interface Window {
    MercadoPago: any
  }
}

// Detecta bandeira pelo BIN do cartão (fallback para quando o SDK não responde).
function detectBrandFromBin(cardNumber: string): string {
  const n = cardNumber.replace(/\D/g, '')
  if (/^(4011|431274|438935|451416|457393|457631|457632|504175|627780|636297|636368|650[4-9]|6516|6550)/.test(n)) return 'elo'
  if (/^(606282|3841)/.test(n)) return 'hipercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^5[1-5]|^2(2[2-9]|[3-6]\d|7[01])/.test(n)) return 'master'
  if (/^4/.test(n)) return 'visa'
  return 'visa'
}

async function waitForMercadoPago(timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (typeof window !== 'undefined' && window.MercadoPago) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('SDK do MercadoPago não carregou. Recarregue a página e tente novamente.')
}

// Extrai uma mensagem legível dos diferentes formatos de erro do MP.
function extractMpError(e: any): string {
  if (!e) return ''
  if (typeof e === 'string') return e
  // Formato mais comum: { cause: [{code, description}] }
  if (Array.isArray(e?.cause) && e.cause.length) {
    return e.cause.map((c: any) => c?.description ?? c?.message ?? c?.code).filter(Boolean).join('; ')
  }
  // Formato alternativo: { error: { causes: [...] } }
  if (Array.isArray(e?.error?.causes) && e.error.causes.length) {
    return e.error.causes.map((c: any) => c?.description ?? c?.message).filter(Boolean).join('; ')
  }
  // cause como objeto único (não array)
  if (e?.cause && !Array.isArray(e.cause)) {
    const desc = e.cause?.description ?? e.cause?.message ?? ''
    if (desc) return desc
  }
  const msg = e?.message ?? e?.error ?? e?.msg ?? ''
  if (msg) return String(msg)
  try { return JSON.stringify(e) } catch { return 'Erro desconhecido' }
}

export function usePaymentViewModel() {
  const router = useRouter()
  const params = useSearchParams()
  const { mpPublicKey } = useSiteSettings()
  const cart = useBookingCart()
  const [method, setMethod] = useState<PaymentMethod>('PIX')
  const [pixQrCode, setPixQrCode] = useState<string | null>(null)
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [allBookingIds, setAllBookingIds] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [batchPending, setBatchPending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [tokenizing, setTokenizing] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const isBatch = params.get('batch') === 'true'
  const cartItemId = params.get('cartItemId') ?? ''

  const courtId = params.get('courtId') ?? ''
  const date = params.get('date') ?? ''
  const startTime = params.get('startTime') ?? ''
  const endTime = params.get('endTime') ?? ''
  const sportsParam = params.get('sports')
  const sport = sportsParam ? decodeURIComponent(sportsParam) : undefined

  const { mutateAsync: createSingleBooking, isPending: singlePending } = useMutation({
    mutationFn: async (data: { paymentToken?: string; cardBrand?: string; payerCpf?: string }) => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId,
          date,
          startTime,
          endTime: endTime || undefined,
          paymentMethod: method,
          paymentToken: data.paymentToken,
          cardBrand: data.cardBrand,
          payerCpf: data.payerCpf,
          sport,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Erro ao processar pagamento')
      }
      return res.json() as Promise<{ booking: { id: string }; pixQrCode?: string; pixQrCodeBase64?: string }>
    },
    onSuccess: (data) => {
      setBookingId(data.booking.id)
      setAllBookingIds([data.booking.id])
      const cartParam = cartItemId ? `&cartItemId=${cartItemId}` : ''
      if (method === 'PIX' && data.pixQrCode) {
        setPixQrCode(data.pixQrCode)
        setPixQrCodeBase64(data.pixQrCodeBase64 || null)
        setTimeout(() => {
          router.push(`/booking-success?bookingId=${data.booking.id}${cartParam}`)
        }, 1500)
      } else {
        router.push(`/booking-success?bookingId=${data.booking.id}${cartParam}`)
      }
    },
    onError: (error: any) => {
      const msg = error?.message ?? ''
      router.push(`/booking-error?code=PAYMENT_FAILED${msg ? `&message=${encodeURIComponent(msg)}` : ''}`)
    },
  })

  const createBatchBooking = async (cardData?: { paymentToken: string; cardBrand: string; payerCpf?: string }) => {
    setBatchPending(true)
    try {
      const items = cart.items.map(i => ({
        courtId: i.courtId,
        date: i.date,
        startTime: i.startTime,
        endTime: i.endTime,
        cartItemId: i.id,
        sport: i.sports?.join(', ') ?? undefined,
      }))

      const res = await fetch('/api/bookings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          paymentMethod: method,
          paymentToken: cardData?.paymentToken,
          cardBrand: cardData?.cardBrand,
          payerCpf: cardData?.payerCpf,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Erro ao criar reservas')
      }

      const data = await res.json() as {
        primaryBookingId: string
        bookingIds: string[]
        pixQrCode?: string
        pixQrCodeBase64?: string
        totalAmount: number
      }

      setBookingId(data.primaryBookingId)
      setAllBookingIds(data.bookingIds)
      const batchParam = `&batchIds=${data.bookingIds.join(',')}`

      if (method === 'PIX' && data.pixQrCode) {
        setPixQrCode(data.pixQrCode)
        setPixQrCodeBase64(data.pixQrCodeBase64 || null)
        setTimeout(() => {
          cart.clearCart()
          router.push(`/booking-success?bookingId=${data.primaryBookingId}${batchParam}`)
        }, 1500)
      } else {
        cart.clearCart()
        router.push(`/booking-success?bookingId=${data.primaryBookingId}${batchParam}`)
      }
    } catch (err: any) {
      console.error('Batch booking error:', err)
      router.push(`/booking-error?code=PAYMENT_FAILED&message=${encodeURIComponent(err.message ?? '')}`)
    } finally {
      setBatchPending(false)
    }
  }

  const isPending = isBatch ? batchPending : singlePending || tokenizing

  const confirmPayment = async (cardData?: {
    cardNumber: string
    cardHolder: string
    expiry: string
    cvv: string
    cpf?: string
  }) => {
    if (!cardData) {
      // Fluxo PIX
      if (isBatch) {
        await createBatchBooking()
      } else {
        await createSingleBooking({})
      }
      return
    }

    // ── Passo 1: tokenizar cartão (erro inline, usuário corrige sem sair da página) ──
    setCardError(null)
    setTokenizing(true)

    let paymentToken: string
    let cardBrand: string

    try {
      const publicKey = mpPublicKey || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
      if (!publicKey) throw new Error('Chave pública do MercadoPago não configurada. Contate o suporte.')

      await waitForMercadoPago()

      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })

      const cardNum = cardData.cardNumber.replace(/\D/g, '')

      // Detecta a bandeira via SDK do MP (BIN lookup). Fallback para regex local.
      try {
        const pmResult = await mp.getPaymentMethods({ bin: cardNum.slice(0, 6) })
        cardBrand = pmResult?.results?.[0]?.id ?? detectBrandFromBin(cardNum)
      } catch {
        cardBrand = detectBrandFromBin(cardNum)
      }
      console.log('[MP] cardBrand detectado:', cardBrand)

      // Aceita validade com ou sem barra: "MM/AA", "MMAA", "MM/AAAA".
      const expDigits = cardData.expiry.replace(/\D/g, '')
      const month = expDigits.slice(0, 2)
      const yy = expDigits.slice(2)
      const year = yy.length === 4 ? yy : '20' + yy.slice(0, 2)

      // CPF do titular (somente dígitos). Sem um CPF válido o MP recusa o token.
      const cpf = (cardData.cpf ?? '').replace(/\D/g, '')

      const tokenResult = await mp.createCardToken({
        cardNumber: cardNum,
        cardholderName: cardData.cardHolder,
        cardExpirationMonth: month,
        cardExpirationYear: year,
        securityCode: cardData.cvv,
        identificationType: 'CPF',
        identificationNumber: cpf,
      })

      console.log('[MP] createCardToken result:', JSON.stringify(tokenResult))

      if (!tokenResult?.id) {
        const detail = extractMpError(tokenResult)
        throw new Error(detail || 'Dados do cartão inválidos. Verifique e tente novamente.')
      }

      paymentToken = tokenResult.id
    } catch (e: any) {
      console.error('[MP] Tokenization error:', e)
      setCardError(extractMpError(e) || 'Não foi possível validar o cartão. Verifique os dados e tente novamente.')
      setTokenizing(false)
      return
    }

    setTokenizing(false)

    // ── Passo 2: criar reserva com o token (falhas redirecionam para a página de erro) ──
    const payerCpf = (cardData.cpf ?? '').replace(/\D/g, '')
    if (isBatch) {
      await createBatchBooking({ paymentToken, cardBrand, payerCpf })
    } else {
      // useMutation com onError já redireciona para PAYMENT_FAILED em caso de falha
      await createSingleBooking({ paymentToken, cardBrand, payerCpf }).catch(() => {})
    }
  }

  const copyPix = () => {
    if (pixQrCode) {
      navigator.clipboard.writeText(pixQrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const simulatePixPayment = () => {
    if (bookingId) router.push(`/booking-success?bookingId=${bookingId}`)
  }

  const cancelOrder = async () => {
    setCancelling(true)
    try {
      if (allBookingIds.length > 0) {
        await Promise.all(
          allBookingIds.map((id) =>
            fetch(`/api/bookings/${id}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'Cancelado pelo cliente na tela de pagamento', refund: false }),
            })
          )
        )
      }
      cart.clearCart()
      router.push('/')
    } catch {
      cart.clearCart()
      router.push('/')
    } finally {
      setCancelling(false)
    }
  }

  return {
    method,
    setMethod,
    isBatch,
    courtId,
    date,
    startTime,
    endTime,
    cartItems: cart.items,
    cartTotal: cart.totalAmount,
    pixQrCode,
    pixQrCodeBase64,
    copied,
    isPending,
    cancelling,
    cardError,
    clearCardError: () => setCardError(null),
    hasBooking: allBookingIds.length > 0,
    confirmPayment,
    copyPix,
    simulatePixPayment,
    cancelOrder,
  }
}
