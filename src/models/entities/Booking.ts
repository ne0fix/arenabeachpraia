export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED'

export interface Booking {
  id: string
  userId: string
  courtId: string
  date: Date
  startTime: string
  endTime: string
  durationHours: number
  totalValue: number
  status: BookingStatus
  accessCode: string
  orderId: string | null
  sport: string | null
  notes: string | null
  cancelledAt: Date | null
  cancelReason: string | null
  cancelledBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface BookingWithDetails extends Booking {
  court: {
    id: string
    name: string
    imageUrl: string | null
    images: string[]
    location: string
  }
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  payment: {
    id: string
    method: string
    status: string
    amount: number
    gatewayId: string | null
    paidAt: Date | null
    refundedAt: Date | null
    refundAmount: number | null
  } | null
}

// Pedido agrupado: um checkout (orderId) com um ou mais horários (bookings).
export interface AdminOrder {
  orderId: string
  accessCode: string
  createdAt: Date
  user: { id: string; name: string; email: string; phone: string | null }
  bookings: BookingWithDetails[]
  courtNames: string[]
  totalValue: number
  paymentMethod: string | null
  paymentStatus: string | null
  gatewayId: string | null
  // Status agregado do pedido (ver regra de derivação no repositório)
  status: BookingStatus
}
