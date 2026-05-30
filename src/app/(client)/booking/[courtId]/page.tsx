'use client'

import { use } from 'react'
import { ArrowLeft, Users, ShoppingCart, Clock, AlertCircle, Check, ChevronRight, Ban } from 'lucide-react'
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

      <main className="w-full px-4 md:px-6 pb-48 md:pb-12 max-w-4xl mx-auto [overflow-x:clip]">
        <section className="mb-6 md:mb-8">
          <div className="relative h-44 md:h-64 rounded-3xl overflow-hidden sun-shadow mb-4 md:mb-6 group">
            <CourtImageCarousel
              images={vm.court.images ?? []}
              fallbackUrl={vm.court.imageUrl}
              name={vm.court.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4 md:p-6">
              <h2 className="text-white font-headline text-xl md:text-2xl font-bold truncate">{vm.court.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-on-surface-variant flex-wrap">
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
          <div className="relative -mx-4 md:mx-0">
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 court-scrollbar snap-x px-4 md:px-0">
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

          {/* Aviso de bloqueio parcial ou total */}
          {!vm.loadingSlots && (vm.availability as any)?.blockedPeriod && (
            <div className={cn(
              'mb-4 rounded-2xl p-4 flex items-start gap-3 border',
              (vm.availability as any).blockedPeriod === 'ALL_DAY'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            )}>
              <Ban className={cn('w-5 h-5 flex-shrink-0 mt-0.5',
                (vm.availability as any).blockedPeriod === 'ALL_DAY' ? 'text-red-500' : 'text-amber-600'
              )} />
              <div>
                <p className={cn('font-headline text-sm font-bold',
                  (vm.availability as any).blockedPeriod === 'ALL_DAY' ? 'text-red-700' : 'text-amber-800'
                )}>
                  {(vm.availability as any).blockedPeriod === 'ALL_DAY'
                    ? 'Quadra reservada — dia inteiro indisponível'
                    : (vm.availability as any).blockedPeriod === 'MORNING'
                    ? 'Período da manhã reservado — apenas tarde disponível'
                    : 'Período da tarde reservado — apenas manhã disponível'}
                </p>
                <p className="font-headline text-xs text-on-surface-variant mt-0.5">
                  {(vm.availability as any).blockedPeriod === 'ALL_DAY'
                    ? 'Nenhum horário pode ser reservado nesta data. Escolha outro dia.'
                    : 'Os horários do período reservado não estão disponíveis para agendamento.'}
                </p>
              </div>
            </div>
          )}

          {vm.loadingSlots ? (
            <Loader size="sm" />
          ) : !vm.availability?.slots.length && !(vm.availability as any)?.blockedPeriod ? (
            <p className="font-headline text-sm text-on-surface-variant text-center py-8">
              Nenhum horário disponível para esta data.
            </p>
          ) : !vm.availability?.slots.length && (vm.availability as any)?.blockedPeriod === 'ALL_DAY' ? null : (
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
                      // Verifica se é início ou fim de algum bloco contíguo
                      const runStart = vm.selectionRuns.some((r) => r[0] === slot.time && r.length > 1)
                      const runEnd = vm.selectionRuns.some((r) => r[r.length - 1] === slot.time && r.length > 1)
                      return (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => vm.handleSlotSelect(slot.time)}
                          className={cn(
                            'py-2.5 md:py-3 px-1 rounded-xl border font-headline text-xs md:text-sm font-bold transition-all relative',
                            !slot.available && 'bg-surface-container-low text-outline/40 border-outline-variant/10 cursor-not-allowed',
                            slot.available && !isSelected && 'bg-surface-container text-on-surface border-outline-variant/30 hover:bg-secondary-container cursor-pointer',
                            isSelected && 'bg-primary text-white border-primary shadow-md cursor-pointer',
                            (runStart || runEnd) && 'scale-105'
                          )}
                        >
                          {slot.time}
                          {runStart && (
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

        {/* Barra flutuante do carrinho — aparece quando há itens */}
        <AnimatePresence>
          {vm.cartCount > 0 && vm.selectedSlots.length === 0 && !vm.addedFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 md:bottom-6 left-0 right-0 p-4 md:px-6 z-[60] bg-surface border-t md:border-none border-outline-variant/30"
            >
              <div className="max-w-4xl mx-auto">
                <button
                  onClick={vm.goToCart}
                  className="w-full bg-primary text-white rounded-2xl p-4 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-lg p-1.5">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-headline text-[10px] font-bold uppercase tracking-wider opacity-80">
                        {vm.cartCount} {vm.cartCount === 1 ? 'item' : 'itens'} no carrinho
                      </p>
                      <p className="font-headline text-base font-bold">{formatCurrency(vm.cartTotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-headline text-sm font-bold">
                    Ir para o Carrinho <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Painel de seleção atual */}
        <AnimatePresence>
          {(vm.selectedSlots.length > 0 || vm.addedFeedback) && (
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 md:bottom-6 left-0 right-0 p-4 md:px-6 z-[60] bg-surface border-t md:border-none border-outline-variant/30"
            >
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                {/* Aviso de item adicionado */}
                {vm.addedFeedback && (
                  <div className="flex items-center gap-2 bg-green-500 text-white rounded-xl px-4 py-2.5">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span className="font-headline text-xs font-bold">
                      Adicionado ao carrinho! Selecione outro horário ou{' '}
                      <button onClick={vm.goToCart} className="underline">
                        vá para o carrinho
                      </button>
                      .
                    </span>
                  </div>
                )}

                {/* Seleção atual (só mostra quando slots estão selecionados) */}
                {vm.selectedSlots.length > 0 && (
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    <div className="bg-surface-container-lowest border border-primary/10 p-3 md:p-4 rounded-2xl shadow-lg flex-1">
                      <div className="flex items-center gap-2">
                        {/* Ícone */}
                        <div className="p-2 bg-secondary-container rounded-lg text-primary flex-shrink-0 self-start">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        {/* Data + horários */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight">
                            {format(vm.selectedDate, "dd 'de' MMM", { locale: ptBR })}
                            {' · '}{vm.selectedDurationHours}h
                            {vm.isNonContiguous && ` · ${vm.selectionRuns.length} blocos`}
                          </p>
                          {vm.isNonContiguous ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {vm.selectionRunsWithEnd.map((run) => (
                                <div key={run.startTime} className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                                  <span className="font-headline text-xs font-bold text-on-surface whitespace-nowrap">
                                    {run.startTime}–{run.endTime}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                              <span className="font-headline text-sm font-bold text-on-surface whitespace-nowrap">
                                {vm.selectedStartTime} — {vm.selectedEndTime}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Preço */}
                        <div className="flex-shrink-0 text-right self-center">
                          <p className="font-headline text-base md:text-xl font-bold text-primary whitespace-nowrap">
                            {formatCurrency(vm.selectedTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full md:w-auto md:px-12 h-12 md:h-14 text-sm md:text-lg" onClick={vm.addToCart}>
                      Adicionar ao Carrinho
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  )
}
