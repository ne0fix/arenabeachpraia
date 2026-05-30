'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Clock, X, Plus, Loader2, CalendarX } from 'lucide-react'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { CourtImageCarousel } from '@/views/components/business/CourtImageCarousel'
import { CourtScheduleTabs } from '@/views/components/admin/CourtScheduleTabs'
import type { Court } from '@/models/entities/Court'

interface NewCourtForm {
  name: string
  description: string
  type: 'REGULAR' | 'EXCLUSIVE'
  location: string
  maxPlayers: number
  pricePerHour: number
  slotDuration: number
  morningEnabled: boolean
  morningOpen: string
  morningClose: string
  afternoonEnabled: boolean
  afternoonOpen: string
  afternoonClose: string
}

const defaultForm: NewCourtForm = {
  name: '',
  description: '',
  type: 'REGULAR',
  location: 'Arena Beach Serra',
  maxPlayers: 4,
  pricePerHour: 100,
  slotDuration: 60,
  morningEnabled: true,
  morningOpen: '06:00',
  morningClose: '12:00',
  afternoonEnabled: true,
  afternoonOpen: '13:00',
  afternoonClose: '22:00',
}

export function AdminCourtsClient({ initialCourts }: { initialCourts: Court[] }) {
  const [courts, setCourts] = useState(initialCourts)
  const [modalCourt, setModalCourt] = useState<Court | null>(null)
  const [modalInitialTab, setModalInitialTab] = useState<'config' | 'bloqueio' | 'agenda'>('config')
  const [showCreate, setShowCreate] = useState(false)

  const openModal = (court: Court, tab: 'config' | 'bloqueio' | 'agenda' = 'config') => {
    setModalInitialTab(tab)
    setModalCourt(court)
  }
  const [form, setForm] = useState<NewCourtForm>(defaultForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const handleCourtUpdated = (updated: Court) => {
    setCourts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setModalCourt(updated)
  }

  const handleFormChange = (field: keyof NewCourtForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCreate = async () => {
    if (!form.name || !form.description || !form.location) {
      setCreateError('Preencha todos os campos obrigatórios.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setCreateError(data.error || 'Erro ao criar quadra.')
        return
      }
      const court = await res.json()
      setCourts(prev => [...prev, court])
      setShowCreate(false)
      setForm(defaultForm)
    } catch {
      setCreateError('Erro de conexão.')
    } finally {
      setCreating(false)
    }
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
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-headline text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Quadra
          </button>
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

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openModal(court, 'config')}
                    className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all text-center"
                  >
                    Gerenciar Horários
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(court, 'bloqueio')}
                    className="flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-3 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all"
                  >
                    <CalendarX className="w-3.5 h-3.5" />
                    Bloquear Data
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
            <div className="overflow-y-auto flex-1 p-5">
              <CourtScheduleTabs court={modalCourt} onCourtUpdated={handleCourtUpdated} initialTab={modalInitialTab} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de nova quadra */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}
        >
          <div className="bg-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 flex-shrink-0">
              <div>
                <h2 className="font-headline text-base font-bold text-on-surface flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Nova Quadra
                </h2>
                <p className="font-headline text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
                  Preencha os dados da nova quadra
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
                  Nome da Quadra *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  placeholder="Ex: Quadra 2 — Beach Tennis"
                  className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
                  Descrição *
                </label>
                <textarea
                  value={form.description}
                  onChange={e => handleFormChange('description', e.target.value)}
                  placeholder="Descreva a quadra..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Tipo e Local */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={form.type}
                    onChange={e => handleFormChange('type', e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="EXCLUSIVE">Exclusiva</option>
                  </select>
                </div>
                <div>
                  <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
                    Localização *
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => handleFormChange('location', e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Jogadores, Preço, Duração */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
                    Jogadores
                  </label>
                  <select
                    value={form.maxPlayers}
                    onChange={e => handleFormChange('maxPlayers', Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
                    Preço/hora (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.pricePerHour}
                    onChange={e => handleFormChange('pricePerHour', Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1.5">
                    Slot (min)
                  </label>
                  <select
                    value={form.slotDuration}
                    onChange={e => handleFormChange('slotDuration', Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl font-headline text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
              </div>

              {/* Manhã */}
              <div className="bg-surface-container rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-headline text-xs font-bold text-on-surface">Manhã</span>
                  <button
                    type="button"
                    onClick={() => handleFormChange('morningEnabled', !form.morningEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${form.morningEnabled ? 'bg-primary' : 'bg-outline-variant/50'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.morningEnabled ? 'left-[17px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.morningEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Abertura</label>
                      <input type="time" value={form.morningOpen} onChange={e => handleFormChange('morningOpen', e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface border border-outline-variant/30 rounded-lg font-headline text-xs focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Fechamento</label>
                      <input type="time" value={form.morningClose} onChange={e => handleFormChange('morningClose', e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface border border-outline-variant/30 rounded-lg font-headline text-xs focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                )}
              </div>

              {/* Tarde */}
              <div className="bg-surface-container rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-headline text-xs font-bold text-on-surface">Tarde</span>
                  <button
                    type="button"
                    onClick={() => handleFormChange('afternoonEnabled', !form.afternoonEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${form.afternoonEnabled ? 'bg-primary' : 'bg-outline-variant/50'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.afternoonEnabled ? 'left-[17px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.afternoonEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Abertura</label>
                      <input type="time" value={form.afternoonOpen} onChange={e => handleFormChange('afternoonOpen', e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface border border-outline-variant/30 rounded-lg font-headline text-xs focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="font-headline text-[9px] text-on-surface-variant uppercase tracking-widest block mb-1">Fechamento</label>
                      <input type="time" value={form.afternoonClose} onChange={e => handleFormChange('afternoonClose', e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface border border-outline-variant/30 rounded-lg font-headline text-xs focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                )}
              </div>

              {createError && (
                <p className="text-red-600 font-headline text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">{createError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-outline-variant/30 flex-shrink-0 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl font-headline text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-outline-variant/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl font-headline text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {creating ? 'Criando...' : 'Criar Quadra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
