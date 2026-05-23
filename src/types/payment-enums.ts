export const PaymentStatus = {
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIAL_REFUND: 'PARTIAL_REFUND',
  EXPIRED: 'EXPIRED',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const PaymentMethod = {
  PIX: 'PIX',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
} as const

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]
