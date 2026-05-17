import type { Court, DayAvailability } from '@/models/entities/Court'

export interface ICourtRepository {
  findAll(filters?: { isActive?: boolean | null; type?: string }): Promise<Court[]>
  findById(id: string): Promise<Court | null>
  getAvailability(courtId: string, date: string): Promise<DayAvailability>
  create(data: Omit<Court, 'id' | 'createdAt' | 'updatedAt'>): Promise<Court>
  update(id: string, data: Partial<Court>): Promise<Court>
  delete(id: string): Promise<void>
}
