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

  // PIX pendentes ainda válidos agrupados por gatewayId (para reconstruir batch)
  const pendingPixGroups = useMemo(() => {
    const cutoff = Date.now() - PIX_VALIDITY_MIN * 60 * 1000
    const isValid = (b: any) => {
      if (b.status !== 'PENDING') return false
      const payment = b.payment
      if (!payment) return false
      const createdAtMs = new Date(b.createdAt).getTime()
      if (createdAtMs >= cutoff) return true
      if (payment.pixExpiration && new Date(payment.pixExpiration).getTime() > Date.now()) return true
      return false
    }
    const pending = allBookings.filter(isValid)
    const groupsByGateway = new Map<string, BookingWithDetails[]>()
    const ungrouped: BookingWithDetails[] = []
    for (const b of pending) {
      const gw = (b as any).payment?.gatewayId
      if (gw) {
        if (!groupsByGateway.has(gw)) groupsByGateway.set(gw, [])
        groupsByGateway.get(gw)!.push(b)
      } else if ((b as any).payment?.pixQrCode) {
        ungrouped.push(b)
      }
    }
    type Group = {
      primary: BookingWithDetails
      bookingIds: string[]
      count: number
      total: number
      minsLeft: number
    }
    const result: Group[] = []
    for (const items of groupsByGateway.values()) {
      // O primário é o registro que mantém o pixQrCode
      const primary = items.find((b) => (b as any).payment?.pixQrCode) ?? items[0]
      const total = items.reduce((s, b) => s + Number((b as any).payment?.amount ?? 0), 0)
      const earliestCreated = items.reduce(
        (min, b) => Math.min(min, new Date(b.createdAt).getTime()),
        Date.now()
      )
      const minsLeft = Math.max(
        0,
        Math.ceil((earliestCreated + PIX_VALIDITY_MIN * 60 * 1000 - Date.now()) / 60000)
      )
      result.push({
        primary,
        bookingIds: items.map((b) => b.id),
        count: items.length,
        total,
        minsLeft,
      })
    }
    for (const b of ungrouped) {
      const minsLeft = Math.max(
        0,
        Math.ceil((new Date(b.createdAt).getTime() + PIX_VALIDITY_MIN * 60 * 1000 - Date.now()) / 60000)
      )
      result.push({
        primary: b,
        bookingIds: [b.id],
        count: 1,
        total: Number((b as any).payment?.amount ?? b.totalValue ?? 0),
        minsLeft,
      })
    }
    return result
  }, [allBookings])

  const filtered = allBookings.filter((b) => {
    const d = new Date(String(b.date).slice(0, 10) + 'T12:00:00')
    const now = new Date()
    if (filter === 'upcoming') return d >= now && b.status !== 'CANCELLED'
    if (filter === 'past') return d < now && b.status !== 'CANCELLED'
    if (filter === 'cancelled') return b.status === 'CANCELLED'
    return true
  })

  // Agrupa os horários filtrados por pedido (orderId). Cada pedido = um checkout
  // (vários horários) com um único código de acesso, como um carrinho de e-commerce.
  const groupedOrders = useMemo(() => {
    const map = new Map<string, BookingWithDetails[]>()
    for (const b of filtered) {
      const key = b.orderId ?? b.id
      const arr = map.get(key)
      if (arr) arr.push(b)
      else map.set(key, [b])
    }
    return Array.from(map.entries())
      .map(([orderId, items]) => {
        const sorted = [...items].sort((a, b) => {
          const courtA = a.court?.name ?? ''
          const courtB = b.court?.name ?? ''
          if (courtA !== courtB) return courtA.localeCompare(courtB, 'pt-BR')
          const dateDiff = +new Date(a.date) - +new Date(b.date)
          if (dateDiff !== 0) return dateDiff
          return a.startTime.localeCompare(b.startTime)
        })
        return {
          orderId,
          bookings: sorted,
          primary: sorted[0],
          count: items.length,
          total: items.reduce((s, b) => s + Number((b as any).payment?.amount ?? b.totalValue), 0),
          createdAt: items.reduce((min, b) => (b.createdAt < min ? b.createdAt : min), items[0].createdAt),
        }
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [filtered])

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

  // Pedidos de cartão que aguardam confirmação do MP (in_process)
  const pendingCardGroups = useMemo(() => {
    const map = new Map<string, BookingWithDetails[]>()
    for (const b of allBookings) {
      const payment = (b as any).payment
      if (b.status !== 'PENDING') continue
      if (payment?.method !== 'CREDIT_CARD') continue
      if (payment?.pixQrCode) continue // PIX, não cartão
      const key = b.orderId ?? b.id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return Array.from(map.entries()).map(([orderId, items]) => {
      const primary = items[0]
      const total = items.reduce((s, b) => s + Number((b as any).payment?.amount ?? b.totalValue), 0)
      return { orderId, primary, bookingIds: items.map((b) => b.id), count: items.length, total }
    })
  }, [allBookings])

  return { filtered, groupedOrders, isLoading, filter, setFilter, cancelBooking, cancelling, pendingPixGroups, pendingCardGroups }
}
