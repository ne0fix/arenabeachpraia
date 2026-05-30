import type { Booking, BookingWithDetails, BookingStatus, AdminOrder } from '@/models/entities/Booking'

export interface ListBookingsFilter {
  userId?: string
  courtId?: string
  status?: BookingStatus
  date?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface IBookingRepository {
  findById(id: string): Promise<BookingWithDetails | null>
  findAll(filter: ListBookingsFilter): Promise<{ bookings: BookingWithDetails[]; total: number }>
  findOrdersForAdmin(filter: ListBookingsFilter): Promise<{ orders: AdminOrder[]; total: number }>
  findByUser(userId: string, filter?: ListBookingsFilter): Promise<{ bookings: BookingWithDetails[]; total: number }>
  checkAvailability(courtId: string, date: string, startTime: string, endTime: string): Promise<boolean>
  create(data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking>
  update(id: string, data: Partial<Booking>): Promise<Booking>
}
