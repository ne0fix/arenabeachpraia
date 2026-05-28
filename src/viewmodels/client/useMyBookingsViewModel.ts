'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import type { BookingWithDetails } from '@/models/entities/Booking'

type Filter = 'all' | 'upcoming' | 'past' | 'cancelled'

// Janela de validade do PIX em minutos (alinhada com configuração do MercadoPago)
const PIX_VALIDITY_MIN = 30

export function useMyBookingsViewModel() {
  const [filter, setFilter] = useState<Filter>('all')
  const qc = useQueryClient()
  const { data: session, status: sessionStatus } = useSession()
  const userId = (session?.user as any)?.id ?? null

  const { data, isLoading } = useQuery<{ bookings: BookingWithDetails[]; total: number }>({
    // queryKey inclui userId para evitar vazamento de cache entre usuários
    queryKey: ['my-bookings', userId],
    queryFn: () => fetch('/api/bookings/my').then((r) => r.json()),
    enabled: !!userId && sessionStatus === 'authenticated',
    // Sem cache stale — pegar dados sempre da API quando o usuário visitar
    staleTime: 0,
    // Refetch enquanto há PENDING (PIX aguardando confirmação do webhook)
    refetchInterval: (query) => {
      const bookings = (query.state.data as any)?.bookings ?? []
      return bookings.some((b: any) => b.status === 'PENDING') ? 5000 : false
    },
  })

  const allBookings = (data?.bookings ?? []).filter(
    // Defesa em profundidade: filtra no client também caso a API por algum motivo retorne outros
    (b) => !userId || b.userId === userId
  )

  // PIX pendentes ainda válidos (dentro da janela de 30 min)
  const pendingPixBookings = useMemo(() => {
    const cutoff = Date.now() - PIX_VALIDITY_MIN * 60 * 1000
    return allBookings.filter((b) => {
      if (b.status !== 'PENDING') return false
      const payment = (b as any).payment
      if (!payment?.pixQrCode) return false
      // Considera válido se foi criado dentro da janela ou se pixExpiration ainda futura
      const createdAtMs = new Date(b.createdAt).getTime()
      if (createdAtMs >= cutoff) return true
      if (payment.pixExpiration && new Date(payment.pixExpiration).getTime() > Date.now()) return true
      return false
    })
  }, [allBookings])

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings', userId] }),
  })

  return { filtered, isLoading, filter, setFilter, cancelBooking, cancelling, pendingPixBookings }
}
