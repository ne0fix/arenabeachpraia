import { NextResponse } from 'next/server'
import { prisma } from '@/infrastructure/database/prisma'

const SECRET = 'arena2026fix'

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  await prisma.court.update({
    where: { id: 'court-1' },
    data: { sports: ['Carimba', 'Beach Tennis', 'Vôlei', 'Futevôlei'] },
  })
  await prisma.court.update({
    where: { id: 'court-2' },
    data: { sports: [] },
  })

  const courts = await prisma.court.findMany({ select: { id: true, name: true, sports: true } })
  return NextResponse.json({ ok: true, courts })
}
