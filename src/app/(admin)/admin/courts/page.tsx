import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'
import { AdminCourtsClient } from './AdminCourtsClient'

export const revalidate = 0

export default async function AdminCourtsPage() {
  const repo = new PrismaCourtRepository()
  const courts = await repo.findAll({ isActive: null })
  return <AdminCourtsClient initialCourts={courts} />
}
