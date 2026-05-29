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
