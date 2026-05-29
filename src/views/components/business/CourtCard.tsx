'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ArrowRight, MessageCircle } from 'lucide-react'
import { Button } from '@/views/components/ui/Button'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { CourtImageCarousel } from '@/views/components/business/CourtImageCarousel'
import { useSiteSettings, buildWaLink } from '@/views/providers/SiteSettingsProvider'
import { cn } from '@/core/utils/helpers'
import type { Court } from '@/models/entities/Court'

interface CourtCardProps {
  court: Court
}

export function CourtCard({ court }: CourtCardProps) {
  const router = useRouter()
  const isExclusive = court.type === 'EXCLUSIVE'
  const { whatsappNumber: globalWhatsapp, msgExclusive } = useSiteSettings()
  const whatsappNumber = court.courtWhatsapp?.trim() || globalWhatsapp

  const hasSports = court.sports && court.sports.length > 0
  const [selectedSports, setSelectedSports] = useState<string[]>([])

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  const handleAgendar = () => {
    const query = selectedSports.length > 0
      ? `?sports=${encodeURIComponent(selectedSports.join(','))}`
      : ''
    router.push(`/booking/${court.id}${query}`)
  }

  return (
    <div className="flex flex-col group h-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden sun-shadow transition-all hover:border-primary/20">
      <div className="relative h-48 md:h-56 overflow-hidden">
        <CourtImageCarousel
          images={court.images ?? []}
          fallbackUrl={court.imageUrl}
          name={court.name}
        />
        <div className="absolute top-3 right-3 z-10">
          {isExclusive ? (
            <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-headline text-[9px] font-bold uppercase tracking-wider border border-amber-200 shadow-sm">
              Exclusivo
            </span>
          ) : (
            <span className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full font-headline text-[9px] text-primary flex items-center gap-1.5 shadow-sm font-bold border border-primary/5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Disponível
            </span>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-3 md:mb-4">
          <div className="space-y-0.5 md:space-y-1">
            <h3 className="font-headline text-lg md:text-xl text-on-surface font-bold leading-tight">{court.name}</h3>
          </div>
          {!isExclusive && (
            <div className="text-right">
              <span className="font-headline text-[9px] text-on-surface-variant block uppercase font-bold tracking-tighter">Valor/h</span>
              <span className="font-headline text-base md:text-lg text-primary font-extrabold">
                {formatCurrency(court.pricePerHour)}
              </span>
            </div>
          )}
        </div>

        <p className="text-on-surface-variant text-xs md:text-sm mb-4 md:mb-6 font-medium leading-relaxed">
          {court.description}
        </p>

        {court.showCapacity && (
          <div className="flex items-center gap-2 mb-5 md:mb-6">
            <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-lg">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="font-headline text-[10px] md:text-xs text-on-surface font-bold">Até {court.maxPlayers}</span>
            </div>
          </div>
        )}

        <div className="mt-auto">
          {isExclusive ? (
            <Button
              variant="whatsapp"
              className="w-full h-11 md:h-12 text-xs md:text-sm"
              leftIcon={<MessageCircle className="w-4 h-4 md:w-5 md:h-5" />}
              onClick={() => window.open(buildWaLink(whatsappNumber, msgExclusive, court.name), '_blank')}
            >
              Falar no WhatsApp
            </Button>
          ) : (
            <>
              {hasSports && (
                <div className="mb-3">
                  <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-2">
                    Escolha o(s) esporte(s)
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {court.sports.map((sport) => {
                      const checked = selectedSports.includes(sport)
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl border font-headline text-sm font-medium transition-all text-left',
                            checked
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-primary/40'
                          )}
                        >
                          <span className={cn(
                            'w-4 h-4 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all',
                            checked ? 'bg-primary border-primary' : 'border-outline-variant'
                          )}>
                            {checked && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {sport}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <Button
                className="w-full h-11 md:h-12 text-xs md:text-sm"
                rightIcon={<ArrowRight className="w-4 h-4 md:w-5 md:h-5" />}
                onClick={handleAgendar}
                disabled={hasSports && selectedSports.length === 0}
              >
                Agendar Horário
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
