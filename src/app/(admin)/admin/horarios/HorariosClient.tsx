'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/core/utils/helpers'
import type { Court } from '@/models/entities/Court'
import { CourtScheduleTabs } from '@/views/components/admin/CourtScheduleTabs'

export function HorariosClient({ initialCourts }: { initialCourts: Court[] }) {
  const [courts, setCourts] = useState(initialCourts)
  const [selected, setSelected] = useState<Court | null>(courts[0] ?? null)

  const handleUpdated = (updated: Court) => {
    setCourts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-headline text-2xl text-on-surface font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" /> Horários
        </h1>
        <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest mt-1">
          Configure disponibilidade, bloqueios e visualize a agenda
        </p>
      </div>

      {courts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {courts.map(c => (
            <button key={c.id} type="button" onClick={() => setSelected(c)}
              className={cn('px-4 py-2 rounded-xl font-headline text-xs font-bold transition-all border',
                selected?.id === c.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-primary/50'
              )}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!selected ? (
        <p className="font-headline text-sm text-on-surface-variant text-center py-12">Nenhuma quadra cadastrada.</p>
      ) : (
        <CourtScheduleTabs court={selected} onCourtUpdated={handleUpdated} />
      )}
    </div>
  )
}
