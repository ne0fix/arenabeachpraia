import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { z } from 'zod'

const createSchema = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.enum(['MORNING', 'AFTERNOON', 'ALL_DAY']).default('ALL_DAY'),
  reason: z.string().optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const items = await prisma.courtUnavailability.findMany({
    where: { courtId: id },
    orderBy: [{ date: 'asc' }, { period: 'asc' }],
  })

  return NextResponse.json(items.map((u) => ({
    id:     u.id,
    date:   u.date.toISOString().slice(0, 10),
    period: u.period,
    reason: u.reason,
  })))
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { date, period, reason } = parsed.data
  const dateObj = new Date(date + 'T00:00:00')

  // Verifica conflito: ALL_DAY não pode coexistir com MORNING/AFTERNOON e vice-versa
  const existing = await prisma.courtUnavailability.findMany({
    where: { courtId: id, date: dateObj },
  })

  if (period === 'ALL_DAY' && existing.length > 0) {
    return NextResponse.json({ error: 'Esta data já possui bloqueio. Remova-os antes de bloquear o dia inteiro.' }, { status: 409 })
  }
  if (period !== 'ALL_DAY' && existing.some((e) => e.period === 'ALL_DAY')) {
    return NextResponse.json({ error: 'Esta data já está bloqueada por completo.' }, { status: 409 })
  }
  if (existing.some((e) => e.period === period)) {
    return NextResponse.json({ error: `Período já bloqueado para esta data.` }, { status: 409 })
  }

  const item = await prisma.courtUnavailability.create({
    data: { courtId: id, date: dateObj, period: period as any, reason: reason ?? null },
  })

  return NextResponse.json({
    id:     item.id,
    date:   item.date.toISOString().slice(0, 10),
    period: item.period,
    reason: item.reason,
  }, { status: 201 })
}
