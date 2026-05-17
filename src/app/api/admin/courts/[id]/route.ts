import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'
import { emitToAll } from '@/lib/socket-server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const allowed = [
    'name', 'description', 'pricePerHour', 'images', 'imageUrl', 'isActive',
    'amenities', 'location', 'maxPlayers', 'openTime', 'closeTime', 'slotDuration',
    'morningOpen', 'morningClose', 'morningEnabled',
    'afternoonOpen', 'afternoonClose', 'afternoonEnabled',
  ]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const repo = new PrismaCourtRepository()
  const updated = await repo.update(id, data as any)

  // Notifica todos os clientes e admins conectados em tempo real
  emitToAll('court:updated', updated)

  return NextResponse.json(updated)
}
