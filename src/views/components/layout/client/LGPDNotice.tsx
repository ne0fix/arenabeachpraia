'use client'

import { useState, useEffect } from 'react'
import { X, Shield } from 'lucide-react'

const STORAGE_KEY = 'lgpd_accepted'

export function LGPDNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-lg p-4 flex items-start gap-3 sun-shadow">
        <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="flex-1 font-headline text-xs text-on-surface-variant leading-relaxed">
          Utilizamos cookies e dados pessoais para melhorar sua experiência, conforme a{' '}
          <strong className="text-on-surface">Lei Geral de Proteção de Dados (LGPD)</strong>.
          Ao continuar navegando, você concorda com nossa política de privacidade.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={accept}
            className="bg-primary text-white font-headline text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Aceitar
          </button>
          <button
            onClick={accept}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
