'use client'

import Image from 'next/image'
import { Calendar, Clock, CheckCircle, Clock3, XCircle } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/views/components/ui/Button'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { cn } from '@/core/utils/helpers'
import type { BookingWithDetails, BookingStatus } from '@/models/entities/Booking'

interface BookingCardProps {
  booking: BookingWithDetails
  onCancel?: (id: string) => void
  onClick?: () => void
}

const statusConfig: Record<BookingStatus, { icon: any; label: string; color: string; bg: string }> = {
  CONFIRMED: { icon: CheckCircle, label: 'Confirmada', color: 'text-green-700', bg: 'bg-green-50' },
  PENDING: { icon: Clock3, label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-50' },
  CANCELLED: { icon: XCircle, label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-50' },
  NO_SHOW: { icon: XCircle, label: 'Não compareceu', color: 'text-red-700', bg: 'bg-red-50' },
  COMPLETED: { icon: CheckCircle, label: 'Realizado', color: 'text-blue-700', bg: 'bg-blue-50' },
}

export function BookingCard({ booking, onCancel, onClick }: BookingCardProps) {
  const status = statusConfig[booking.status]
  const StatusIcon = status.icon
  const bookingDate = new Date(String(booking.date).slice(0, 10) + 'T12:00:00')

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden sun-shadow flex h-[104px] md:h-28 transition-all hover:border-primary/20',
        onClick && 'cursor-pointer active:scale-[0.99]'
      )}
    >
      <div className="relative w-24 h-full md:w-28 flex-shrink-0">
        {(booking.court.images?.[0] || booking.court.imageUrl) ? (
          <Image
            src={booking.court.images?.[0] || booking.court.imageUrl!}
            alt={booking.court.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-secondary-container flex items-center justify-center">
            <span className="font-headline text-primary font-bold text-xl">{booking.court.name[0]}</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-headline text-sm md:text-base text-on-surface font-extrabold truncate leading-tight">
              {booking.court.name}
            </h3>
            <span className={cn(
              "flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold flex items-center gap-1",
              status.bg,
              status.color
            )}>
              <StatusIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {status.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2.5 md:gap-3 text-on-surface-variant text-[10px] md:text-xs">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-primary" />
              {format(bookingDate, "dd 'de' MMM", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-primary" />
              {booking.startTime}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-primary font-headline text-sm md:text-base font-extrabold tracking-tight">
            {formatCurrency(booking.totalValue)}
          </span>
          
          <div className="flex items-center gap-3">
            {booking.status === 'CONFIRMED' && isToday(bookingDate) && (
              <Button size="sm" variant="secondary" className="h-7 md:h-8 px-3 text-[10px] md:text-xs font-bold">
                Jogar Agora
              </Button>
            )}
            {['CONFIRMED', 'PENDING'].includes(booking.status) && onCancel && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(booking.id) }}
                className="text-red-600 font-headline text-[10px] md:text-xs font-extrabold hover:text-red-700 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
