'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export interface PublicSiteSettings {
  whatsappNumber: string
  msgContact: string
  msgExclusive: string
  msgSupport: string
}

const DEFAULTS: PublicSiteSettings = {
  whatsappNumber: '5511999999999',
  msgContact:   'Olá! Gostaria de mais informações sobre a Arena Beach Serra.',
  msgExclusive: 'Olá! Tenho interesse em agendar o espaço exclusivo "{nome}". Poderia me passar mais informações?',
  msgSupport:   'Olá! Preciso de suporte com meu agendamento.',
}

const SiteSettingsContext = createContext<PublicSiteSettings>(DEFAULTS)

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings>(DEFAULTS)

  useEffect(() => {
    fetch('/api/settings/public')
      .then((r) => r.json())
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => {})
  }, [])

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}

export function buildWaLink(number: string, message: string, courtName?: string) {
  const text = courtName ? message.replace('{nome}', courtName) : message
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
