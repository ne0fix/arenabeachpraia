import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'
import { HorariosClient } from './HorariosClient'

export const dynamic = 'force-dynamic'

export default async function HorariosPage() {
  const session = await auth()
  if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }

  const repo = new PrismaCourtRepository()
  const courts = await repo.findAll({ isActive: null })

  return <HorariosClient initialCourts={courts} />
}
