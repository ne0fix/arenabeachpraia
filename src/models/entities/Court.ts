export type CourtType = 'REGULAR' | 'EXCLUSIVE'

export interface Court {
  id: string
  name: string
  description: string
  pricePerHour: number
  imageUrl: string | null
  images: string[]
  type: CourtType
  amenities: string[]
  maxPlayers: number
  showCapacity: boolean
  courtWhatsapp: string
  location: string
  isActive: boolean
  openTime: string
  closeTime: string
  slotDuration: number
  morningOpen: string
  morningClose: string
  morningEnabled: boolean
  afternoonOpen: string
  afternoonClose: string
  afternoonEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface DayAvailability {
  date: string
  slots: TimeSlot[]
}
