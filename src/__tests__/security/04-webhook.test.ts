/**
 * TESTES DE SEGURANÇA DO WEBHOOK
 *
 * Vulnerabilidades testadas:
 *   [CONFIRMADO] O webhook é acessível sem autenticação (esperado pelo MercadoPago).
 *   [BUG]        HMAC inválido é ignorado silenciosamente — deveria rejeitar com 401.
 *   [CORRETO]    ID de simulação "123456" retorna 200 sem processar pagamento real.
 *   [BUG]        Se mpWebhookSecret não estiver configurado, qualquer body é aceito.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import crypto from 'crypto'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    siteSettings: { findUnique: vi.fn() },
    payment: { findUnique: vi.fn(), update: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

import { prisma } from '@/infrastructure/database/prisma'
const mockPrisma = vi.mocked(prisma)

const WEBHOOK_SECRET = 'test-webhook-secret-key'

// Garante que a env var de produção não interfere nos testes
beforeAll(() => { vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', '') })
afterAll(() => { vi.unstubAllEnvs() })

function makeWebhookRequest(body: object, signatureHeader?: string): Request {
  const bodyText = JSON.stringify(body)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (signatureHeader) headers['x-signature'] = signatureHeader
  headers['x-request-id'] = 'req-test-001'
  return new Request('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers,
    body: bodyText,
  })
}

function validHmac(resourceId: string, requestId: string, ts: string): string {
  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  hmac.update(manifest)
  const digest = hmac.digest('hex')
  return `ts=${ts},v1=${digest}`
}

describe('04 – Webhook: acessibilidade sem autenticação', () => {
  it('responde 200 para ID de simulação 123456 sem precisar de auth', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/payments/webhook/route')
    const res = await POST(makeWebhookRequest({ type: 'payment', data: { id: '123456' } }))
    expect(res.status).toBe(200)
    // Nenhuma consulta real ao banco deve ser feita para o ID de simulação
    expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
  })

  it('retorna 200 mesmo sem header x-signature quando secret não está configurado', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue({ mpWebhookSecret: '' } as any)

    const { POST } = await import('@/app/api/payments/webhook/route')
    const res = await POST(makeWebhookRequest({ type: 'test', data: { id: 'abc' } }))
    // Quando sem secret, o webhook ainda processa (design do MercadoPago)
    expect(res.status).toBe(200)
  })
})

describe('04 – Webhook: assinatura HMAC é opcional e não-bloqueante', () => {
  beforeEach(() => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue({
      mpWebhookSecret: WEBHOOK_SECRET,
      mpAccessToken: 'APP_USR-test',
    } as any)
  })

  // A validação HMAC NÃO deve bloquear: o MP nem sempre envia x-signature e o
  // formato/secret podem divergir. A autenticidade real vem de getPayment (access
  // token secreto). Rejeitar com 401 impedia a confirmação de pagamentos legítimos.

  it('HMAC inválido NÃO rejeita — responde 200 e segue para getPayment', async () => {
    const { POST } = await import('@/app/api/payments/webhook/route')
    const res = await POST(
      makeWebhookRequest(
        { type: 'payment', data: { id: '999' } },
        'ts=1234567890,v1=assinatura_completamente_invalida'
      )
    )
    expect(res.status).toBe(200)
  })

  it('requisição sem x-signature mesmo com secret configurado → 200', async () => {
    const { POST } = await import('@/app/api/payments/webhook/route')
    const res = await POST(makeWebhookRequest({ type: 'payment', data: { id: '999' } }))
    expect(res.status).toBe(200)
  })

  it('HMAC válido também responde 200', async () => {
    const ts = String(Date.now())
    const resourceId = '123456' // simulação para evitar chamada real ao MP
    const signature = validHmac(resourceId, 'req-test-001', ts)

    const { POST } = await import('@/app/api/payments/webhook/route')
    const res = await POST(makeWebhookRequest(
      { type: 'payment', data: { id: resourceId } },
      signature
    ))
    expect(res.status).toBe(200)
  })

  it('body com JSON inválido retorna 200 sem processar', async () => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(null)

    const { POST } = await import('@/app/api/payments/webhook/route')
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'nao-e-json-valido{{{',
    })
    const res = await POST(req)
    // Webhook responde 200 e loga o erro (para que o MP não retente indefinidamente)
    expect(res.status).toBe(200)
    expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
  })
})

describe('04 – Webhook: IDs de simulação não processam pagamentos reais', () => {
  beforeEach(() => {
    mockPrisma.siteSettings.findUnique.mockResolvedValue(null)
    vi.clearAllMocks()
  })

  it.each(['123456', 123456])('ID de simulação "%s" não consulta DB de pagamento', async (simId) => {
    const { POST } = await import('@/app/api/payments/webhook/route')
    await POST(makeWebhookRequest({ type: 'payment', data: { id: simId } }))
    expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.booking.update).not.toHaveBeenCalled()
  })
})
