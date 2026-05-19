'use client'

import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ArrowLeft, Mail, Phone, Calendar, Settings, LogOut, Star, CreditCard, Bell, Shield, HelpCircle, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/views/components/ui/Button'
import { useSiteSettings, buildWaLink } from '@/views/providers/SiteSettingsProvider'
import { ROUTES } from '@/core/constants/config'

const menuItems = [
  { icon: Calendar, label: 'Minhas Reservas', path: ROUTES.BOOKINGS },
  { icon: CreditCard, label: 'Métodos de Pagamento', path: '#' },
  { icon: Bell, label: 'Notificações', path: '#' },
  { icon: Shield, label: 'Privacidade e Segurança', path: '#' },
  { icon: Settings, label: 'Configurações', path: '#' },
  { icon: HelpCircle, label: 'Ajuda e Suporte', path: ROUTES.CONTACT },
]

export default function ProfilePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { whatsappNumber, msgContact } = useSiteSettings()

  return (
    <>
      <header className="px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-container rounded-full transition-all active:scale-90"
        >
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <h1 className="font-headline font-bold text-lg text-primary tracking-tight">Meu Perfil</h1>
      </header>

      <main className="px-6 pb-24 md:pb-12 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 sun-shadow mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
              <span className="font-headline text-white text-2xl font-bold">
                {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="font-headline text-xl text-on-surface font-bold">
                {session?.user?.name ?? 'Usuário'}
              </h2>
              <p className="text-on-surface-variant text-sm flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500" />
                Cliente Premium
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase font-bold">E-mail</p>
                <p className="text-sm text-on-surface font-medium">{session?.user?.email ?? '—'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <h3 className="font-headline text-lg text-primary font-bold mb-4">Minha Conta</h3>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden mb-8">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className="w-full flex items-center gap-4 p-4 border-b border-outline-variant/20 last:border-b-0 hover:bg-surface-container transition-colors"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="flex-1 text-left font-headline text-sm text-on-surface font-medium">
                {item.label}
              </span>
              <ChevronRight className="w-5 h-5 text-on-surface-variant" />
            </button>
          ))}
        </div>

        <div className="bg-surface-container rounded-2xl p-6 mb-8">
          <h3 className="font-headline text-lg text-primary font-bold mb-4">Precisa de ajuda?</h3>
          <p className="text-on-surface-variant text-sm mb-4">
            Nossa equipe está pronta para atender você. Entre em contato pelo WhatsApp.
          </p>
          <Button
            variant="whatsapp"
            className="w-full"
            onClick={() => window.open(buildWaLink(whatsappNumber, msgContact), '_blank')}
          >
            Falar no WhatsApp
          </Button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-red-600"
          leftIcon={<LogOut className="w-5 h-5" />}
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Sair da Conta
        </Button>
      </main>
    </>
  )
}
