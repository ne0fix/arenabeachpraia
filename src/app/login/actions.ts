'use server'

import { signIn } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export async function loginAction(
  email: string,
  password: string,
  callbackUrl?: string
): Promise<string | null> {
  // Segregação de acesso: administradores/gerentes não entram pela área do cliente.
  // Devem usar exclusivamente o painel administrativo (/admin/login).
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  })
  if (existing && (existing.role === 'ADMIN' || existing.role === 'MANAGER')) {
    return 'Esta área é exclusiva para clientes. Administradores devem acessar pelo painel administrativo.'
  }

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      return 'E-mail ou senha incorretos.'
    }
    throw error
  }
  // Permite apenas caminhos relativos (segurança contra open redirect)
  const safe = callbackUrl?.startsWith('/') ? callbackUrl : '/auth/redirect'
  redirect(safe)
}
