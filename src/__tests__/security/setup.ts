import { vi } from 'vitest'

vi.mock('@/lib/socket-server', () => ({
  emitToAll: vi.fn(),
  emitToRoom: vi.fn(),
  getIO: vi.fn(() => null),
}))

vi.mock('@/services/MercadoPagoService', () => ({
  MercadoPagoService: {
    create: vi.fn(() =>
      Promise.resolve({
        createPixPayment: vi.fn(),
        createCardPayment: vi.fn(),
        getPayment: vi.fn(),
        createRefund: vi.fn(),
      })
    ),
  },
}))
