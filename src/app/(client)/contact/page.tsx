import { MessageCircle, MapPin, Clock } from 'lucide-react'
import { prisma } from '@/infrastructure/database/prisma'

export const revalidate = 0

const DEFAULTS = {
  whatsappNumber: '5511999999999',
  phone: '(11) 99999-9999',
  email: 'contato@arenabeachserra.com.br',
  address: 'Av. Beira Mar, 1234 — Serra, ES',
  hoursWeekdays: 'Seg–Sex: 6h–22h',
  hoursSaturday: 'Sábado: 6h–23h',
  hoursSunday: 'Domingo: 6h–21h',
  msgContact: 'Olá! Gostaria de mais informações sobre a Arena Beach Serra.',
}

export default async function ContactPage() {
  const raw = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null)
  const s = raw ?? DEFAULTS

  const waNumber = s.whatsappNumber.replace(/\D/g, '')
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(s.msgContact)}`

  const hasHours = s.hoursWeekdays || s.hoursSaturday || s.hoursSunday

  return (
    <section className="w-full max-w-md mx-auto px-4 pt-6 pb-28 md:pb-12">

      {/* Cabeçalho */}
      <div className="mb-6">
        <span className="font-headline text-[10px] text-primary uppercase tracking-widest font-bold">
          Atendimento
        </span>
        <h1 className="font-headline text-2xl md:text-3xl text-on-surface font-bold tracking-tight mt-0.5">
          Fale Conosco
        </h1>
      </div>

      {/* Botões de contato */}
      <div className="flex flex-col gap-3 mb-5">

        {/* WhatsApp */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-whatsapp text-white rounded-2xl sun-shadow transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-headline text-base font-bold leading-tight">WhatsApp</p>
            <p className="font-headline text-[11px] opacity-80 uppercase tracking-wider">
              Atendimento imediato
            </p>
          </div>
        </a>

      </div>

      {/* Informações gerais */}
      {(s.address || hasHours) && (
        <div className="bg-surface-container rounded-2xl p-4 space-y-4">

          {s.address && (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-headline text-xs text-on-surface font-bold mb-0.5">Localização</p>
                <p className="text-on-surface-variant text-sm leading-snug">{s.address}</p>
              </div>
            </div>
          )}

          {hasHours && (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-headline text-xs text-on-surface font-bold mb-0.5">
                  Horário de Funcionamento
                </p>
                <div className="space-y-0.5">
                  {s.hoursWeekdays && (
                    <p className="text-on-surface-variant text-sm leading-snug">{s.hoursWeekdays}</p>
                  )}
                  {s.hoursSaturday && (
                    <p className="text-on-surface-variant text-sm leading-snug">{s.hoursSaturday}</p>
                  )}
                  {s.hoursSunday && (
                    <p className="text-on-surface-variant text-sm leading-snug">{s.hoursSunday}</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  )
}
