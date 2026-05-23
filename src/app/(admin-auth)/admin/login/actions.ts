'use server'

import { signIn } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export async function adminLoginAction(email: string, password: string): Promise<string | null> {
  // Verifica o role no banco ANTES do signIn — auth() após signIn não reflete a sessão recém-criada
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  })

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return 'Acesso negado. Esta área é restrita a administradores.'
  }

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      return 'E-mail ou senha incorretos.'
    }
    throw error
  }

  redirect('/admin/dashboard')
}
