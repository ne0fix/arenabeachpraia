'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock, CalendarDays, CalendarX, ChevronLeft, ChevronRight,
  Trash2, Save, Loader2, CheckCircle, AlertCircle, User,
} from 'lucide-react'
import {
  format, addDays, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isBefore, startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/core/utils/helpers'
import type { Court } from '@/models/entities/Court'

type BlockPeriod = 'MORNING' | 'AFTERNOON' | 'ALL_DAY'
interface Unavailability { id: string; date: string; period: BlockPeriod; reason: string | null }

const PERIOD_LABEL: Record<BlockPeriod, string> = {
  MORNING:   'Manhã',
  AFTERNOON: 'Tarde',
  ALL_DAY:   'Dia inteiro',
}
const PERIOD_COLOR: Record<BlockPeriod, string> = {
  MORNING:   'bg-amber-500/15 text-amber-700 border-amber-300/50',
  AFTERNOON: 'bg-orange-500/15 text-orange-700 border-orange-300/50',
  ALL_DAY:   'bg-red-500/15 text-red-600 border-red-300/50',
}
const PERIOD_DOT: Record<BlockPeriod, string> = {
  MORNING:   'M',
  AFTERNOON: 'T',
  ALL_DAY:   '✕',
}
interface SlotInfo {
  time: string
  available: boolean
  booking?: { id: string; userName: string; userEmail: string; status: string }
}

const SLOT_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
]
const TODAY = startOfDay(new Date())

function toMin(t: string) {
  return parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
}
function countSlots(open: string, close: string, dur: number) {
  const diff = toMin(close) - toMin(open)
  return diff > 0 ? Math.floor(diff / dur) : 0
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn('relative flex-shrink-0 rounded-full transition-colors', enabled ? 'bg-primary' : 'bg-outline-variant/40')}
      style={{ width: 34, height: 20 }}
    >
      <span className={cn(
        'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all',
        enabled ? 'left-[17px]' : 'left-0.5'
      )} />
    </button>
  )
}

// ── Bloco de período ──────────────────────────────────────────────────────────
function PeriodBlock({
  label, dot, enabled, open, close, slotDuration,
  onToggle, onOpen, onClose,
}: {
  label: string; dot: string; enabled: boolean
  open: string; close: string; slotDuration: number
  onToggle: () => void; onOpen: (v: string) => void; onClose: (v: string) => void
}) {
  const slots = enabled ? countSlots(open, close, slotDuration) : 0
  const invalid = enabled && open >= close

  return (
    <div className={cn(
      'rounded-xl border p-2.5 space-y-2 transition-all',
      enabled ? 'border-outline-variant/30 bg-surface-container-lowest' : 'border-outline-variant/20 bg-surface-container/30 opacity-60'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
          <span className="font-headline text-xs font-bold text-on-surface">{label}</span>
          {enabled && slots > 0 && (
            <span className="font-headline text-[8px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-full border border-outline-variant/20 leading-none">
              {slots}s
            </span>
          )}
        </div>
        <Toggle enabled={enabled} onToggle={onToggle} />
      </div>
      {enabled && (
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { lbl: 'Início', val: open, set: onOpen },
            { lbl: 'Fim', val: close, set: onClose },
          ].map(({ lbl, val, set }) => (
            <div key={lbl}>
              <label className="font-headline text-[8px] text-on-surface-variant uppercase font-bold tracking-widest mb-0.5 block">{lbl}</label>
              <input
                type="time"
                value={val}
                onChange={(e) => set(e.target.value)}
                className={cn(
                  'w-full bg-surface-container border rounded-lg px-2 py-1.5 font-headline text-xs text-on-surface focus:outline-none transition-colors',
                  invalid ? 'border-red-400' : 'border-outline-variant/40 focus:border-primary/50'
                )}
              />
            </div>
          ))}
        </div>
      )}
      {invalid && (
        <p className="font-headline text-[9px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Início antes do fim.
        </p>
      )}
    </div>
  )
}

