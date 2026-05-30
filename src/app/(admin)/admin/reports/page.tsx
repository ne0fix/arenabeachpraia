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

// Agrupa os agendamentos por pedido (orderId) para exibir unificado, como no
// menu Agendamentos. Reservas antigas sem orderId = pedido individual.
function groupReportOrders(bookings: any[]) {
  const map = new Map<string, any[]>()
  for (const b of bookings) {
    const key = b.orderId ?? b.id
    const arr = map.get(key)
    if (arr) arr.push(b)
    else map.set(key, [b])
  }
  return Array.from(map.entries()).map(([orderId, items]) => {
    const sorted = [...items].sort(
      (a, b) => +new Date(a.date) - +new Date(b.date) || String(a.startTime).localeCompare(String(b.startTime))
    )
    const first = sorted[0]
    const courts = Array.from(new Set(items.map((b) => b.court?.name).filter(Boolean)))
    return {
      orderId,
      first,
      count: items.length,
      courts,
      total: items.reduce((s, b) => s + Number(b.payment?.amount ?? b.totalValue), 0),
    }
  })
}

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
        <>
          {summary.pendingManualRefundAmount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <TrendingDown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-headline text-sm font-bold text-amber-800">
                  Aguardando estorno manual: {formatCurrency(summary.pendingManualRefundAmount)}
                </p>
                <p className="font-headline text-xs text-amber-700 mt-0.5">
                  Estes valores não são contados como receita confirmada. Processe os estornos no painel financeiro.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total de Agendamentos" value={summary.total} icon={<CalendarDays className="w-5 h-5" />} color="primary" />
            <StatsCard title="Receita Bruta" value={formatCurrency(summary.totalRevenue)} icon={<TrendingUp className="w-5 h-5" />} color="success" />
            <StatsCard title="Estornos" value={formatCurrency(summary.refundedAmount)} icon={<TrendingDown className="w-5 h-5" />} color="danger" />
            <StatsCard title="Receita Líquida" value={formatCurrency(summary.netRevenue)} icon={<DollarSign className="w-5 h-5" />} color="primary" />
          </div>
        </>
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

      {vm.reportData?.bookings && vm.reportData.bookings.length > 0 && (() => {
        const orders = groupReportOrders(vm.reportData.bookings)
        return (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 sun-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="font-headline text-lg text-on-surface font-bold">
                Pedidos ({orders.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/30">
                    {['Data', 'Quadra', 'Cliente', 'Pedido', 'Valor', 'Status', 'Pagamento'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-headline text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {orders.slice(0, 50).map((o) => (
                    <tr key={o.orderId} className="hover:bg-surface-container/50 transition-colors">
                      <td className="px-4 py-3 font-headline text-xs text-on-surface-variant whitespace-nowrap">
                        {new Date(String(o.first.date).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-headline text-sm text-on-surface">
                        {o.courts.length === 1 ? o.courts[0] : `${o.courts.length} quadras`}
                      </td>
                      <td className="px-4 py-3 font-headline text-sm text-on-surface">{o.first.user?.name}</td>
                      <td className="px-4 py-3 font-headline text-sm text-on-surface whitespace-nowrap">
                        {o.count > 1 ? <span className="font-bold text-primary">{o.count} horários</span> : o.first.startTime}
                      </td>
                      <td className="px-4 py-3 font-headline text-sm text-primary font-bold">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-4 py-3 font-headline text-xs text-on-surface-variant">{o.first.status}</td>
                      <td className="px-4 py-3 font-headline text-xs text-on-surface-variant">
                        {o.first.payment?.method ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
