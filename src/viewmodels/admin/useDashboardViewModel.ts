'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { formatCurrency } from '@/core/utils/formatCurrency'

export type Period = 'daily' | 'weekly' | 'monthly'

export interface AdminStats {
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  completedBookings: number
  totalRevenue: number
  pendingManualRefundAmount: number
  refundedAmount: number
  netRevenue: number
  occupancyRate: number
  topCourt: { id: string; name: string; count: number } | null
  bookingsByHour: { hour: string; count: number }[]
  bookingsByDay: { day: string; count: number }[]
  bookingsByWeek: { week: string; count: number }[]
  recentBookings: any[]
}

export function useDashboardViewModel() {
  const [period, setPeriod] = useState<Period>('daily')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats', period, dateStr],
    queryFn: () =>
      fetch(`/api/admin/stats?period=${period}&date=${dateStr}`).then((r) => {
        if (!r.ok) throw new Error('stats_error')
        return r.json()
      }),
    refetchInterval: 30_000,
  })

  const kpis = useMemo(() => {
    if (!stats) return null
    const total = stats.totalBookings || 1
    return {
      totalBookings: stats.totalBookings,
      confirmedBookings: stats.confirmedBookings,
      cancelledBookings: stats.cancelledBookings,
      cancellationRate: ((stats.cancelledBookings / total) * 100).toFixed(1) + '%',
      totalRevenue: formatCurrency(stats.totalRevenue),
      pendingManualRefundAmount: formatCurrency(stats.pendingManualRefundAmount ?? 0),
      hasPendingRefund: (stats.pendingManualRefundAmount ?? 0) > 0,
      refundedAmount: formatCurrency(stats.refundedAmount),
      netRevenue: formatCurrency(stats.netRevenue),
      occupancyRate: (stats.occupancyRate ?? 0).toFixed(1) + '%',
    }
  }, [stats])

  return { period, setPeriod, selectedDate, setSelectedDate, stats, kpis, isLoading }
}
