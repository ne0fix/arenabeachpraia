'use client'

import Link from 'next/link'
import { MapPin, Users, ArrowRight, MessageCircle } from 'lucide-react'
import { Button } from '@/views/components/ui/Button'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { whatsAppService } from '@/services/WhatsAppService'
import { CourtImageCarousel } from '@/views/components/business/CourtImageCarousel'
import type { Court } from '@/models/entities/Court'

interface CourtCardProps {
  court: Court
}

export function CourtCard({ court }: CourtCardProps) {
  const isExclusive = court.type === 'EXCLUSIVE'

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
        <div className="flex justify-between items-start mb-3 md:mb-4">
          <div className="space-y-0.5 md:space-y-1">
            <h3 className="font-headline text-lg md:text-xl text-on-surface font-bold leading-tight">{court.name}</h3>
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="font-headline text-[10px] md:text-xs font-semibold">{court.location}</span>
            </div>
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

        <div className="flex items-center gap-2 mb-5 md:mb-6">
          <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="font-headline text-[10px] md:text-xs text-on-surface font-bold">Até {court.maxPlayers}</span>
          </div>
        </div>

        <div className="mt-auto">
          {isExclusive ? (
            <Button
              variant="whatsapp"
              className="w-full h-11 md:h-12 text-xs md:text-sm"
              leftIcon={<MessageCircle className="w-4 h-4 md:w-5 md:h-5" />}
              onClick={() => window.open(whatsAppService.getExclusiveLink(court.name), '_blank')}
            >
              Falar no WhatsApp
            </Button>
          ) : (
            <Link href={`/booking/${court.id}`} className="block">
              <Button className="w-full h-11 md:h-12 text-xs md:text-sm" rightIcon={<ArrowRight className="w-4 h-4 md:w-5 md:h-5" />}>
                Agendar Horário
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
