import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

async function requireAdmin(req?: Request) {
  const session = await auth()
  if (!session?.user || !['MANAGER', 'ADMIN'].includes((session.user as any).role)) {
    return null
  }
  return session
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, cpf: true,
      role: true, status: true, avatarUrl: true, createdAt: true, updatedAt: true,
      _count: { select: { bookings: true } },
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, date: true, startTime: true, endTime: true,
          totalValue: true, status: true, accessCode: true,
          court: { select: { name: true } },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ message: 'Cliente não encontrado' }, { status: 404 })
  return NextResponse.json(user)
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).optional(),
  password: z.string().min(6).optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  const { id } = await params

  const body = await req.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ message: 'Dados inválidos', errors: result.error.flatten() }, { status: 400 })

  const { password, ...rest } = result.data
  const data: any = { ...rest }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  // Garante unicidade de email
  if (rest.email) {
    const conflict = await prisma.user.findFirst({ where: { email: rest.email, NOT: { id } } })
    if (conflict) return NextResponse.json({ message: 'E-mail já cadastrado por outro usuário' }, { status: 409 })
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, name: true, email: true, phone: true, cpf: true,
      role: true, status: true, createdAt: true, updatedAt: true,
    },
  })

  return NextResponse.json(user)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ message: 'Apenas ADMIN pode excluir clientes' }, { status: 403 })
  }
  const { id } = await params

  // Cancela bookings pendentes antes de deletar
  await prisma.booking.updateMany({
    where: { userId: id, status: { in: ['PENDING', 'CONFIRMED'] } },
    data: { status: 'CANCELLED', cancelReason: 'USER_DELETED', cancelledAt: new Date(), cancelledBy: 'admin' },
  })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
