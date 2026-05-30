'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import { BookingTable } from '@/views/components/admin/BookingTable'
import { useBookingsAdminViewModel } from '@/viewmodels/admin/useBookingsAdminViewModel'
import { cn } from '@/core/utils/helpers'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'CONFIRMED', label: 'Confirmados' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'CANCELLED', label: 'Cancelados' },
  { value: 'COMPLETED', label: 'Realizados' },
]

export default function AdminBookingsPage() {
  const vm = useBookingsAdminViewModel()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl text-on-surface font-bold">Agendamentos</h1>
          <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest">
            {vm.total} registros
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 flex-1 min-w-48">
          <Search className="w-4 h-4 text-outline" />
          <input
            placeholder="Buscar cliente ou quadra..."
            className="bg-transparent border-none p-0 focus:ring-0 font-sans text-sm text-on-surface placeholder:text-outline-variant outline-none flex-1"
          />
        </div>

        <input
          type="date"
          value={vm.filters.date ?? ''}
          onChange={(e) => vm.setFilter('date', e.target.value || undefined)}
          className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 font-sans text-sm text-on-surface focus:outline-none focus:border-primary"
        />

        <div className="flex gap-2 overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => vm.setFilter('status', opt.value || undefined)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-xl font-headline text-xs font-bold transition-all',
                (vm.filters.status ?? '') === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <BookingTable orders={vm.orders} isLoading={vm.isLoading} />

      {vm.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="font-headline text-xs text-on-surface-variant">
            Página {vm.filters.page} de {vm.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={vm.prevPage}
              disabled={vm.filters.page === 1}
              className="px-4 py-2 rounded-xl border border-outline-variant/30 font-headline text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-all"
            >
              Anterior
            </button>
            <button
              onClick={vm.nextPage}
              disabled={vm.filters.page === vm.totalPages}
              className="px-4 py-2 rounded-xl border border-outline-variant/30 font-headline text-sm font-bold disabled:opacity-40 hover:bg-surface-container transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
