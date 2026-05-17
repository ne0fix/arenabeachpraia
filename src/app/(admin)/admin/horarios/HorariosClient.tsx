'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock, CalendarDays, CalendarX, ChevronLeft, ChevronRight,
  Trash2, Plus, Save, Loader2, CheckCircle, AlertCircle, User,
} from 'lucide-react'
import { format, addDays, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/core/utils/helpers'
import type { Court } from '@/models/entities/Court'

interface Unavailability {
  id: string
  date: string
  reason: string | null
}

interface SlotInfo {
  time: string
  available: boolean
  booking?: {
    id: string
    userName: string
    userEmail: string
    status: string
  }
}

const SLOT_DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
]

const TODAY = startOfDay(new Date())

// ─── Utilitário ───────────────────────────────────────────────────────────────

function countSlots(open: string, close: string, duration: number): number {
  const toMin = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
  const diff = toMin(close) - toMin(open)
  return diff > 0 ? Math.floor(diff / duration) : 0
}

// ─── Bloco de período (Manhã / Tarde) ─────────────────────────────────────────

function PeriodBlock({
  label,
  color,
  enabled,
  open,
  close,
  slotDuration,
  onToggle,
  onOpen,
  onClose,
}: {
  label: string
  color: string
  enabled: boolean
  open: string
  close: string
  slotDuration: number
  onToggle: () => void
  onOpen: (v: string) => void
  onClose: (v: string) => void
}) {
  const slots = enabled ? countSlots(open, close, slotDuration) : 0
  const invalid = enabled && open >= close

  return (
    <div className={cn(
      'rounded-2xl border p-4 space-y-4 transition-all',
      enabled ? 'border-outline-variant/30 bg-surface-container-lowest' : 'border-outline-variant/20 bg-surface-container/30 opacity-60'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', color)} />
          <span className="font-headline text-sm font-bold text-on-surface">{label}</span>
          {enabled && slots > 0 && (
            <span className="font-headline text-[9px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/20">
              {slots} slot{slots !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {/* Toggle */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'relative w-10 h-5.5 rounded-full transition-all flex-shrink-0',
            enabled ? 'bg-primary' : 'bg-outline-variant/40'
          )}
          style={{ height: '22px', width: '40px' }}
        >
          <span className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
            enabled ? 'left-5' : 'left-0.5'
          )} />
        </button>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-headline text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1 block">
              Início
            </label>
            <input
              type="time"
              value={open}
              onChange={(e) => onOpen(e.target.value)}
              className={cn(
                'w-full bg-surface-container border rounded-xl px-3 py-2 font-headline text-sm text-on-surface focus:outline-none transition-colors',
                invalid ? 'border-red-400 focus:border-red-500' : 'border-outline-variant/40 focus:border-primary/50'
              )}
            />
          </div>
          <div>
            <label className="font-headline text-[9px] text-on-surface-variant uppercase font-bold tracking-widest mb-1 block">
              Fim
            </label>
            <input
              type="time"
              value={close}
              onChange={(e) => onClose(e.target.value)}
              className={cn(
                'w-full bg-surface-container border rounded-xl px-3 py-2 font-headline text-sm text-on-surface focus:outline-none transition-colors',
                invalid ? 'border-red-400 focus:border-red-500' : 'border-outline-variant/40 focus:border-primary/50'
              )}
            />
          </div>
        </div>
      )}

      {invalid && (
        <p className="font-headline text-[10px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Início deve ser anterior ao fim.
        </p>
      )}
    </div>
  )
}

// ─── Tab: Configuração de Horários ────────────────────────────────────────────

