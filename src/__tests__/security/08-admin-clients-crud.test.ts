/**
 * TESTES DE CRUD DE CLIENTES (ADMIN)
 * Verifica GET, PUT e DELETE em /api/admin/clients/[id].
 * Regras:
 *   - GET/PUT: exige MANAGER ou ADMIN
 *   - DELETE:  exige apenas ADMIN
 *   - PUT email duplicado → 409
 *   - PUT body inválido   → 400
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessions, jsonReq, getReq } from './helpers'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
    booking: {
      updateMany: vi.fn(),
    },
  },
}))

import { auth } from '@/auth'
const mockAuth = vi.mocked(auth)

const params = { params: Promise.resolve({ id: 'client-1' }) }

const mockUser = {
  id: 'client-1',
  name: 'João Silva',
  email: 'joao@email.com',
  phone: '(11) 99999-9999',
  cpf: null,
  role: 'CLIENT',
  status: 'ACTIVE',
  avatarUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  _count: { bookings: 0 },
  bookings: [],
}

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('08 – Admin Clients CRUD: GET /api/admin/clients/[id]', () => {
  it('sem sessão → 403', async () => {
    mockAuth.mockResolvedValue(sessions.unauthenticated as any)
    const { GET } = await import('@/app/api/admin/clients/[id]/route')
    const res = await GET(getReq('/api/admin/clients/client-1'), params)
    expect(res.status).toBe(403)
  })

  it('CLIENT → 403', async () => {
    mockAuth.mockResolvedValue(sessions.client as any)
    const { GET } = await import('@/app/api/admin/clients/[id]/route')
    const res = await GET(getReq('/api/admin/clients/client-1'), params)
    expect(res.status).toBe(403)
  })

  it('ADMIN com cliente existente → 200 com dados', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const { GET } = await import('@/app/api/admin/clients/[id]/route')
    const res = await GET(getReq('/api/admin/clients/client-1'), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('client-1')
    expect(body.email).toBe('joao@email.com')
  })

  it('ADMIN com ID inexistente → 404', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const { GET } = await import('@/app/api/admin/clients/[id]/route')
    const res = await GET(getReq('/api/admin/clients/nao-existe'), { params: Promise.resolve({ id: 'nao-existe' }) })
    expect(res.status).toBe(404)
  })

  it('MANAGER → 200 (também pode consultar)', async () => {
    mockAuth.mockResolvedValue(sessions.manager as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)

    const { GET } = await import('@/app/api/admin/clients/[id]/route')
    const res = await GET(getReq('/api/admin/clients/client-1'), params)
    expect(res.status).toBe(200)
  })
})

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe('08 – Admin Clients CRUD: PUT /api/admin/clients/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sem sessão → 403', async () => {
    mockAuth.mockResolvedValue(sessions.unauthenticated as any)
    const { PUT } = await import('@/app/api/admin/clients/[id]/route')
    const res = await PUT(jsonReq('/api/admin/clients/c1', 'PUT', { name: 'Novo Nome' }), params)
    expect(res.status).toBe(403)
  })

  it('body inválido (email malformado) → 400', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { PUT } = await import('@/app/api/admin/clients/[id]/route')
    const res = await PUT(jsonReq('/api/admin/clients/c1', 'PUT', { email: 'nao-e-email' }), params)
    expect(res.status).toBe(400)
  })

  it('email já usado por outro usuário → 409', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'outro-user' } as any)

    const { PUT } = await import('@/app/api/admin/clients/[id]/route')
    const res = await PUT(
      jsonReq('/api/admin/clients/client-1', 'PUT', { email: 'emuso@email.com' }),
      params
    )
    expect(res.status).toBe(409)
  })

  it('ADMIN atualiza nome e telefone → 200', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null) // sem conflito de email
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, name: 'Novo Nome' } as any)

    const { PUT } = await import('@/app/api/admin/clients/[id]/route')
    const res = await PUT(
      jsonReq('/api/admin/clients/client-1', 'PUT', { name: 'Novo Nome', phone: '(27) 98888-7777' }),
      params
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Novo Nome')
  })

  it('ADMIN atualiza status para BANNED → 200', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, status: 'BANNED' } as any)

    const { PUT } = await import('@/app/api/admin/clients/[id]/route')
    const res = await PUT(
      jsonReq('/api/admin/clients/client-1', 'PUT', { status: 'BANNED' }),
      params
    )
    expect(res.status).toBe(200)
  })

  it('senha com menos de 6 caracteres → 400', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { PUT } = await import('@/app/api/admin/clients/[id]/route')
    const res = await PUT(
      jsonReq('/api/admin/clients/client-1', 'PUT', { password: '123' }),
      params
    )
    expect(res.status).toBe(400)
  })
})

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe('08 – Admin Clients CRUD: DELETE /api/admin/clients/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sem sessão → 403', async () => {
    mockAuth.mockResolvedValue(sessions.unauthenticated as any)
    const { DELETE } = await import('@/app/api/admin/clients/[id]/route')
    const res = await DELETE(new Request('http://localhost/api/admin/clients/c1', { method: 'DELETE' }), params)
    expect(res.status).toBe(403)
  })

  it('MANAGER → 403 (apenas ADMIN pode excluir)', async () => {
    mockAuth.mockResolvedValue(sessions.manager as any)
    const { DELETE } = await import('@/app/api/admin/clients/[id]/route')
    const res = await DELETE(new Request('http://localhost/api/admin/clients/c1', { method: 'DELETE' }), params)
    expect(res.status).toBe(403)
  })

  it('CLIENT → 403', async () => {
    mockAuth.mockResolvedValue(sessions.client as any)
    const { DELETE } = await import('@/app/api/admin/clients/[id]/route')
    const res = await DELETE(new Request('http://localhost/api/admin/clients/c1', { method: 'DELETE' }), params)
    expect(res.status).toBe(403)
  })

  it('ADMIN → 200 com { ok: true }', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.user.delete).mockResolvedValue(mockUser as any)

    const { DELETE } = await import('@/app/api/admin/clients/[id]/route')
    const res = await DELETE(new Request('http://localhost/api/admin/clients/c1', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('ADMIN: cancela bookings ativos antes de deletar', async () => {
    mockAuth.mockResolvedValue(sessions.admin as any)
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 2 })
    vi.mocked(prisma.user.delete).mockResolvedValue(mockUser as any)

    const { DELETE } = await import('@/app/api/admin/clients/[id]/route')
    await DELETE(new Request('http://localhost/api/admin/clients/c1', { method: 'DELETE' }), params)

    expect(prisma.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'client-1' }),
        data: expect.objectContaining({ status: 'CANCELLED' }),
      })
    )
  })
})
