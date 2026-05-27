/**
 * TESTES DE VALIDAÇÃO DE ENTRADA
 * Verifica que dados malformados ou fora do esperado são rejeitados com 400.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessions, jsonReq, getReq } from './helpers'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    court: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    siteSettings: { findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

import { auth } from '@/auth'
const mockAuth = vi.mocked(auth)

// ─── Registro de usuário ──────────────────────────────────────────────────────

describe('03 – Validação: POST /api/auth/register', () => {
  it('rejeita senha com menos de 8 caracteres → 400', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(jsonReq('/api/auth/register', 'POST', {
      name: 'João Silva',
      email: 'joao@email.com',
      password: '123',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/senha/i)
  })

  it('rejeita e-mail inválido → 400', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(jsonReq('/api/auth/register', 'POST', {
      name: 'João Silva',
      email: 'nao-e-um-email',
      password: 'senhasegura123',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/e-mail/i)
  })

  it('rejeita nome com menos de 2 caracteres → 400', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(jsonReq('/api/auth/register', 'POST', {
      name: 'A',
      email: 'joao@email.com',
      password: 'senhasegura123',
    }))
    expect(res.status).toBe(400)
  })

  it('rejeita e-mail duplicado → 409', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing', email: 'ja@existe.com' } as any)

    const { POST } = await import('@/app/api/auth/register/route')
    const res = await POST(jsonReq('/api/auth/register', 'POST', {
      name: 'Maria',
      email: 'ja@existe.com',
      password: 'senhasegura123',
    }))
    expect(res.status).toBe(409)
  })
})

// ─── Cancelamento de reserva ──────────────────────────────────────────────────

describe('03 – Validação: POST /api/bookings/[id]/cancel', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessions.client as any)
  })

  it('rejeita motivo com menos de 3 caracteres → 400', async () => {
    const { POST } = await import('@/app/api/bookings/[id]/cancel/route')
    const res = await POST(
      jsonReq('/api/bookings/b1/cancel', 'POST', { reason: 'ab', refund: false }),
      { params: Promise.resolve({ id: 'b1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('rejeita body sem campo reason → 400', async () => {
    const { POST } = await import('@/app/api/bookings/[id]/cancel/route')
    const res = await POST(
      jsonReq('/api/bookings/b1/cancel', 'POST', { refund: false }),
      { params: Promise.resolve({ id: 'b1' }) }
    )
    expect(res.status).toBe(400)
  })
})

// ─── Criação de reserva ───────────────────────────────────────────────────────

describe('03 – Validação: POST /api/bookings', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessions.client as any)
  })

  it('rejeita data com formato inválido → 400', async () => {
    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(jsonReq('/api/bookings', 'POST', {
      courtId: 'c1',
      date: '01/06/2026', // formato errado, esperado YYYY-MM-DD
      startTime: '09:00',
      paymentMethod: 'PIX',
    }))
    expect(res.status).toBe(400)
  })

  it('rejeita método de pagamento inválido → 400', async () => {
    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(jsonReq('/api/bookings', 'POST', {
      courtId: 'c1',
      date: '2026-06-01',
      startTime: '09:00',
      paymentMethod: 'DINHEIRO', // não é enum válido
    }))
    expect(res.status).toBe(400)
  })

  it('rejeita horário com formato inválido → 400', async () => {
    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(jsonReq('/api/bookings', 'POST', {
      courtId: 'c1',
      date: '2026-06-01',
      startTime: '9h00',  // formato errado, esperado HH:MM
      paymentMethod: 'PIX',
    }))
    expect(res.status).toBe(400)
  })
})

// ─── Disponibilidade de quadra (endpoint público) ─────────────────────────────

describe('03 – Validação: GET /api/courts/[id]/availability', () => {
  it('rejeita data com formato inválido → 400', async () => {
    const { GET } = await import('@/app/api/courts/[id]/availability/route')
    const res = await GET(
      getReq('/api/courts/c1/availability?date=32-13-2026'),
      { params: Promise.resolve({ id: 'c1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('rejeita requisição sem parâmetro date → 400', async () => {
    const { GET } = await import('@/app/api/courts/[id]/availability/route')
    const res = await GET(
      getReq('/api/courts/c1/availability'),
      { params: Promise.resolve({ id: 'c1' }) }
    )
    expect(res.status).toBe(400)
  })
})

// ─── Datas financeiras (admin) ────────────────────────────────────────────────

describe('03 – Validação: GET /api/admin/financeiro/summary', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessions.admin as any)
  })

  it('rejeita requisição sem startDate/endDate → 400', async () => {
    const { GET } = await import('@/app/api/admin/financeiro/summary/route')
    const res = await GET(getReq('/api/admin/financeiro/summary'))
    expect(res.status).toBe(400)
  })
})
