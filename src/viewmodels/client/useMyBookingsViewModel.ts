'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { BookingWithDetails } from '@/models/entities/Booking'

type Filter = 'all' | 'upcoming' | 'past' | 'cancelled'

export function useMyBookingsViewModel() {
  const [filter, setFilter] = useState<Filter>('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ bookings: BookingWithDetails[]; total: number }>({
    queryKey: ['my-bookings'],
    queryFn: () => fetch('/api/bookings/my').then((r) => r.json()),
  })

  const allBookings = data?.bookings ?? []

  const filtered = allBookings.filter((b) => {
    const d = new Date(String(b.date).slice(0, 10) + 'T12:00:00')
    const now = new Date()
    if (filter === 'upcoming') return d >= now && b.status !== 'CANCELLED'
    if (filter === 'past') return d < now && b.status !== 'CANCELLED'
    if (filter === 'cancelled') return b.status === 'CANCELLED'
    return true
  })

  const { mutateAsync: cancelBooking, isPending: cancelling } = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelado pelo cliente', refund: false }),
      })
      if (!res.ok) throw new Error('Erro ao cancelar')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings'] }),
  })

  return { filtered, isLoading, filter, setFilter, cancelBooking, cancelling }
}
