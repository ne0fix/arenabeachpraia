import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/infrastructure/database/prisma'

const schema = z.object({
  items: z.array(z.object({
    cartItemId: z.string(),
    courtId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
  }

  const unavailable: string[] = []

  for (const item of parsed.data.items) {
    const conflict = await prisma.booking.findFirst({
      where: {
        courtId: item.courtId,
        date: new Date(item.date + 'T00:00:00'),
        status: 'CONFIRMED',
        OR: [
          { startTime: { gte: item.startTime, lt: item.endTime } },
          { endTime: { gt: item.startTime, lte: item.endTime } },
          { startTime: { lte: item.startTime }, endTime: { gte: item.endTime } },
        ],
      },
      select: { id: true },
    })
    if (conflict) unavailable.push(item.cartItemId)
  }

  return NextResponse.json({ unavailable })
}
