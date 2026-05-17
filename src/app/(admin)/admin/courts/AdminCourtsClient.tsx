'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Users, Clock, X } from 'lucide-react'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { CourtImageCarousel } from '@/views/components/business/CourtImageCarousel'
import { CourtScheduleTabs } from '@/views/components/admin/CourtScheduleTabs'
import type { Court } from '@/models/entities/Court'

export function AdminCourtsClient({ initialCourts }: { initialCourts: Court[] }) {
  const [courts, setCourts] = useState(initialCourts)
  const [modalCourt, setModalCourt] = useState<Court | null>(null)

  const handleCourtUpdated = (updated: Court) => {
    setCourts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setModalCourt(updated)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl text-on-surface font-bold">Quadras</h1>
            <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest">
              {courts.length} quadras cadastradas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map((court) => (
            <div key={court.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden sun-shadow flex flex-col">
              <div className="relative h-40">
                <CourtImageCarousel
                  images={court.images ?? []}
                  fallbackUrl={court.imageUrl}
                  name={court.name}
                />
                <div className={`absolute top-3 right-3 z-10 px-2 py-1 rounded-full font-headline text-[10px] font-bold uppercase ${court.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {court.isActive ? 'Ativa' : 'Inativa'}
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-headline text-lg text-on-surface font-bold leading-tight">{court.name}</h3>
                    <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{court.type}</p>
                  </div>
                  <span className="font-headline text-sm text-primary font-bold flex-shrink-0 ml-2">
                    {court.pricePerHour > 0 ? `${formatCurrency(court.pricePerHour)}/h` : 'Gratuito'}
                  </span>
                </div>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-headline text-xs font-medium truncate">{court.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Users className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-headline text-xs font-medium">Até {court.maxPlayers} jogadores</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-headline text-xs font-medium">
                      {court.morningEnabled ? `${court.morningOpen}–${court.morningClose}` : ''}
                      {court.morningEnabled && court.afternoonEnabled ? ' · ' : ''}
                      {court.afternoonEnabled ? `${court.afternoonOpen}–${court.afternoonClose}` : ''}
                    </span>
                  </div>
                </div>

                {/* Botões alinhados na parte inferior */}
                <div className="mt-auto grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCourt(court)}
                    className="col-span-3 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all text-center"
                  >
                    Gerenciar Horários
                  </button>
                  <Link
                    href="/admin/settings"
                    className="col-span-2 bg-surface-container text-on-surface-variant hover:bg-outline-variant/30 px-3 py-2 rounded-xl font-headline text-[10px] font-bold uppercase transition-all text-center"
                  >
                    Editar
                  </Link>
                  <button className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl font-headline text-[10px] font-bold uppercase transition-all">
                    Desativar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de horários */}
      {modalCourt && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalCourt(null) }}
        >
          <div className="bg-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 flex-shrink-0">
              <div>
                <h2 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Horários — {modalCourt.name}
                </h2>
                <p className="font-headline text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
                  Configure disponibilidade e bloqueios
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalCourt(null)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="overflow-y-auto flex-1 p-5">
              <CourtScheduleTabs court={modalCourt} onCourtUpdated={handleCourtUpdated} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
