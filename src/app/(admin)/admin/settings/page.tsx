import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'
import { prisma } from '@/infrastructure/database/prisma'
import { SettingsTabs } from './SettingsTabs'

export const revalidate = 0

export default async function SettingsPage() {
  const [courts, contactSettings] = await Promise.all([
    new PrismaCourtRepository().findAll({ isActive: undefined }),
    prisma.siteSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null),
  ])

  return <SettingsTabs initialCourts={courts} contactSettings={contactSettings} />
}
