import type { NextAuthConfig } from 'next-auth'

// Configuração Edge-safe: sem Prisma, sem bcrypt.
// Usada pelo middleware (Edge Runtime).
// A autenticação completa (com DB) fica em auth.ts.
export const authConfig: NextAuthConfig = {
  providers: [],
  trustHost: true, // necessário para Vercel (HTTPS em domínios *.vercel.app)
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = (auth?.user as any)?.role
      const isAdmin = role === 'MANAGER' || role === 'ADMIN'

      const isAdminLoginPage = nextUrl.pathname === '/admin/login'
      const isAdminRoute =
        (nextUrl.pathname.startsWith('/admin') && !isAdminLoginPage) ||
        nextUrl.pathname.startsWith('/api/admin')
      const protectedClient = ['/bookings', '/profile', '/payment', '/booking-success', '/booking-error']
      const isProtectedClient = protectedClient.some((p) => nextUrl.pathname.startsWith(p))

      // Página de login admin: redireciona quem já está autenticado como admin
      if (isAdminLoginPage) {
        if (isLoggedIn && isAdmin) return Response.redirect(new URL('/admin/dashboard', nextUrl))
        return true
      }

      // Rotas admin: exige autenticação e role admin/manager
      if (isAdminRoute) {
        if (!isLoggedIn) return Response.redirect(new URL('/admin/login', nextUrl))
        if (!isAdmin) return Response.redirect(new URL('/', nextUrl))
      }

      // Rotas cliente protegidas — preserva a URL original como callbackUrl
      if (isProtectedClient && !isLoggedIn) {
        const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
        return Response.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl))
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = (user as any).id
      }
      return token
    },
    session({ session, token }) {
      if (token.role) (session.user as any).role = token.role
      if (token.id) (session.user as any).id = token.id
      return session
    },
  },
  session: { strategy: 'jwt' },
}
