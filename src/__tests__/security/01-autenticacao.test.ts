/**
 * TESTES DE AUTENTICAÇÃO
 * Verifica que todos os endpoints protegidos rejeitam requisições sem sessão válida.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessions, jsonReq, getReq } from './helpers'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    court: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn() },
    siteSettings: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    payment: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

import { auth } from '@/auth'
const mockAuth = vi.mocked(auth)

describe('01 – Autenticação: endpoints protegidos rejeitam sem sessão', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessions.unauthenticated as any)
  })

  it('POST /api/bookings → 401', async () => {
    const { POST } = await import('@/app/api/bookings/route')
    const res = await POST(jsonReq('/api/bookings', 'POST', { courtId: 'c1', date: '2026-06-01', startTime: '09:00', paymentMethod: 'PIX' }))
    expect(res.status).toBe(401)
  })

  it('GET /api/bookings/my → 401', async () => {
    const { GET } = await import('@/app/api/bookings/my/route')
    const res = await GET(getReq('/api/bookings/my'))
    expect(res.status).toBe(401)
  })

  it('POST /api/bookings/[id]/cancel → 401', async () => {
    const { POST } = await import('@/app/api/bookings/[id]/cancel/route')
    const res = await POST(
      jsonReq('/api/bookings/b1/cancel', 'POST', { reason: 'Motivo teste', refund: false }),
      { params: Promise.resolve({ id: 'b1' }) }
    )
    expect(res.status).toBe(401)
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
      jsonReq('/api/admin/courts/c1', 'PUT', { name: 'Nova Quadra' }),
      { params: Promise.resolve({ id: 'c1' }) }
    )
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/settings/payment → 401', async () => {
    const { GET } = await import('@/app/api/admin/settings/payment/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('PUT /api/admin/settings/payment → 401', async () => {
    const { PUT } = await import('@/app/api/admin/settings/payment/route')
    const res = await PUT(jsonReq('/api/admin/settings/payment', 'PUT', {}))
    expect(res.status).toBe(401)
  })

  it('PUT /api/admin/settings/password → 401', async () => {
    const { PUT } = await import('@/app/api/admin/settings/password/route')
    const res = await PUT(jsonReq('/api/admin/settings/password', 'PUT', { currentPassword: 'old', newPassword: 'newpassword123' }))
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/financeiro/summary → 403', async () => {
    const { GET } = await import('@/app/api/admin/financeiro/summary/route')
    const res = await GET(getReq('/api/admin/financeiro/summary?startDate=2026-01-01&endDate=2026-12-31'))
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/financeiro/transactions → 403', async () => {
    const { GET } = await import('@/app/api/admin/financeiro/transactions/route')
    const res = await GET(getReq('/api/admin/financeiro/transactions'))
    expect(res.status).toBe(403)
  })

  it('POST /api/payments/refund → 403', async () => {
    const { POST } = await import('@/app/api/payments/refund/route')
    const res = await POST(jsonReq('/api/payments/refund', 'POST', { bookingId: 'b1', reason: 'teste' }))
    expect(res.status).toBe(403)
  })

  it('GET /api/admin/reports → 403', async () => {
    const { GET } = await import('@/app/api/admin/reports/route')
    const res = await GET(getReq('/api/admin/reports?startDate=2026-01-01&endDate=2026-12-31'))
    expect(res.status).toBe(403)
  })
})
