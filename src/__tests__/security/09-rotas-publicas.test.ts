/**
 * TESTES DE ROTAS PÚBLICAS
 * Verifica que as APIs públicas retornam dados sem autenticação
 * e com respostas corretas para cenários comuns.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getReq, jsonReq } from './helpers'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/app/api/admin/settings/contact/route', () => ({
  CONTACT_DEFAULTS: {
    whatsappNumber: '5511999999999',
    phone: '(11) 99999-9999',
    email: 'contato@arena.com',
    address: 'Rua Arena, 1',
    hoursWeekdays: 'Seg-Sex 6h-22h',
    hoursSaturday: 'Sáb 6h-22h',
    hoursSunday: 'Dom 6h-21h',
    msgContact: 'Olá!',
    msgExclusive: 'Exclusivo',
    msgSupport: 'Suporte',
    mpPublicKey: '',
  },
}))

vi.mock('@/infrastructure/database/prisma', () => ({
  prisma: {
    court: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
    },
    booking: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
    },
    courtUnavailability: {
      findMany: vi.fn(),
    },
    siteSettings: {
      findUnique: vi.fn(),
    },
  },
}))

const mockCourt = {
  id: 'court-1',
  name: 'Quadra 01',
  description: 'Quadra de areia',
  pricePerHour: '35.00',
  imageUrl: null,
  images: [],
  type: 'REGULAR',
  amenities: [],
  maxPlayers: 10,
  showCapacity: true,
  location: 'Arena',
  courtWhatsapp: '',
  isActive: true,
  openTime: '06:00',
  closeTime: '22:00',
  slotDuration: 60,
  morningEnabled: true,
  morningOpen: '08:00',
  morningClose: '12:00',
  afternoonEnabled: true,
  afternoonOpen: '13:00',
  afternoonClose: '18:00',
  sports: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const mockSettings = {
  id: 'singleton',
  whatsappNumber: '5527999999999',
  msgContact: 'Olá!',
  msgExclusive: 'Exclusivo {nome}',
  msgSupport: 'Suporte',
  mpPublicKey: 'TEST-key',
  mpAccessToken: '',
  mpWebhookSecret: '',
  mpNotificationUrl: '',
  phone: '(27) 9999-9999',
  email: 'contato@arena.com',
  address: 'Rua Arena, 1',
  hoursWeekdays: 'Seg-Sex 6h-22h',
  hoursSaturday: 'Sáb 6h-22h',
  hoursSunday: 'Dom 6h-21h',
  updatedAt: new Date(),
}

// ─── GET /api/courts ──────────────────────────────────────────────────────────

describe('09 – Rotas públicas: GET /api/courts', () => {
  it('retorna 200 com array de quadras', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.court.findMany).mockResolvedValue([mockCourt] as any)

    const { GET } = await import('@/app/api/courts/route')
    const res = await GET(getReq('/api/courts'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].id).toBe('court-1')
  })

  it('retorna 200 com array vazio quando não há quadras', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.court.findMany).mockResolvedValue([])

    const { GET } = await import('@/app/api/courts/route')
    const res = await GET(getReq('/api/courts'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

// ─── GET /api/courts/[id] ─────────────────────────────────────────────────────

describe('09 – Rotas públicas: GET /api/courts/[id]', () => {
  const params = { params: Promise.resolve({ id: 'court-1' }) }

  it('quadra existente → 200 com dados', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.court.findUnique).mockResolvedValue(mockCourt as any)

    const { GET } = await import('@/app/api/courts/[id]/route')
    const res = await GET(getReq('/api/courts/court-1'), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Quadra 01')
  })

  it('quadra inexistente → 404', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.court.findUnique).mockResolvedValue(null)

    const { GET } = await import('@/app/api/courts/[id]/route')
    const res = await GET(getReq('/api/courts/nao-existe'), { params: Promise.resolve({ id: 'nao-existe' }) })
    expect(res.status).toBe(404)
  })
})

// ─── GET /api/courts/[id]/availability ───────────────────────────────────────

describe('09 – Rotas públicas: GET /api/courts/[id]/availability', () => {
  const params = { params: Promise.resolve({ id: 'court-1' }) }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sem parâmetro date → 400', async () => {
    const { GET } = await import('@/app/api/courts/[id]/availability/route')
    const res = await GET(getReq('/api/courts/court-1/availability'), params)
    expect(res.status).toBe(400)
  })

  it('date inválida → 400', async () => {
    const { GET } = await import('@/app/api/courts/[id]/availability/route')
    const res = await GET(getReq('/api/courts/court-1/availability?date=hoje'), params)
    expect(res.status).toBe(400)
  })

  it('quadra existente com data futura → 200 com slots', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.court.findUnique).mockResolvedValue(mockCourt as any)
    vi.mocked(prisma.booking.findMany).mockResolvedValue([])
    vi.mocked(prisma.courtUnavailability.findMany).mockResolvedValue([])

    const { GET } = await import('@/app/api/courts/[id]/availability/route')
    const res = await GET(getReq('/api/courts/court-1/availability?date=2030-06-01'), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('date', '2030-06-01')
    expect(Array.isArray(body.slots)).toBe(true)
    expect(body.slots.length).toBeGreaterThan(0)
    expect(body.slots[0]).toHaveProperty('time')
    expect(body.slots[0]).toHaveProperty('available', true)
  })

  it('quadra com indisponibilidade total → slots vazios', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.court.findUnique).mockResolvedValue(mockCourt as any)
    vi.mocked(prisma.booking.findMany).mockResolvedValue([])
    vi.mocked(prisma.courtUnavailability.findMany).mockResolvedValue([{ id: 'u1' }] as any)

    const { GET } = await import('@/app/api/courts/[id]/availability/route')
    const res = await GET(getReq('/api/courts/court-1/availability?date=2030-06-01'), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slots).toEqual([])
  })

  it('slot já reservado aparece como unavailable', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.court.findUnique).mockResolvedValue(mockCourt as any)
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      { startTime: '08:00', endTime: '09:00' },
    ] as any)
    vi.mocked(prisma.courtUnavailability.findMany).mockResolvedValue([])

    const { GET } = await import('@/app/api/courts/[id]/availability/route')
    const res = await GET(getReq('/api/courts/court-1/availability?date=2030-06-01'), params)
    const body = await res.json()
    const slot0800 = body.slots.find((s: { time: string }) => s.time === '08:00')
    expect(slot0800?.available).toBe(false)
  })
})

// ─── GET /api/settings/public ────────────────────────────────────────────────

describe('09 – Rotas públicas: GET /api/settings/public', () => {
  it('com settings no banco → 200 com dados', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue(mockSettings as any)

    const { GET } = await import('@/app/api/settings/public/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('whatsappNumber')
    expect(body).toHaveProperty('mpPublicKey')
    expect(body).not.toHaveProperty('mpAccessToken')
    expect(body).not.toHaveProperty('mpWebhookSecret')
  })

  it('sem settings (fallback para defaults) → 200', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue(null)

    const { GET } = await import('@/app/api/settings/public/route')
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

// ─── POST /api/cart/check-availability ───────────────────────────────────────

describe('09 – Rotas públicas: POST /api/cart/check-availability', () => {
  const validItems = [{
    cartItemId: 'cart-1',
    courtId: 'court-1',
    date: '2030-06-01',
    startTime: '09:00',
    endTime: '10:00',
  }]

  it('body inválido → 400', async () => {
    const { POST } = await import('@/app/api/cart/check-availability/route')
    const res = await POST(jsonReq('/api/cart/check-availability', 'POST', { items: 'errado' }))
    expect(res.status).toBe(400)
  })

  it('slot disponível → 200 com unavailable vazio', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(null)

    const { POST } = await import('@/app/api/cart/check-availability/route')
    const res = await POST(jsonReq('/api/cart/check-availability', 'POST', { items: validItems }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unavailable).toEqual([])
  })

  it('slot já ocupado → 200 com cartItemId no unavailable', async () => {
    const { prisma } = await import('@/infrastructure/database/prisma')
    vi.mocked(prisma.booking.findFirst).mockResolvedValue({ id: 'booking-x' } as any)

    const { POST } = await import('@/app/api/cart/check-availability/route')
    const res = await POST(jsonReq('/api/cart/check-availability', 'POST', { items: validItems }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unavailable).toContain('cart-1')
  })
})
