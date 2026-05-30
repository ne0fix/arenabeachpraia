'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAdminData } from './invalidateAdminData'

export function useRefundViewModel(bookingId: string, maxAmount: number, onSuccess?: () => void) {
  const [reason, setReason] = useState('Estorno solicitado pelo administrador')
  const [amount, setAmount] = useState(maxAmount)
  const [isPartial, setIsPartial] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const qc = useQueryClient()

  const { mutate: refund, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          reason: reason.trim() || 'Estorno solicitado pelo administrador',
          amount: isPartial ? amount : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Erro ao processar estorno')
      }
      return res.json()
    },
    onSuccess: () => {
      setErrorMessage('')
      invalidateAdminData(qc, bookingId)
      onSuccess?.()
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Erro ao processar estorno')
    },
  })

  return {
    reason, setReason,
    amount, setAmount,
    isPartial, setIsPartial,
    errorMessage,
    refund,
    isPending,
  }
}
