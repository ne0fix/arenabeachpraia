/**
 * TESTES DE AUTORIZAÇÃO (RBAC)
 * Verifica que perfis sem permissão adequada são bloqueados.
 * Regras:
 *   - CLIENT  → não acessa nenhum /api/admin/*
 *   - MANAGER → acessa /api/admin/* mas NÃO pode excluir quadras
 *   - ADMIN   → acesso total
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessions, jsonReq, getReq } from './helpers'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    court: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    siteSettings: { findUnique: vi.fn(), upsert: vi.fn() },
    payment: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

import { auth } from '@/auth'
const mockAuth = vi.mocked(auth)

// ─── CLIENT não acessa rotas admin ───────────────────────────────────────────

describe('02 – Autorização: CLIENT não pode acessar endpoints admin', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessions.client as any)
  })

  it('GET /api/admin/clients → 403', async () => {
    const { GET } = await import('@/app/api/admin/clients/route')
    const res = await GET(getReq('/api/admin/clients'))
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/courts → 401', async () => {
    const { GET } = await import('@/app/api/admin/courts/route')
    const res = await GET(getReq('/api/admin/courts'))
    expect(res.status).toBe(401)
  })

  it('PUT /api/admin/courts/[id] → 401', async () => {
    const { PUT } = await import('@/app/api/admin/courts/[id]/route')
    const res = await PUT(
      jsonReq('/api/admin/courts/c1', 'PUT', { name: 'Hack' }),
      { params: Promise.resolve({ id: 'c1' }) }
    )
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/settings/payment → 401', async () => {
    const { GET } = await import('@/app/api/admin/settings/payment/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('PUT /api/admin/settings/password → 401', async () => {
    const { PUT } = await import('@/app/api/admin/settings/password/route')
    const res = await PUT(jsonReq('/api/admin/settings/password', 'PUT', {
      currentPassword: 'any',
      newPassword: 'newpass123',
    }))
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/financeiro/summary → 403', async () => {
    const { GET } = await import('@/app/api/admin/financeiro/summary/route')
    const res = await GET(getReq('/api/admin/financeiro/summary?startDate=2026-01-01&endDate=2026-12-31'))
    expect(res.status).toBe(403)
  })

  it('POST /api/payments/refund → 403', async () => {
    const { POST } = await import('@/app/api/payments/refund/route')
    const res = await POST(jsonReq('/api/payments/refund', 'POST', { bookingId: 'b1', reason: 'Fraude' }))
    expect(res.status).toBe(403)
  })
})

// ─── MANAGER não pode excluir quadras (apenas ADMIN) ─────────────────────────

describe('02 – Autorização: MANAGER não pode excluir quadra (requer ADMIN)', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessions.manager as any)
  })

  it('DELETE /api/courts/[id] com MANAGER → 403', async () => {
    const { DELETE } = await import('@/app/api/courts/[id]/route')
    const res = await DELETE(
      new Request('http://localhost/api/courts/c1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'c1' }) }
    )
    expect(res.status).toBe(403)
  })
})

// ─── Verificação de ownership em cancelamento ─────────────────────────────────

describe('02 – Autorização: CLIENT não cancela reserva de outro cliente', () => {
  it('CLIENT B não pode cancelar reserva de CLIENT A', async () => {
    // CLIENT B tenta cancelar
    mockAuth.mockResolvedValue(sessions.otherClient as any)

    const { prisma } = await import('@/infrastructure/database/prisma')
    const mockPrisma = vi.mocked(prisma)

    // Booking pertence ao CLIENT A
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-de-a',
      userId: sessions.client.user.id, // dono: CLIENT A
      status: 'CONFIRMED',
      courtId: 'c1',
      date: new Date('2026-06-01'),
      startTime: '09:00',
      endTime: '10:00',
      totalValue: 100,
      accessCode: 'ABCD1234',
      payment: null,
    } as any)

    const { POST } = await import('@/app/api/bookings/[id]/cancel/route')
    const res = await POST(
      jsonReq('/api/bookings/booking-de-a/cancel', 'POST', { reason: 'Tentando cancelar do outro', refund: false }),
      { params: Promise.resolve({ id: 'booking-de-a' }) }
    )

    // CancelBookingUseCase verifica userId !== cancelledBy → AppError UNAUTHORIZED → 403
    expect(res.status).toBe(403)
  })

  it('CLIENT A pode cancelar sua própria reserva', async () => {
    mockAuth.mockResolvedValue(sessions.client as any)

    const { prisma } = await import('@/infrastructure/database/prisma')
    const mockPrisma = vi.mocked(prisma)

    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-de-a',
      userId: sessions.client.user.id, // dono: CLIENT A
      status: 'CONFIRMED',
      courtId: 'c1',
      date: new Date('2026-06-01'),
      startTime: '09:00',
      endTime: '10:00',
      totalValue: 100,
      accessCode: 'ABCD1234',
      payment: null,
    } as any)

    mockPrisma.booking.update.mockResolvedValue({
      id: 'booking-de-a',
      userId: sessions.client.user.id,
      status: 'CANCELLED',
    } as any)

    mockPrisma.auditLog.create.mockResolvedValue({} as any)

    const { POST } = await import('@/app/api/bookings/[id]/cancel/route')
    const res = await POST(
      jsonReq('/api/bookings/booking-de-a/cancel', 'POST', { reason: 'Não poderei comparecer', refund: false }),
      { params: Promise.resolve({ id: 'booking-de-a' }) }
    )

    expect(res.status).toBe(200)
  })
})
