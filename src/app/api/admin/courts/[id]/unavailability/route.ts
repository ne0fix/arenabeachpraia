import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { z } from 'zod'

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(items.map((u) => ({
    id: u.id,
    date: u.date.toISOString().slice(0, 10),
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
    return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
  }

  const dateObj = new Date(parsed.data.date + 'T00:00:00')

  const existing = await prisma.courtUnavailability.findFirst({
    where: { courtId: id, date: dateObj },
  })
  if (existing) {
    return NextResponse.json({ error: 'Esta data já está bloqueada' }, { status: 409 })
  }

  const item = await prisma.courtUnavailability.create({
    data: { courtId: id, date: dateObj, reason: parsed.data.reason ?? null },
  })

  return NextResponse.json({
    id: item.id,
    date: item.date.toISOString().slice(0, 10),
    reason: item.reason,
  }, { status: 201 })
}
