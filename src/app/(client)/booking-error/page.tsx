'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, MessageCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/views/components/ui/Button'
import { useSiteSettings, buildWaLink } from '@/views/providers/SiteSettingsProvider'

function ErrorContent() {
  const params = useSearchParams()
  const router = useRouter()
  const code = params.get('code') ?? 'UNKNOWN_ERROR'
  const message = params.get('message')
  const { whatsappNumber, msgSupport } = useSiteSettings()

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 flex flex-col items-center justify-center pt-12 pb-24 md:py-12">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative mb-8">
        <div className="absolute inset-0 bg-red-100 rounded-full scale-150 blur-3xl opacity-50" />
        <div className="relative bg-surface-container-lowest sun-shadow w-24 h-24 rounded-full flex items-center justify-center border-4 border-surface-container">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
      </motion.div>

      <div className="text-center mb-8">
        <h1 className="font-headline text-3xl text-red-600 font-bold mb-2">Ops! Ocorreu um erro</h1>
        <p className="text-on-surface-variant max-w-[280px] mx-auto text-sm leading-relaxed">
          Seu pagamento não foi processado. Nenhum valor foi cobrado. Tente novamente ou entre em contato com o suporte.
        </p>
      </div>

      <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 mb-8 text-center">
        <p className="font-headline text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1">
          Código do Erro
        </p>
        <p className="font-headline text-sm text-red-700 font-bold">{code}</p>
        {message && (
          <p className="font-headline text-xs text-red-600 mt-2 leading-relaxed break-words">{message}</p>
        )}
      </div>

      <div className="w-full space-y-4">
        <Button className="w-full h-14" leftIcon={<RefreshCw className="w-5 h-5" />} onClick={() => router.back()}>
          Tentar Novamente
        </Button>
        <Button
          variant="whatsapp"
          className="w-full h-14"
          leftIcon={<MessageCircle className="w-5 h-5" />}
          onClick={() => window.open(buildWaLink(whatsappNumber, msgSupport), '_blank')}
        >
          Falar com Suporte
        </Button>
      </div>
    </main>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
      <ErrorContent />
    </Suspense>
  )
}
