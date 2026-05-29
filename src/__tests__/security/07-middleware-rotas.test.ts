/**
 * TESTES DE MIDDLEWARE — ROTAS PROTEGIDAS
 * Testa diretamente o callback `authorized` de auth.config.ts,
 * que é a fonte de verdade para redirecionamentos de proteção de rota.
 */
import { describe, it, expect } from 'vitest'
import { authConfig } from '@/auth.config'

const authorized = authConfig.callbacks!.authorized! as (params: {
  auth: unknown
  request: { nextUrl: URL }
}) => unknown

function ctx(pathname: string, auth: unknown, search = '') {
  return {
    auth,
    request: { nextUrl: new URL(`http://localhost${pathname}${search}`) },
  }
}

const admin   = { user: { id: 'a1', name: 'Admin',   email: 'admin@arena.com',   role: 'ADMIN' } }
const manager = { user: { id: 'm1', name: 'Manager', email: 'manager@arena.com', role: 'MANAGER' } }
const client  = { user: { id: 'c1', name: 'Client',  email: 'client@arena.com',  role: 'CLIENT' } }

// ─── Admin sem sessão ─────────────────────────────────────────────────────────

describe('07 – Middleware: rotas admin sem sessão → /admin/login', () => {
  it('/admin/dashboard sem sessão → redirect /admin/login', async () => {
    const result = await authorized(ctx('/admin/dashboard', null))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/admin/login')
  })

  it('/admin/clients sem sessão → redirect /admin/login', async () => {
    const result = await authorized(ctx('/admin/clients', null))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/admin/login')
  })

  it('/admin/financeiro sem sessão → redirect /admin/login', async () => {
    const result = await authorized(ctx('/admin/financeiro', null))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/admin/login')
  })

  it('/api/admin/clients sem sessão → redirect /admin/login', async () => {
    const result = await authorized(ctx('/api/admin/clients', null))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/admin/login')
  })
})

// ─── CLIENT tenta acessar admin ───────────────────────────────────────────────

describe('07 – Middleware: CLIENT em rota admin → redirect /', () => {
  it('/admin/dashboard com role CLIENT → redirect /', async () => {
    const result = await authorized(ctx('/admin/dashboard', client))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/')
  })

  it('/admin/settings com role CLIENT → redirect /', async () => {
    const result = await authorized(ctx('/admin/settings', client))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/')
  })
})

// ─── Admin já logado tenta acessar /admin/login ───────────────────────────────

describe('07 – Middleware: admin autenticado em /admin/login → redirect /admin/dashboard', () => {
  it('ADMIN em /admin/login → redirect /admin/dashboard', async () => {
    const result = await authorized(ctx('/admin/login', admin))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/admin/dashboard')
  })

  it('MANAGER em /admin/login → redirect /admin/dashboard', async () => {
    const result = await authorized(ctx('/admin/login', manager))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/admin/dashboard')
  })
})

// ─── Rotas cliente protegidas sem sessão ─────────────────────────────────────

describe('07 – Middleware: rotas cliente sem sessão → /login?callbackUrl=...', () => {
  it('/bookings sem sessão → redirect /login com callbackUrl', async () => {
    const result = await authorized(ctx('/bookings', null))
    expect(result).toBeInstanceOf(Response)
    const location = new URL((result as Response).headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toBeTruthy()
  })

  it('/profile sem sessão → redirect /login com callbackUrl', async () => {
    const result = await authorized(ctx('/profile', null))
    expect(result).toBeInstanceOf(Response)
    const location = new URL((result as Response).headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(decodeURIComponent(location.searchParams.get('callbackUrl')!)).toBe('/profile')
  })

  it('/payment?courtId=x sem sessão → callbackUrl preserva query string', async () => {
    const result = await authorized(ctx('/payment', null, '?courtId=c1&date=2026-06-01'))
    expect(result).toBeInstanceOf(Response)
    const location = new URL((result as Response).headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(decodeURIComponent(location.searchParams.get('callbackUrl')!)).toContain('courtId=c1')
  })

  it('/booking-success sem sessão → redirect /login', async () => {
    const result = await authorized(ctx('/booking-success', null))
    expect(result).toBeInstanceOf(Response)
    expect(new URL((result as Response).headers.get('location')!).pathname).toBe('/login')
  })
})

// ─── Rotas liberadas ──────────────────────────────────────────────────────────

describe('07 – Middleware: rotas públicas e admin autenticado passam sem redirect', () => {
  it('/ sem sessão → true (público)', async () => {
    expect(await authorized(ctx('/', null))).toBe(true)
  })

  it('/login sem sessão → true (público)', async () => {
    expect(await authorized(ctx('/login', null))).toBe(true)
  })

  it('/cadastro sem sessão → true (público)', async () => {
    expect(await authorized(ctx('/cadastro', null))).toBe(true)
  })

  it('/admin/dashboard com ADMIN → true', async () => {
    expect(await authorized(ctx('/admin/dashboard', admin))).toBe(true)
  })

  it('/admin/clients com MANAGER → true', async () => {
    expect(await authorized(ctx('/admin/clients', manager))).toBe(true)
  })

  it('/bookings com CLIENT autenticado → true', async () => {
    expect(await authorized(ctx('/bookings', client))).toBe(true)
  })

  it('/admin/login sem sessão → true (página de login admin é pública)', async () => {
    expect(await authorized(ctx('/admin/login', null))).toBe(true)
  })
})
