'use client'

import { CalendarDays, TrendingUp, XCircle, BarChart3, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { StatsCard } from '@/views/components/admin/StatsCard'
import { OccupancyChart } from '@/views/components/admin/OccupancyChart'
import { RevenueChart } from '@/views/components/admin/RevenueChart'
import { Badge } from '@/views/components/ui/Badge'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { useDashboardViewModel } from '@/viewmodels/admin/useDashboardViewModel'
import { cn } from '@/core/utils/helpers'

const PERIODS = [
  { key: 'daily', label: 'Hoje' },
  { key: 'weekly', label: 'Semana' },
  { key: 'monthly', label: 'Mês' },
] as const

export default function DashboardPage() {
  const vm = useDashboardViewModel()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl text-on-surface font-bold">Dashboard</h1>
          <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest">
            {format(vm.selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => vm.setPeriod(p.key)}
              className={cn(
                'px-4 py-2 rounded-xl font-headline text-sm font-bold transition-all',
                vm.period === p.key
                  ? 'bg-primary text-white sun-shadow'
                  : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {vm.kpis?.hasPendingRefund && (
        <Link
          href="/admin/financeiro"
          className="block bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-headline text-sm font-bold text-amber-800">
                Estornos manuais pendentes: {vm.kpis.pendingManualRefundAmount}
              </p>
              <p className="font-headline text-xs text-amber-700 mt-0.5">
                Clientes pagaram em horários já confirmados por outros. Processe o estorno no painel financeiro.
              </p>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {vm.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface-container animate-pulse rounded-2xl border border-outline-variant/30" />
          ))
        ) : (
          <>
            <StatsCard
              title="Agendamentos"
              value={vm.kpis?.totalBookings ?? 0}
              icon={<CalendarDays className="w-5 h-5" />}
              color="primary"
            />
            <StatsCard
              title="Receita Líquida"
              value={vm.kpis?.netRevenue ?? 'R$ 0,00'}
              icon={<TrendingUp className="w-5 h-5" />}
              color="success"
            />
            <StatsCard
              title="Cancelamentos"
              value={vm.kpis ? `${vm.kpis.cancelledBookings} (${vm.kpis.cancellationRate})` : '0 (0%)'}
              icon={<XCircle className="w-5 h-5" />}
              color="warning"
            />
            <StatsCard
              title="Taxa de Ocupação"
              value={vm.kpis?.occupancyRate ?? '0%'}
              icon={<BarChart3 className="w-5 h-5" />}
              color="primary"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sun-shadow">
          <h3 className="font-headline text-lg text-on-surface font-bold mb-6">
            Ocupação por Hora
          </h3>
          {vm.stats?.bookingsByHour ? (
            <OccupancyChart data={vm.stats.bookingsByHour} />
          ) : (
            <div className="h-40 bg-surface-container animate-pulse rounded-xl" />
          )}
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sun-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-lg text-on-surface font-bold">Receita</h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-1 font-headline text-xs text-on-surface-variant">
                <span className="w-3 h-1 bg-primary rounded" /> Receita
              </span>
              <span className="flex items-center gap-1 font-headline text-xs text-on-surface-variant">
                <span className="w-3 h-1 bg-red-400 rounded" /> Estornos
              </span>
            </div>
          </div>
          {vm.stats?.bookingsByDay ? (
            <RevenueChart
              data={vm.stats.bookingsByDay.map((d) => ({
                label: d.day,
                revenue: d.count * 87.5,
                refunds: 0,
              }))}
            />
          ) : (
            <div className="h-52 bg-surface-container animate-pulse rounded-xl" />
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 sun-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h3 className="font-headline text-lg text-on-surface font-bold">Últimos Agendamentos</h3>
        </div>
        <div className="divide-y divide-outline-variant/20">
          {vm.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-surface-container animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-surface-container animate-pulse rounded" />
                  <div className="h-3 w-48 bg-surface-container animate-pulse rounded" />
                </div>
              </div>
            ))
          ) : vm.stats?.recentBookings?.length === 0 ? (
            <div className="px-6 py-8 text-center font-headline text-on-surface-variant">
              Nenhum agendamento no período
            </div>
          ) : (
            vm.stats?.recentBookings?.map((b: any) => (
              <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="font-headline text-primary font-bold text-sm">
                    {b.user?.name?.[0] ?? '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-headline text-sm text-on-surface font-bold">{b.user?.name}</p>
                  <p className="font-headline text-xs text-on-surface-variant">
                    {b.courtNames?.length > 1 ? `${b.courtNames.length} quadras` : b.court?.name}
                    {' — '}
                    {b.count > 1 ? `${b.count} horários` : b.startTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-headline text-sm text-primary font-bold">
                    {formatCurrency(Number(b.totalValue))}
                  </p>
                  <Badge
                    variant={
                      b.status === 'CONFIRMED' ? 'success'
                      : b.status === 'PENDING' ? 'warning'
                      : 'danger'
                    }
                  >
                    {b.status === 'CONFIRMED' ? 'Confirmado' : b.status === 'PENDING' ? 'Pendente' : 'Cancelado'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
