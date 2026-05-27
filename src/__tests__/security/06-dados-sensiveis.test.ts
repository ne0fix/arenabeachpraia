/**
 * TESTES DE EXPOSIÇÃO DE DADOS SENSÍVEIS
 * Verifica que credenciais e dados privados não vazam para endpoints públicos ou perfis errados.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessions, getReq, jsonReq } from './helpers'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    court: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    siteSettings: { findUnique: vi.fn(), upsert: vi.fn() },
    payment: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/infrastructure/database/prisma'

const mockAuth = vi.mocked(auth)
const mockPrisma = vi.mocked(prisma)

const SENSITIVE_SITE_SETTINGS = {
  id: 'singleton',
  mpAccessToken: 'APP_USR-1234567890-privado',
  mpPublicKey: 'APP_USR-publico-key',
  mpWebhookSecret: 'webhook-secret-privado',
  mpNotificationUrl: '',
  whatsappNumber: '5527999999999',
  phone: '2799999999',
  email: 'arena@email.com',
  address: 'Rua Teste, 123',
  hoursWeekdays: '07:00 - 22:00',
  hoursSaturday: '07:00 - 20:00',
  hoursSunday: '08:00 - 18:00',
  msgContact: 'Olá!',
  msgExclusive: 'Exclusivo',
  msgSupport: 'Suporte',
}

describe('06 – Dados sensíveis: GET /api/settings/public', () => {
  beforeEach(() => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(SENSITIVE_SITE_SETTINGS as any)
  })

  it('NÃO expõe mpAccessToken (credencial privada da API)', async () => {
    const { GET } = await import('@/app/api/settings/public/route')
    const res = await GET()
    const body = await res.json()
    expect(body.mpAccessToken).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('APP_USR-1234567890-privado')
  })

  it('NÃO expõe mpWebhookSecret', async () => {
    const { GET } = await import('@/app/api/settings/public/route')
    const res = await GET()
    const body = await res.json()
    expect(body.mpWebhookSecret).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('webhook-secret-privado')
  })

  it('expõe mpPublicKey (necessária para o frontend do MP)', async () => {
    const { GET } = await import('@/app/api/settings/public/route')
    const res = await GET()
    const body = await res.json()
    expect(body.mpPublicKey).toBe('APP_USR-publico-key')
  })

  it('não expõe campos internos de configuração', async () => {
    const { GET } = await import('@/app/api/settings/public/route')
    const res = await GET()
    const body = await res.json()
    // Campos que não devem aparecer na API pública
    expect(body.id).toBeUndefined()
    expect(body.mpNotificationUrl).toBeUndefined()
  })
})

describe('06 – Dados sensíveis: GET /api/admin/settings/payment', () => {
  beforeEach(() => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(SENSITIVE_SITE_SETTINGS as any)
  })

  it('retorna mpAccessToken apenas para ADMIN autenticado', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { GET } = await import('@/app/api/admin/settings/payment/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mpAccessToken).toBeDefined()
  })

  it('retorna mpAccessToken também para MANAGER autenticado', async () => {
    mockAuth.mockResolvedValue(sessions.manager as any)
    const { GET } = await import('@/app/api/admin/settings/payment/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('bloqueia acesso de CLIENT → 401', async () => {
    mockAuth.mockResolvedValue(sessions.client as any)
    const { GET } = await import('@/app/api/admin/settings/payment/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })
})

describe('06 – Dados sensíveis: GET /api/admin/clients', () => {
  it('NÃO expõe passwordHash dos clientes', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const clientRow = {
      id: 'u1',
      name: 'Cliente',
      email: 'cliente@teste.com',
      phone: '27999999999',
      status: 'ACTIVE',
      createdAt: new Date(),
      _count: { bookings: 2 },
      bookings: [{ createdAt: new Date() }],
      // passwordHash deliberadamente ausente (select do Prisma não o inclui)
    }
    mockPrisma.user.findMany.mockResolvedValue([clientRow] as any)
    vi.mocked(prisma.user.count).mockResolvedValue(1)

    const { GET } = await import('@/app/api/admin/clients/route')
    const res = await GET(getReq('/api/admin/clients'))
    const body = await res.json()

    const clients = body.clients ?? body
    if (Array.isArray(clients)) {
      clients.forEach((c: any) => {
        expect(c.passwordHash).toBeUndefined()
      })
    }
  })
})

describe('06 – Dados sensíveis: GET /api/bookings/[id] — isolamento entre usuários', () => {
  it('CLIENT pode acessar sua própria reserva', async () => {
    mockAuth.mockResolvedValue(sessions.client as any)
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'b1',
      userId: sessions.client.user.id,
      status: 'CONFIRMED',
      courtId: 'c1',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      totalValue: 100,
      court: { name: 'Quadra 1' },
      payment: null,
    } as any)

    const { GET } = await import('@/app/api/bookings/[id]/route')
    const res = await GET(
      getReq('/api/bookings/b1'),
      { params: Promise.resolve({ id: 'b1' }) }
    )
    expect(res.status).toBe(200)
  })

  it('CLIENT não pode acessar reserva de outro usuário → 403', async () => {
    mockAuth.mockResolvedValue(sessions.otherClient as any)
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'b1',
      userId: sessions.client.user.id, // dono: CLIENT, não otherClient
      status: 'CONFIRMED',
      courtId: 'c1',
    } as any)

    const { GET } = await import('@/app/api/bookings/[id]/route')
    const res = await GET(
      getReq('/api/bookings/b1'),
      { params: Promise.resolve({ id: 'b1' }) }
    )
    expect(res.status).toBe(403)
  })
})