// ── Tab Configuração ──────────────────────────────────────────────────────────
function TabConfig({ court, onSaved }: { court: Court; onSaved: (c: Court) => void }) {
  const [me, setMe] = useState(court.morningEnabled)
  const [mo, setMo] = useState(court.morningOpen)
  const [mc, setMc] = useState(court.morningClose)
  const [ae, setAe] = useState(court.afternoonEnabled)
  const [ao, setAo] = useState(court.afternoonOpen)
  const [ac, setAc] = useState(court.afternoonClose)
  const [dur, setDur] = useState(court.slotDuration)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const isDirty = me !== court.morningEnabled || mo !== court.morningOpen || mc !== court.morningClose
    || ae !== court.afternoonEnabled || ao !== court.afternoonOpen || ac !== court.afternoonClose
    || dur !== court.slotDuration
  const hasErr = (me && mo >= mc) || (ae && ao >= ac) || (!me && !ae)
  const total = (me ? countSlots(mo, mc, dur) : 0) + (ae ? countSlots(ao, ac, dur) : 0)

  const save = async () => {
    if (!me && !ae) { setErr('Ative pelo menos um período.'); return }
    if (me && mo >= mc) { setErr('Horários da manhã inválidos.'); return }
    if (ae && ao >= ac) { setErr('Horários da tarde inválidos.'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/admin/courts/${court.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ morningEnabled: me, morningOpen: mo, morningClose: mc, afternoonEnabled: ae, afternoonOpen: ao, afternoonClose: ac, slotDuration: dur }),
      })
      if (!res.ok) throw new Error()
      onSaved(await res.json())
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch { setErr('Falha ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <PeriodBlock label="Manhã" dot="bg-amber-400" enabled={me} open={mo} close={mc} slotDuration={dur}
          onToggle={() => setMe(v => !v)} onOpen={setMo} onClose={setMc} />
        <PeriodBlock label="Tarde" dot="bg-orange-500" enabled={ae} open={ao} close={ac} slotDuration={dur}
          onToggle={() => setAe(v => !v)} onOpen={setAo} onClose={setAc} />
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-headline text-[9px] text-on-surface-variant uppercase font-bold tracking-widest flex items-center gap-1">
            <Clock className="w-3 h-3" /> Duração do slot
          </label>
          {total > 0 && (
            <span className="font-headline text-[9px] text-primary font-bold">
              {total} slot{total !== 1 ? 's' : ''}/dia · {me && `${mo}–${mc}`}{me && ae && ' · '}{ae && `${ao}–${ac}`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {SLOT_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setDur(opt.value)}
              className={cn('py-1.5 rounded-lg border font-headline text-[10px] font-bold transition-all',
                dur === opt.value ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container border-outline-variant/30 text-on-surface hover:border-primary/50'
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="font-headline text-[10px] text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{err}</p>}

      <button type="button" onClick={save} disabled={saving || !isDirty || hasErr}
        className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40 px-4 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2">
        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
          : saved ? <><CheckCircle className="w-3.5 h-3.5" /> Salvo!</>
          : <><Save className="w-3.5 h-3.5" /> Salvar Configuração</>}
      </button>
    </div>
  )
}

// ── Tab Datas Bloqueadas ──────────────────────────────────────────────────────
function TabBloqueio({ court }: { court: Court }) {
  const [items, setItems] = useState<Unavailability[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date())
  const [sel, setSel] = useState<string | null>(null)
  const [period, setPeriod] = useState<BlockPeriod>('ALL_DAY')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/courts/${court.id}/unavailability`)
      const data = await r.json()
      setItems(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }, [court.id])

  useEffect(() => { fetch_() }, [fetch_])

  // Agrupa por data para exibir indicadores no calendário
  const blockedByDate = new Map<string, BlockPeriod[]>()
  for (const u of items) {
    const arr = blockedByDate.get(u.date) ?? []
    arr.push(u.period)
    blockedByDate.set(u.date, arr)
  }
  const isFullDay = (ds: string) => {
    const periods = blockedByDate.get(ds) ?? []
    return periods.includes('ALL_DAY') || (periods.includes('MORNING') && periods.includes('AFTERNOON'))
  }
  const calStart = startOfMonth(month)
  const calEnd = endOfMonth(month)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })
  const firstDow = calStart.getDay()

  const add = async () => {
    if (!sel) return
    setAdding(true); setErr('')
    try {
      const r = await fetch(`/api/admin/courts/${court.id}/unavailability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: sel, period, reason: reason.trim() || undefined }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setErr(d.error ?? 'Falha ao bloquear.')
        return
      }
      await fetch_(); setSel(null); setReason(''); setPeriod('ALL_DAY')
    } catch { setErr('Falha ao bloquear.') }
    finally { setAdding(false) }
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/courts/${court.id}/unavailability/${id}`, { method: 'DELETE' })
    setItems(p => p.filter(u => u.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 hover:bg-surface-container rounded-lg">
            <ChevronLeft className="w-4 h-4 text-primary" />
          </button>
          <span className="font-headline text-sm font-bold text-on-surface capitalize">
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button type="button" onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 hover:bg-surface-container rounded-lg">
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['D','S','T','Q','Q','S','S'].map((d,i) => (
            <div key={i} className="text-center font-headline text-[9px] font-bold text-on-surface-variant uppercase py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_,i) => <div key={`e${i}`} />)}
          {calDays.map(day => {
            const ds = format(day, 'yyyy-MM-dd')
            const isPast = isBefore(day, TODAY)
            const periods = blockedByDate.get(ds) ?? []
            const isBlocked = periods.length > 0
            const fullDay = isFullDay(ds)
            const isSelected = sel === ds
            return (
              <button key={ds} type="button" disabled={isPast}
                onClick={() => { setSel(isSelected ? null : ds); setErr('') }}
                className={cn('aspect-square rounded-lg font-headline text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 relative',
                  isPast && 'text-outline/30 cursor-not-allowed',
                  !isPast && fullDay && 'bg-red-500/15 text-red-600 border border-red-300/50',
                  !isPast && isBlocked && !fullDay && 'bg-amber-500/15 text-amber-700 border border-amber-300/50',
                  !isPast && !isBlocked && !isSelected && isToday(day) && 'bg-primary/10 text-primary border border-primary/30',
                  !isPast && !isBlocked && !isSelected && !isToday(day) && 'hover:bg-surface-container text-on-surface',
                  isSelected && 'bg-primary text-white shadow-sm',
                )}>
                <span>{format(day, 'd')}</span>
                {isBlocked && !isSelected && (
                  <span className="text-[7px] font-bold leading-none">
                    {fullDay ? '✕' : periods.map(p => PERIOD_DOT[p]).join('')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {sel && !isFullDay(sel) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <p className="font-headline text-xs font-bold text-amber-800">
            Bloquear {format(new Date(sel + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
          </p>

          {/* Seletor de período */}
          <div>
            <p className="font-headline text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-2">Período</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['MORNING', 'AFTERNOON', 'ALL_DAY'] as BlockPeriod[]).map((p) => {
                const alreadyBlocked = (blockedByDate.get(sel) ?? []).includes(p)
                return (
                  <button key={p} type="button"
                    disabled={alreadyBlocked}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'py-2 rounded-xl font-headline text-[10px] font-bold border transition-all',
                      alreadyBlocked && 'opacity-40 cursor-not-allowed bg-surface-container border-outline-variant/20',
                      !alreadyBlocked && period === p && 'bg-amber-600 text-white border-amber-600 shadow-sm',
                      !alreadyBlocked && period !== p && 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100',
                    )}>
                    {PERIOD_LABEL[p]}
                    {alreadyBlocked && ' ✓'}
                  </button>
                )
              })}
            </div>
          </div>

          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 font-headline text-xs focus:outline-none focus:border-amber-400" />
          {err && <p className="font-headline text-[10px] text-red-500">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={add} disabled={adding}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2.5 font-headline text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 disabled:opacity-60">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarX className="w-3.5 h-3.5" />}
              Bloquear {PERIOD_LABEL[period]}
            </button>
            <button type="button" onClick={() => { setSel(null); setErr('') }}
              className="px-4 bg-surface-container hover:bg-outline-variant/30 rounded-xl font-headline text-[10px] font-bold uppercase">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4">
        <h3 className="font-headline text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <CalendarX className="w-4 h-4 text-red-500" /> Datas Bloqueadas
          {items.length > 0 && <span className="bg-red-100 text-red-600 font-headline text-[9px] font-bold px-2 py-0.5 rounded-full">{items.length}</span>}
        </h3>
        {loading ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
          : items.length === 0 ? <p className="font-headline text-xs text-on-surface-variant text-center py-3">Nenhuma data bloqueada.</p>
          : (
            <div className="space-y-2">
              {items.map(u => (
                <div key={u.id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 border', PERIOD_COLOR[u.period])}>
                  <CalendarX className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-headline text-xs font-bold text-on-surface">
                        {format(new Date(u.date + 'T12:00:00'), "dd 'de' MMMM yyyy", { locale: ptBR })}
                      </p>
                      <span className="font-headline text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/60">
                        {PERIOD_LABEL[u.period]}
                      </span>
                    </div>
                    {u.reason && <p className="font-headline text-[10px] text-on-surface-variant truncate">{u.reason}</p>}
                  </div>
                  <button type="button" onClick={() => remove(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg group flex-shrink-0">
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

// ── Tab Agenda do Dia ─────────────────────────────────────────────────────────
function TabAgenda({ court }: { court: Court }) {
  const [selDate, setSelDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [loading, setLoading] = useState(false)

  const loadAgenda = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [avRes, bkRes] = await Promise.all([
        fetch(`/api/courts/${court.id}/availability?date=${date}`),
        fetch(`/api/bookings?courtId=${court.id}&date=${date}&limit=100`),
      ])
      const avData = await avRes.json()
      const bkData = await bkRes.json()
      const byTime: Record<string, SlotInfo['booking']> = {}
      for (const b of bkData.bookings ?? []) {
        byTime[b.startTime] = { id: b.id, userName: b.user?.name ?? 'Cliente', userEmail: b.user?.email ?? '', status: b.status }
      }
      setSlots((avData.slots ?? []).map((s: { time: string; available: boolean }) => ({ ...s, booking: byTime[s.time] })))
    } finally { setLoading(false) }
  }, [court.id])

  useEffect(() => { loadAgenda(selDate) }, [loadAgenda, selDate])

  const STATUS_LABEL: Record<string, string> = { PENDING: 'Aguardando pag.', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', COMPLETED: 'Concluído', NO_SHOW: 'Não compareceu' }
  const STATUS_COLOR: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-700 border-amber-200', CONFIRMED: 'bg-green-100 text-green-700 border-green-200', CANCELLED: 'bg-red-100 text-red-600 border-red-200', COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200', NO_SHOW: 'bg-slate-100 text-slate-600 border-slate-200' }

  const days = Array.from({ length: 14 }, (_, i) => format(addDays(new Date(), i), 'yyyy-MM-dd'))

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 court-scrollbar">
        {days.map(d => {
          const obj = new Date(d + 'T12:00:00')
          return (
            <button key={d} type="button" onClick={() => setSelDate(d)}
              className={cn('flex-shrink-0 w-13 h-15 rounded-xl flex flex-col items-center justify-center transition-all',
                d === selDate ? 'bg-primary text-white shadow-md' : 'bg-surface-container border border-outline-variant/30 text-on-surface hover:border-primary/50'
              )}
              style={{ width: 52, height: 60 }}>
              <span className="text-[8px] font-bold uppercase opacity-80">{format(obj, 'EEE', { locale: ptBR })}</span>
              <span className="text-base font-bold">{format(obj, 'dd')}</span>
              <span className="text-[8px] font-semibold uppercase">{format(obj, 'MMM', { locale: ptBR })}</span>
            </button>
          )
        })}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4">
        <h3 className="font-headline text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          {format(new Date(selDate + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h3>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
          : slots.length === 0 ? <p className="font-headline text-xs text-on-surface-variant text-center py-4">Quadra indisponível nesta data.</p>
          : (
            <div className="space-y-1.5">
              {slots.map(slot => (
                <div key={slot.time} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 border transition-all',
                  slot.booking ? (STATUS_COLOR[slot.booking.status] ?? 'bg-surface-container border-outline-variant/20') : 'bg-surface-container/40 border-outline-variant/10'
                )}>
                  <span className="font-headline text-sm font-bold text-on-surface w-12 flex-shrink-0">{slot.time}</span>
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
                        {STATUS_LABEL[slot.booking.status] ?? slot.booking.status}
                      </span>
                    </div>
                  ) : <span className="font-headline text-[11px] text-on-surface-variant">Disponível</span>}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

// ── Componente principal exportado ────────────────────────────────────────────
type Tab = 'config' | 'bloqueio' | 'agenda'

export function CourtScheduleTabs({
  court,
  onCourtUpdated,
  initialTab = 'config',
}: {
  court: Court
  onCourtUpdated?: (updated: Court) => void
  initialTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [currentCourt, setCurrentCourt] = useState(court)

  useEffect(() => { setCurrentCourt(court) }, [court])

  const handleSaved = (updated: Court) => {
    setCurrentCourt(updated)
    onCourtUpdated?.(updated)
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'config', label: 'Configuração', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'bloqueio', label: 'Bloqueios', icon: <CalendarX className="w-3.5 h-3.5" /> },
    { key: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 border border-outline-variant/20">
        {tabs.map(({ key, label, icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-headline text-[10px] font-bold uppercase transition-all',
              tab === key ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/20' : 'text-on-surface-variant hover:text-on-surface'
            )}>
            {icon}<span>{label}</span>
          </button>
        ))}
      </div>
      {tab === 'config' && <TabConfig court={currentCourt} onSaved={handleSaved} />}
      {tab === 'bloqueio' && <TabBloqueio court={currentCourt} />}
      {tab === 'agenda' && <TabAgenda court={currentCourt} />}
    </div>
  )
}
