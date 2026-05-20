'use client'

import { use } from 'react'
import { ArrowLeft, MapPin, Users, ShoppingCart, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/views/components/ui/Button'
import { Loader } from '@/views/components/ui/Loader'
import { CourtImageCarousel } from '@/views/components/business/CourtImageCarousel'
import { useBookingViewModel } from '@/viewmodels/client/useBookingViewModel'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { cn } from '@/core/utils/helpers'

interface BookingPageProps {
  params: Promise<{ courtId: string }>
}

export default function BookingPage({ params }: BookingPageProps) {
  const { courtId } = use(params)
  const vm = useBookingViewModel(courtId)

  if (vm.loadingCourt) return <Loader />
  if (!vm.court) return <div className="p-8 text-center font-headline">Quadra não encontrada.</div>

  return (
    <>
      <header className="px-6 py-4 flex items-center gap-4 w-full overflow-hidden">
        <button
          onClick={vm.goBack}
          className="p-2 hover:bg-surface-container rounded-full transition-all active:scale-90 flex-shrink-0"
        >
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h1 className="font-headline font-bold text-lg text-primary tracking-tight truncate">Reservar Horário</h1>
      </header>

      <main className="w-full px-4 md:px-6 pb-32 md:pb-12 max-w-4xl mx-auto overflow-x-hidden">
        <section className="mb-6 md:mb-8">
          <div className="relative h-44 md:h-64 rounded-3xl overflow-hidden sun-shadow mb-4 md:mb-6 group">
            <CourtImageCarousel
              images={vm.court.images ?? []}
              fallbackUrl={vm.court.imageUrl}
              name={vm.court.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4 md:p-6">
              <span className="inline-block px-2 py-0.5 bg-primary text-white text-[9px] uppercase font-bold rounded-full w-fit mb-1">
                {vm.court.location}
              </span>
              <h2 className="text-white font-headline text-xl md:text-2xl font-bold truncate">{vm.court.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-on-surface-variant flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-headline text-[11px] font-bold truncate">{vm.court.location}</span>
            </div>
            {vm.court.showCapacity && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-headline text-[11px] font-bold">Até {vm.court.maxPlayers} jogadores</span>
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 md:mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="font-headline text-base md:text-lg text-primary font-bold">Selecione a Data</h3>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
                {format(vm.selectedDate, 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 court-scrollbar snap-x">
              {vm.days.map((day) => {
                const isActive = format(day, 'yyyy-MM-dd') === format(vm.selectedDate, 'yyyy-MM-dd')
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => vm.handleDateChange(day)}
                    className={cn(
                      'flex-shrink-0 w-16 h-20 md:w-20 md:h-24 rounded-2xl flex flex-col items-center justify-center transition-all snap-center',
                      isActive
                        ? 'bg-primary text-white shadow-lg scale-105'
                        : 'bg-surface-container border border-outline-variant/30 text-on-surface hover:border-primary/50'
                    )}
                  >
                    <span className="text-[9px] md:text-[10px] font-bold uppercase opacity-80">
                      {format(day, 'EEE', { locale: ptBR })}
                    </span>
                    <span className="text-xl md:text-2xl font-bold my-0.5 md:my-1">{format(day, 'dd')}</span>
                    <span className="text-[9px] md:text-[10px] font-semibold uppercase">
                      {format(day, 'MMM', { locale: ptBR })}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h3 className="font-headline text-base md:text-lg text-primary mb-4 md:mb-6 font-bold">Horários Disponíveis</h3>
          {vm.loadingSlots ? (
            <Loader size="sm" />
          ) : !vm.availability?.slots.length ? (
            <p className="font-headline text-sm text-on-surface-variant text-center py-8">
              Nenhum horário disponível para esta data.
            </p>
          ) : (
            <div className="space-y-5">
              {vm.slotGroups.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('w-2 h-2 rounded-full', group.color)} />
                    <span className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-outline-variant/20" />
                    <span className="font-headline text-[9px] text-on-surface-variant">
                      {group.slots.filter((s) => s.available).length} disponíveis
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                    {group.slots.map((slot) => {
                      const isSelected = vm.selectedSlots.includes(slot.time)
                      const isFirst = vm.selectedSlots[0] === slot.time
                      const isLast = vm.selectedSlots[vm.selectedSlots.length - 1] === slot.time
                      return (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => vm.handleSlotSelect(slot.time)}
                          className={cn(
                            'py-2.5 md:py-3 px-1 rounded-xl border font-headline text-xs md:text-sm font-bold transition-all relative',
                            !slot.available && 'bg-surface-container-low text-outline/40 border-outline-variant/10 cursor-not-allowed',
                            slot.available && !isSelected && 'bg-surface-container text-on-surface border-outline-variant/30 hover:bg-secondary-container',
                            isSelected && 'bg-primary text-white border-primary shadow-md',
                            (isFirst || isLast) && isSelected && 'scale-105'
                          )}
                        >
                          {slot.time}
                          {isFirst && vm.selectedSlots.length > 1 && (
                            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full border border-white" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <AnimatePresence>
                    {vm.slotError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="font-headline text-xs font-medium">{vm.slotError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </section>

        <AnimatePresence>
          {vm.selectedSlots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 md:bottom-6 left-0 right-0 p-4 md:px-6 z-[60] bg-surface/95 backdrop-blur-lg border-t md:border-none border-outline-variant/30"
            >
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="bg-surface-container-lowest border border-primary/10 p-3 md:p-4 rounded-2xl shadow-lg flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-secondary-container rounded-lg text-primary flex-shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                          {format(vm.selectedDate, "dd 'de' MMM", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-primary flex-shrink-0" />
                          <p className="font-headline text-sm font-bold text-on-surface truncate">
                            {vm.selectedStartTime} — {vm.selectedEndTime}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {vm.selectedDurationHours}h · {vm.selectedSlots.length} {vm.selectedSlots.length === 1 ? 'horário' : 'horários'}
                      </p>
                      <p className="font-headline text-lg md:text-xl text-primary font-bold">
                        {formatCurrency(vm.selectedTotal)}
                      </p>
                    </div>
                  </div>
                </div>
                <Button className="w-full md:w-auto md:px-12 h-12 md:h-14 text-sm md:text-lg" onClick={vm.proceed}>
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  )
}
