import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { CONTACT_DEFAULTS } from '@/app/api/admin/settings/contact/route'

export async function GET() {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const s = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
  return NextResponse.json({
    mpAccessToken:   s?.mpAccessToken   ?? '',
    mpPublicKey:     s?.mpPublicKey     ?? '',
    mpWebhookSecret: s?.mpWebhookSecret ?? '',
  })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const allowed = ['mpAccessToken', 'mpPublicKey', 'mpWebhookSecret']
  const data: Record<string, string> = {}
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'string') data[key] = body[key].trim()
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...CONTACT_DEFAULTS, ...data },
  })

  return NextResponse.json({
    mpAccessToken:   settings.mpAccessToken,
    mpPublicKey:     settings.mpPublicKey,
    mpWebhookSecret: settings.mpWebhookSecret,
  })
}
