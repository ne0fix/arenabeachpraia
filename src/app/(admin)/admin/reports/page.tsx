'use client'

import { Download } from 'lucide-react'
import { Button } from '@/views/components/ui/Button'
import { StatsCard } from '@/views/components/admin/StatsCard'
import { RevenueChart } from '@/views/components/admin/RevenueChart'
import { OccupancyChart } from '@/views/components/admin/OccupancyChart'
import { useReportsViewModel } from '@/viewmodels/admin/useReportsViewModel'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { TrendingUp, TrendingDown, DollarSign, CalendarDays } from 'lucide-react'
import { cn } from '@/core/utils/helpers'

const PERIODS = [
  { key: 'daily', label: 'Diário' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
] as const

export default function AdminReportsPage() {
  const vm = useReportsViewModel()
  const summary = vm.reportData?.summary

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-headline text-2xl text-on-surface font-bold">Relatórios</h1>
          <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest">
            Análise de performance
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={vm.exportCsv}
        >
          Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
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
        <input
          type="date"
          value={vm.startDate}
          onChange={(e) => vm.setStartDate(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2 font-sans text-sm focus:outline-none focus:border-primary"
        />
        <span className="font-headline text-xs text-on-surface-variant">até</span>
        <input
          type="date"
          value={vm.endDate}
          onChange={(e) => vm.setEndDate(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2 font-sans text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total de Agendamentos" value={summary.total} icon={<CalendarDays className="w-5 h-5" />} color="primary" />
          <StatsCard title="Receita Bruta" value={formatCurrency(summary.totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="success" />
          <StatsCard title="Estornos" value={formatCurrency(summary.refundedAmount)} icon={<TrendingDown className="w-5 h-5" />} color="danger" />
          <StatsCard title="Receita Líquida" value={formatCurrency(summary.netRevenue)} icon={<DollarSign className="w-5 h-5" />} color="primary" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vm.reportData?.chartData && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sun-shadow">
            <h3 className="font-headline text-lg text-on-surface font-bold mb-6">Receita no Período</h3>
            <RevenueChart data={vm.reportData.chartData} />
          </div>
        )}

        {vm.reportData?.chartData && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sun-shadow">
            <h3 className="font-headline text-lg text-on-surface font-bold mb-6">Volume de Agendamentos</h3>
            <OccupancyChart
              data={vm.reportData.chartData.map((d: any) => ({
                hour: d.label,
                count: Math.round(d.revenue / 87.5),
              }))}
            />
          </div>
        )}
      </div>

      {vm.reportData?.bookings && vm.reportData.bookings.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 sun-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
            <h3 className="font-headline text-lg text-on-surface font-bold">
              Agendamentos ({vm.reportData.bookings.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant/30">
                  {['Data', 'Quadra', 'Cliente', 'Horário', 'Valor', 'Status', 'Pagamento'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-headline text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {vm.reportData.bookings.slice(0, 50).map((b: any) => (
                  <tr key={b.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3 font-headline text-xs text-on-surface-variant whitespace-nowrap">
                      {new Date(String(b.date).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-headline text-sm text-on-surface">{b.court?.name}</td>
                    <td className="px-4 py-3 font-headline text-sm text-on-surface">{b.user?.name}</td>
                    <td className="px-4 py-3 font-headline text-sm text-on-surface">{b.startTime}</td>
                    <td className="px-4 py-3 font-headline text-sm text-primary font-bold">
                      {formatCurrency(Number(b.totalValue))}
                    </td>
                    <td className="px-4 py-3 font-headline text-xs text-on-surface-variant">{b.status}</td>
                    <td className="px-4 py-3 font-headline text-xs text-on-surface-variant">
                      {b.payment?.method ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
