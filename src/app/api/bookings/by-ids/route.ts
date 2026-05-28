import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const idsParam = searchParams.get('ids') ?? ''
  const ids = idsParam.split(',').filter(Boolean)
  if (ids.length === 0) {
    return NextResponse.json({ bookings: [] })
  }

  // Garante que só o dono ou admin pode buscar
  const isAdmin = ['MANAGER', 'ADMIN'].includes(session.user.role)
  const bookings = await prisma.booking.findMany({
    where: {
      id: { in: ids },
      ...(isAdmin ? {} : { userId: session.user.id }),
    },
    include: {
      court: { select: { id: true, name: true } },
      payment: { select: { status: true, amount: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  return NextResponse.json({ bookings })
}
