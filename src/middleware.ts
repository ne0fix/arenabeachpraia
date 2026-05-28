// Middleware roda no Edge Runtime da Vercel.
// Importa apenas auth.config.ts (sem Prisma, sem bcrypt).
import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const CANONICAL_HOST = 'arenabeachserra.com.br'
const ALT_HOSTS = new Set([
  'arenabeachserra.vercel.app',
  'www.arenabeachserra.com.br',
])

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const host = (req.headers.get('host') || '').toLowerCase()

  // Redireciona variantes de host para o domínio canônico (preserva path + cookies)
  if (ALT_HOSTS.has(host)) {
    const url = req.nextUrl.clone()
    url.host = CANONICAL_HOST
    url.protocol = 'https:'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  return undefined
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/payments/webhook).*)'],
}
