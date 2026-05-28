'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useSiteSettings } from '@/views/providers/SiteSettingsProvider'

type PaymentMethod = 'PIX' | 'CREDIT_CARD'

declare global {
  interface Window {
    MercadoPago: any
  }
}

export function usePaymentViewModel() {
  const router = useRouter()
  const params = useSearchParams()
  const { mpPublicKey } = useSiteSettings()
  const [method, setMethod] = useState<PaymentMethod>('PIX')
  const [pixQrCode, setPixQrCode] = useState<string | null>(null)
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const courtId = params.get('courtId') ?? ''
  const date = params.get('date') ?? ''
  const startTime = params.get('startTime') ?? ''
  const endTime = params.get('endTime') ?? ''
  const cartItemId = params.get('cartItemId') ?? ''

  const { mutateAsync: createBooking, isPending } = useMutation({
    mutationFn: async (data: { paymentToken?: string; cardBrand?: string }) => {
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
        }),
      })
      if (!res.ok) throw new Error('Erro ao criar agendamento')
      return res.json() as Promise<{ booking: { id: string }; pixQrCode?: string; pixQrCodeBase64?: string }>
    },
    onSuccess: (data) => {
      setBookingId(data.booking.id)
      if (method === 'PIX' && data.pixQrCode) {
        setPixQrCode(data.pixQrCode)
        setPixQrCodeBase64(data.pixQrCodeBase64 || null)
        // Redireciona para booking-success que faz polling automático.
        // Pequeno delay para o QR aparecer brevemente antes de redirecionar.
        const cartParam = cartItemId ? `&cartItemId=${cartItemId}` : ''
        setTimeout(() => {
          router.push(`/booking-success?bookingId=${data.booking.id}${cartParam}`)
        }, 1500)
      } else {
        const cartParam = cartItemId ? `&cartItemId=${cartItemId}` : ''
        router.push(`/booking-success?bookingId=${data.booking.id}${cartParam}`)
      }
    },
    onError: () => {
      router.push('/booking-error?code=PAYMENT_FAILED')
    },
  })

  const confirmPayment = async (cardData?: {
    cardNumber: string
    cardHolder: string
    expiry: string
    cvv: string
  }) => {
    if (cardData) {
      try {
        const publicKey = mpPublicKey || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
        if (!publicKey) throw new Error('MercadoPago Public Key missing')

        const mp = new window.MercadoPago(publicKey)
        const [month, year] = cardData.expiry.split('/')

        const tokenResult = await mp.createCardToken({
          cardNumber: cardData.cardNumber.replace(/\s/g, ''),
          cardholderName: cardData.cardHolder,
          cardExpirationMonth: month,
          cardExpirationYear: '20' + year,
          securityCode: cardData.cvv,
          identificationType: 'CPF',
          identificationNumber: '00000000000',
        })

        const brand = tokenResult.card?.payment_method?.id ?? tokenResult.payment_method?.id ?? 'visa'
        await createBooking({ paymentToken: tokenResult.id, cardBrand: brand })
      } catch (e) {
        console.error('Card tokenization failed:', e)
        router.push('/booking-error?code=TOKEN_FAILED')
      }
    } else {
      await createBooking({})
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

  return {
    method,
    setMethod,
    courtId,
    date,
    startTime,
    endTime,
    pixQrCode,
    pixQrCodeBase64,
    copied,
    isPending,
    confirmPayment,
    copyPix,
    simulatePixPayment,
  }
}