function TabConfig({ court, onSaved }: { court: Court; onSaved: (c: Court) => void }) {
  const [morningEnabled, setMorningEnabled] = useState(court.morningEnabled)
  const [morningOpen, setMorningOpen] = useState(court.morningOpen)
  const [morningClose, setMorningClose] = useState(court.morningClose)
  const [afternoonEnabled, setAfternoonEnabled] = useState(court.afternoonEnabled)
  const [afternoonOpen, setAfternoonOpen] = useState(court.afternoonOpen)
  const [afternoonClose, setAfternoonClose] = useState(court.afternoonClose)
  const [slotDuration, setSlotDuration] = useState(court.slotDuration)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isDirty =
    morningEnabled !== court.morningEnabled ||
    morningOpen !== court.morningOpen ||
    morningClose !== court.morningClose ||
    afternoonEnabled !== court.afternoonEnabled ||
    afternoonOpen !== court.afternoonOpen ||
    afternoonClose !== court.afternoonClose ||
    slotDuration !== court.slotDuration

  const hasError =
    (morningEnabled && morningOpen >= morningClose) ||
    (afternoonEnabled && afternoonOpen >= afternoonClose) ||
    (!morningEnabled && !afternoonEnabled)

  const totalSlots =
    (morningEnabled ? countSlots(morningOpen, morningClose, slotDuration) : 0) +
    (afternoonEnabled ? countSlots(afternoonOpen, afternoonClose, slotDuration) : 0)

  const handleSave = async () => {
    if (!morningEnabled && !afternoonEnabled) {
      setError('Ative pelo menos um período.')
      return
    }
    if (morningEnabled && morningOpen >= morningClose) {
      setError('Horários da manhã inválidos.')
      return
    }
    if (afternoonEnabled && afternoonOpen >= afternoonClose) {
      setError('Horários da tarde inválidos.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/courts/${court.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          morningEnabled, morningOpen, morningClose,
          afternoonEnabled, afternoonOpen, afternoonClose,
          slotDuration,
        }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Falha ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PeriodBlock
        label="Manhã"
        color="bg-amber-400"
        enabled={morningEnabled}
        open={morningOpen}
        close={morningClose}
        slotDuration={slotDuration}
        onToggle={() => setMorningEnabled((v) => !v)}
        onOpen={setMorningOpen}
        onClose={setMorningClose}
      />

      <PeriodBlock
        label="Tarde"
        color="bg-orange-500"
        enabled={afternoonEnabled}
        open={afternoonOpen}
        close={afternoonClose}
        slotDuration={slotDuration}
        onToggle={() => setAfternoonEnabled((v) => !v)}
        onOpen={setAfternoonOpen}
        onClose={setAfternoonClose}
      />

      {/* Duração dos slots */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 space-y-3">
        <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest block flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Duração de cada slot
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SLOT_DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSlotDuration(opt.value)}
              className={cn(
                'py-2.5 rounded-xl border font-headline text-xs font-bold transition-all',
                slotDuration === opt.value
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-primary/50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prévia */}
      {totalSlots > 0 && (
        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-center justify-between">
          <div>
            <p className="font-headline text-xs text-primary font-bold">
              {totalSlots} slot{totalSlots !== 1 ? 's' : ''} disponíveis por dia
            </p>
            <p className="font-headline text-[10px] text-on-surface-variant mt-0.5">
              {morningEnabled && `Manhã: ${morningOpen}–${morningClose}`}
              {morningEnabled && afternoonEnabled && ' · '}
              {afternoonEnabled && `Tarde: ${afternoonOpen}–${afternoonClose}`}
              {` · ${slotDuration} min/slot`}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="font-headline text-[10px] text-red-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !isDirty || hasError}
        className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40 px-4 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
      >
        {saving ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
        ) : saved ? (
          <><CheckCircle className="w-3.5 h-3.5" /> Salvo!</>
        ) : (
          <><Save className="w-3.5 h-3.5" /> Salvar Configuração</>
        )}
      </button>
    </div>
  )
}

// ─── Tab: Datas Bloqueadas ─────────────────────────────────────────────────────

function TabBloqueio({ court }: { court: Court }) {
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const fetchUnavailabilities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courts/${court.id}/unavailability`)
      const data = await res.json()
      setUnavailabilities(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [court.id])

  useEffect(() => { fetchUnavailabilities() }, [fetchUnavailabilities])

  const blockedDates = new Set(unavailabilities.map((u) => u.date))

  const handleAddBlock = async () => {
    if (!selectedDate) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/courts/${court.id}/unavailability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, reason: reason.trim() || undefined }),
      })
      if (res.status === 409) { setError('Esta data já está bloqueada.'); return }
      if (!res.ok) throw new Error()
      await fetchUnavailabilities()
      setSelectedDate(null)
      setReason('')
    } catch {
      setError('Falha ao bloquear. Tente novamente.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (unavailId: string) => {
    try {
      await fetch(`/api/admin/courts/${court.id}/unavailability/${unavailId}`, { method: 'DELETE' })
      setUnavailabilities((prev) => prev.filter((u) => u.id !== unavailId))
    } catch {
      setError('Falha ao desbloquear.')
    }
  }

  const calStart = startOfMonth(calendarMonth)
  const calEnd = endOfMonth(calendarMonth)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })
  const firstDow = calStart.getDay()

  return (
    <div className="space-y-5">
      {/* Calendário */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
            className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-primary" />
          </button>
          <span className="font-headline text-sm font-bold text-on-surface capitalize">
            {format(calendarMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            type="button"
            onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
            className="p-1.5 hover:bg-surface-container rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center font-headline text-[9px] font-bold text-on-surface-variant uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
          {calDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const isPast = isBefore(day, TODAY)
            const isBlocked = blockedDates.has(dateStr)
            const isSelected = selectedDate === dateStr
            const isCurrentDay = isToday(day)

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isPast}
                onClick={() => {
                  setSelectedDate(isSelected ? null : dateStr)
                  setError('')
                }}
                className={cn(
                  'aspect-square rounded-lg font-headline text-xs font-bold transition-all flex items-center justify-center',
                  isPast && 'text-outline/30 cursor-not-allowed',
                  !isPast && isBlocked && 'bg-red-500/15 text-red-600 border border-red-300/50',
                  !isPast && !isBlocked && !isSelected && isCurrentDay && 'bg-primary/10 text-primary border border-primary/30',
                  !isPast && !isBlocked && !isSelected && !isCurrentDay && 'hover:bg-surface-container text-on-surface',
                  isSelected && 'bg-primary text-white shadow-sm',
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline-variant/20">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500/15 border border-red-300/50" />
            <span className="font-headline text-[10px] text-on-surface-variant">Bloqueada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="font-headline text-[10px] text-on-surface-variant">Selecionada</span>
          </div>
        </div>
      </div>

      {/* Formulário de bloqueio */}
      {selectedDate && !blockedDates.has(selectedDate) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <p className="font-headline text-xs font-bold text-amber-800">
            Bloquear {format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM yyyy", { locale: ptBR })}
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 font-headline text-xs text-on-surface focus:outline-none focus:border-amber-400"
          />
          {error && <p className="font-headline text-[10px] text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddBlock}
              disabled={adding}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2.5 font-headline text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarX className="w-3.5 h-3.5" />}
              Confirmar Bloqueio
            </button>
            <button
              type="button"
              onClick={() => { setSelectedDate(null); setError('') }}
              className="px-4 bg-surface-container hover:bg-outline-variant/30 rounded-xl font-headline text-[10px] font-bold uppercase"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de datas bloqueadas */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5">
        <h3 className="font-headline text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <CalendarX className="w-4 h-4 text-red-500" />
          Datas Bloqueadas
          {unavailabilities.length > 0 && (
            <span className="bg-red-100 text-red-600 font-headline text-[9px] font-bold px-2 py-0.5 rounded-full">
              {unavailabilities.length}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : unavailabilities.length === 0 ? (
          <p className="font-headline text-xs text-on-surface-variant text-center py-4">
            Nenhuma data bloqueada.
          </p>
        ) : (
          <div className="space-y-2">
            {unavailabilities.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 bg-surface-container rounded-xl px-3 py-2.5 border border-outline-variant/20"
              >
                <CalendarX className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-headline text-xs font-bold text-on-surface">
                    {format(new Date(u.date + 'T12:00:00'), "dd 'de' MMMM yyyy", { locale: ptBR })}
                  </p>
                  {u.reason && (
                    <p className="font-headline text-[10px] text-on-surface-variant truncate">{u.reason}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(u.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Agenda do Dia ────────────────────────────────────────────────────────

function TabAgenda({ court }: { court: Court }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAgenda = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [availRes, bookRes] = await Promise.all([
        fetch(`/api/courts/${court.id}/availability?date=${date}`),
        fetch(`/api/bookings?courtId=${court.id}&date=${date}&limit=100`),
      ])
      const availData = await availRes.json()
      const bookData = await bookRes.json()

      const bookingsByTime: Record<string, { id: string; userName: string; userEmail: string; status: string }> = {}
      for (const b of (bookData.bookings ?? [])) {
        bookingsByTime[b.startTime] = {
          id: b.id,
          userName: b.user?.name ?? 'Cliente',
          userEmail: b.user?.email ?? '',
          status: b.status,
        }
      }

      const enriched: SlotInfo[] = (availData.slots ?? []).map((s: { time: string; available: boolean }) => ({
        ...s,
        booking: bookingsByTime[s.time],
      }))
      setSlots(enriched)
    } finally {
      setLoading(false)
    }
  }, [court.id])

  useEffect(() => { fetchAgenda(selectedDate) }, [fetchAgenda, selectedDate])

  const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Aguardando pag.',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
    COMPLETED: 'Concluído',
    NO_SHOW: 'Não compareceu',
  }
  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-red-100 text-red-600 border-red-200',
    COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
    NO_SHOW: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const days = Array.from({ length: 14 }, (_, i) => format(addDays(new Date(), i), 'yyyy-MM-dd'))

  return (
    <div className="space-y-5">
      {/* Seletor de data */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 court-scrollbar">
        {days.map((d) => {
          const isActive = d === selectedDate
          const dayObj = new Date(d + 'T12:00:00')
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={cn(
                'flex-shrink-0 w-14 h-16 rounded-xl flex flex-col items-center justify-center transition-all',
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-container border border-outline-variant/30 text-on-surface hover:border-primary/50'
              )}
            >
              <span className="text-[8px] font-bold uppercase opacity-80">
                {format(dayObj, 'EEE', { locale: ptBR })}
              </span>
              <span className="text-lg font-bold">{format(dayObj, 'dd')}</span>
              <span className="text-[8px] font-semibold uppercase">
                {format(dayObj, 'MMM', { locale: ptBR })}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grade de horários */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5">
        <h3 className="font-headline text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h3>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <p className="font-headline text-xs text-on-surface-variant text-center py-6">
            Quadra indisponível nesta data.
          </p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.time}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all',
                  slot.booking
                    ? STATUS_COLORS[slot.booking.status] ?? 'bg-surface-container border-outline-variant/20'
                    : 'bg-surface-container/40 border-outline-variant/10'
                )}
              >
                <span className="font-headline text-sm font-bold text-on-surface w-12 flex-shrink-0">
                  {slot.time}
                </span>
                {slot.booking ? (
                  <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-headline text-xs font-bold truncate">{slot.booking.userName}</p>
                        <p className="font-headline text-[10px] opacity-70 truncate">{slot.booking.userEmail}</p>
                      </div>
                    </div>
                    <span className="font-headline text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border flex-shrink-0">
                      {STATUS_LABELS[slot.booking.status] ?? slot.booking.status}
                    </span>
                  </div>
                ) : (
                  <span className="font-headline text-[11px] text-on-surface-variant">Disponível</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-outline-variant/20">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded-full border', STATUS_COLORS[key]?.split(' ')[0], STATUS_COLORS[key]?.split(' ')[2])} />
              <span className="font-headline text-[10px] text-on-surface-variant">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border bg-surface-container border-outline-variant/20" />
            <span className="font-headline text-[10px] text-on-surface-variant">Disponível</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

type Tab = 'config' | 'bloqueio' | 'agenda'

export function HorariosClient({ initialCourts }: { initialCourts: Court[] }) {
  const [courts, setCourts] = useState(initialCourts)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(courts[0] ?? null)
  const [tab, setTab] = useState<Tab>('config')

  const handleCourtSaved = (updated: Court) => {
    setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setSelectedCourt(updated)
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'config', label: 'Configuração', icon: <Clock className="w-4 h-4" /> },
    { key: 'bloqueio', label: 'Datas Bloqueadas', icon: <CalendarX className="w-4 h-4" /> },
    { key: 'agenda', label: 'Agenda do Dia', icon: <CalendarDays className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl text-on-surface font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" /> Horários
        </h1>
        <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest mt-1">
          Configure disponibilidade, bloqueios e visualize a agenda
        </p>
      </div>

      {/* Seletor de quadra */}
      {courts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {courts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCourt(c)}
              className={cn(
                'px-4 py-2 rounded-xl font-headline text-xs font-bold transition-all border',
                selectedCourt?.id === c.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-primary/50'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!selectedCourt ? (
        <p className="font-headline text-sm text-on-surface-variant text-center py-12">
          Nenhuma quadra cadastrada.
        </p>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-surface-container rounded-2xl p-1 border border-outline-variant/20">
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-headline text-[10px] md:text-xs font-bold uppercase transition-all',
                  tab === key
                    ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/20'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          {tab === 'config' && (
            <TabConfig court={selectedCourt} onSaved={handleCourtSaved} />
          )}
          {tab === 'bloqueio' && (
            <TabBloqueio court={selectedCourt} />
          )}
          {tab === 'agenda' && (
            <TabAgenda court={selectedCourt} />
          )}
        </>
      )}
    </div>
  )
}
