import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; unavailId: string }> }
) {
  const session = await auth()
  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id, unavailId } = await params

  await prisma.courtUnavailability.deleteMany({
    where: { id: unavailId, courtId: id },
  })

  return NextResponse.json({ ok: true })
}
