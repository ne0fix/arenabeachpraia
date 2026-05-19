'use client'

import { useState } from 'react'
import { MessageCircle, Phone, Mail, MapPin, Clock, Save, Loader2, X } from 'lucide-react'

interface ContactSettings {
  whatsappNumber: string
  phone: string
  email: string
  address: string
  hoursWeekdays: string
  hoursSaturday: string
  hoursSunday: string
}

interface Props {
  initialSettings: ContactSettings | null
}

const DEFAULTS: ContactSettings = {
  whatsappNumber: '5511999999999',
  phone: '(11) 99999-9999',
  email: 'contato@arenabeachserra.com.br',
  address: 'Av. Beira Mar, 1234 — Serra, ES',
  hoursWeekdays: 'Seg–Sex: 6h–22h',
  hoursSaturday: 'Sábado: 6h–23h',
  hoursSunday: 'Domingo: 6h–21h',
}

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string
  icon: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </label>
      {children}
      {hint && <p className="font-headline text-[10px] text-on-surface-variant mt-1">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2.5 font-headline text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/40'

export function ContactSettingsClient({ initialSettings }: Props) {
  const base = initialSettings ?? DEFAULTS
  const [draft, setDraft] = useState<ContactSettings>({ ...base })
  const [committed, setCommitted] = useState<ContactSettings>({ ...base })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isDirty = JSON.stringify(draft) !== JSON.stringify(committed)
  const set = (key: keyof ContactSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setCommitted({ ...draft })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Falha ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden sun-shadow">
        <div className="p-5 space-y-5">

          <Field
            label="WhatsApp"
            icon={<MessageCircle className="w-3 h-3" />}
            hint="Código do país + DDD + número sem espaços. Ex: 5527999999999"
          >
            <input
              type="tel"
              value={draft.whatsappNumber}
              onChange={set('whatsappNumber')}
              placeholder="5527999999999"
              className={inputCls}
            />
          </Field>

          <Field label="Telefone" icon={<Phone className="w-3 h-3" />}>
            <input
              type="tel"
              value={draft.phone}
              onChange={set('phone')}
              placeholder="(27) 99999-9999"
              className={inputCls}
            />
          </Field>

          <Field label="E-mail" icon={<Mail className="w-3 h-3" />}>
            <input
              type="email"
              value={draft.email}
              onChange={set('email')}
              placeholder="contato@arenabeachserra.com.br"
              className={inputCls}
            />
          </Field>

          <Field label="Endereço" icon={<MapPin className="w-3 h-3" />}>
            <input
              type="text"
              value={draft.address}
              onChange={set('address')}
              placeholder="Av. Beira Mar, 1234 — Serra, ES"
              className={inputCls}
            />
          </Field>

          <Field label="Horários de Funcionamento" icon={<Clock className="w-3 h-3" />}>
            <div className="space-y-2">
              <input
                type="text"
                value={draft.hoursWeekdays}
                onChange={set('hoursWeekdays')}
                placeholder="Seg–Sex: 6h–22h"
                className={inputCls}
              />
              <input
                type="text"
                value={draft.hoursSaturday}
                onChange={set('hoursSaturday')}
                placeholder="Sábado: 6h–23h"
                className={inputCls}
              />
              <input
                type="text"
                value={draft.hoursSunday}
                onChange={set('hoursSunday')}
                placeholder="Domingo: 6h–21h"
                className={inputCls}
              />
            </div>
          </Field>

          {error && (
            <p className="font-headline text-[10px] text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="flex-1 bg-primary text-white hover:bg-primary/90 disabled:opacity-40 px-4 py-2.5 rounded-xl font-headline text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              ) : saved ? (
                <>✓ Salvo!</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Salvar Alterações</>
              )}
            </button>
            {isDirty && (
              <button
                type="button"
                onClick={() => setDraft({ ...committed })}
                className="p-2.5 bg-surface-container hover:bg-outline-variant/30 rounded-xl transition-all"
                title="Descartar alterações"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 bg-surface-container rounded-2xl p-4 space-y-3">
        <p className="font-headline text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">
          Preview da página de contato
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <MessageCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-headline text-xs">wa.me/{draft.whatsappNumber}</span>
          </div>
          {draft.phone && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-headline text-xs">{draft.phone}</span>
            </div>
          )}
          {draft.email && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-headline text-xs">{draft.email}</span>
            </div>
          )}
          {draft.address && (
            <div className="flex items-start gap-2 text-on-surface-variant">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="font-headline text-xs">{draft.address}</span>
            </div>
          )}
          {(draft.hoursWeekdays || draft.hoursSaturday || draft.hoursSunday) && (
            <div className="flex items-start gap-2 text-on-surface-variant">
              <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="font-headline text-xs space-y-0.5">
                {draft.hoursWeekdays && <p>{draft.hoursWeekdays}</p>}
                {draft.hoursSaturday && <p>{draft.hoursSaturday}</p>}
                {draft.hoursSunday && <p>{draft.hoursSunday}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
