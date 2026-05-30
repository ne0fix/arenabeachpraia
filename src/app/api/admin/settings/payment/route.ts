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
    mpAccessToken:    s?.mpAccessToken    ?? '',
    mpPublicKey:      s?.mpPublicKey      ?? '',
    mpWebhookSecret:  s?.mpWebhookSecret  ?? '',
    mpNotificationUrl: s?.mpNotificationUrl ?? '',
    pixEnabled:       s?.pixEnabled       ?? true,
    cardEnabled:      s?.cardEnabled      ?? true,
  })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const allowedStrings = ['mpAccessToken', 'mpPublicKey', 'mpWebhookSecret', 'mpNotificationUrl']
  const data: Record<string, string | boolean> = {}
  for (const key of allowedStrings) {
    if (key in body && typeof body[key] === 'string') data[key] = body[key].trim()
  }
  if ('pixEnabled'  in body && typeof body.pixEnabled  === 'boolean') data.pixEnabled  = body.pixEnabled
  if ('cardEnabled' in body && typeof body.cardEnabled === 'boolean') data.cardEnabled = body.cardEnabled

  const settings = await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...CONTACT_DEFAULTS, ...data },
  })

  return NextResponse.json({
    mpAccessToken:    settings.mpAccessToken,
    mpPublicKey:      settings.mpPublicKey,
    mpWebhookSecret:  settings.mpWebhookSecret,
    mpNotificationUrl: settings.mpNotificationUrl,
    pixEnabled:       settings.pixEnabled,
    cardEnabled:      settings.cardEnabled,
  })
}
