'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAdminData } from './invalidateAdminData'

export function useCancelBookingViewModel(bookingId: string, onSuccess?: () => void) {
  const [reason, setReason] = useState('')
  const [refund, setRefund] = useState(false)
  const qc = useQueryClient()

  const { mutateAsync: cancel, isPending } = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error('Informe o motivo')
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, refund }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Erro ao cancelar')
      }
      return res.json()
    },
    onSuccess: () => {
      invalidateAdminData(qc, bookingId)
      onSuccess?.()
    },
  })

  return { reason, setReason, refund, setRefund, cancel, isPending }
}
