import { NextResponse } from 'next/server'
import { prisma } from '@/infrastructure/database/prisma'
import { CONTACT_DEFAULTS } from '@/app/api/admin/settings/contact/route'

export async function GET() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null)
  const data = s ?? CONTACT_DEFAULTS

  return NextResponse.json(
    {
      whatsappNumber: data.whatsappNumber,
      msgContact:     data.msgContact,
      msgExclusive:   data.msgExclusive,
      msgSupport:     data.msgSupport,
      mpPublicKey:    'mpPublicKey' in data ? (data as any).mpPublicKey : (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? ''),
      pixEnabled:     'pixEnabled'  in data ? (data as any).pixEnabled  : true,
      cardEnabled:    'cardEnabled' in data ? (data as any).cardEnabled : true,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' } }
  )
}
