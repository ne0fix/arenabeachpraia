import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z.string().min(8, 'A nova senha deve ter ao menos 8 caracteres'),
})

export async function PUT(request: Request) {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.passwordHash) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
