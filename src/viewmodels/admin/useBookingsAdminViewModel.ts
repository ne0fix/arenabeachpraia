'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminOrder, BookingStatus } from '@/models/entities/Booking'

interface Filters {
  status?: BookingStatus
  courtId?: string
  date?: string
  search?: string
  page: number
}

export function useBookingsAdminViewModel() {
  const [filters, setFilters] = useState<Filters>({ page: 1 })

  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.courtId) params.set('courtId', filters.courtId)
  if (filters.date) params.set('date', filters.date)
  params.set('page', String(filters.page))
  params.set('limit', '20')

  const { data, isLoading, refetch } = useQuery<{ orders: AdminOrder[]; total: number }>({
    queryKey: ['admin-bookings', filters],
    queryFn: () => fetch(`/api/bookings?${params.toString()}`).then((r) => r.json()),
  })

  const totalPages = Math.ceil((data?.total ?? 0) / 20)

  const setFilter = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const nextPage = () => setFilters((p) => ({ ...p, page: Math.min(p.page + 1, totalPages) }))
  const prevPage = () => setFilters((p) => ({ ...p, page: Math.max(p.page - 1, 1) }))

  return {
    orders: data?.orders ?? [],
    total: data?.total ?? 0,
    totalPages,
    filters,
    setFilter,
    nextPage,
    prevPage,
    isLoading,
    refetch,
  }
}
