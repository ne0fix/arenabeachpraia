import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'

export const CONTACT_DEFAULTS = {
  whatsappNumber: '5511999999999',
  phone: '(11) 99999-9999',
  email: 'contato@arenabeachserra.com.br',
  address: 'Av. Beira Mar, 1234 — Serra, ES',
  hoursWeekdays: 'Seg–Sex: 6h–22h',
  hoursSaturday: 'Sábado: 6h–23h',
  hoursSunday: 'Domingo: 6h–21h',
  msgContact:   'Olá! Gostaria de mais informações sobre a Arena Beach Serra.',
  msgExclusive: 'Olá! Tenho interesse em agendar o espaço exclusivo "{nome}". Poderia me passar mais informações?',
  msgSupport:   'Olá! Preciso de suporte com meu agendamento.',
}

export async function GET() {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
  return NextResponse.json(settings ?? { id: 'singleton', ...CONTACT_DEFAULTS })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const allowed = [
    'whatsappNumber', 'phone', 'email', 'address',
    'hoursWeekdays', 'hoursSaturday', 'hoursSunday',
    'msgContact', 'msgExclusive', 'msgSupport',
  ]
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'string') data[key] = body[key]
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...CONTACT_DEFAULTS, ...data },
  })

  return NextResponse.json(settings)
}
