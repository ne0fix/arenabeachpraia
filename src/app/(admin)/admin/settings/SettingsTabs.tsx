'use client'

import { useState } from 'react'
import { LayoutGrid, Phone, CreditCard, KeyRound } from 'lucide-react'
import { CourtSettingsClient } from './CourtSettingsClient'
import { ContactSettingsClient } from './ContactSettingsClient'
import { PaymentSettingsClient } from './PaymentSettingsClient'
import { PasswordSettingsClient } from './PasswordSettingsClient'
import type { Court } from '@/models/entities/Court'

interface ContactSettings {
  whatsappNumber: string
  phone: string
  email: string
  address: string
  hoursWeekdays: string
  hoursSaturday: string
  hoursSunday: string
  msgContact: string
  msgExclusive: string
  msgSupport: string
}

interface Props {
  initialCourts: Court[]
  contactSettings: ContactSettings | null
}

type Tab = 'courts' | 'contact' | 'payment' | 'password'

export function SettingsTabs({ initialCourts, contactSettings }: Props) {
  const [tab, setTab] = useState<Tab>('courts')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-on-surface font-bold">Configurações</h1>
        <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest mt-1">
          Gerencie quadras, imagens e informações de contato
        </p>
      </div>

      {/* Segmented tabs */}
      <div className="flex gap-1.5 p-1 bg-surface-container rounded-xl w-full max-w-md">
        <button
          type="button"
          onClick={() => setTab('courts')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-headline text-[10px] font-bold uppercase tracking-wider transition-all ${
            tab === 'courts'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Quadras
        </button>
        <button
          type="button"
          onClick={() => setTab('contact')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-headline text-[10px] font-bold uppercase tracking-wider transition-all ${
            tab === 'contact'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          Contato
        </button>
        <button
          type="button"
          onClick={() => setTab('payment')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-headline text-[10px] font-bold uppercase tracking-wider transition-all ${
            tab === 'payment'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Pagamento
        </button>
        <button
          type="button"
          onClick={() => setTab('password')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-headline text-[10px] font-bold uppercase tracking-wider transition-all ${
            tab === 'password'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Senha
        </button>
      </div>

      {tab === 'courts' && <CourtSettingsClient initialCourts={initialCourts} hideTitle />}
      {tab === 'contact' && <ContactSettingsClient initialSettings={contactSettings} />}
      {tab === 'payment' && <PaymentSettingsClient />}
      {tab === 'password' && <PasswordSettingsClient />}
    </div>
  )
}
