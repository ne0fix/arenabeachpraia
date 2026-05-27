'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export async function loginAction(
  email: string,
  password: string,
  callbackUrl?: string
): Promise<string | null> {
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
