import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Admin user
  const adminHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arenabeach.com.br' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@arenabeach.com.br',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  // Manager user
  const managerHash = await bcrypt.hash('manager123', 12)
  await prisma.user.upsert({
    where: { email: 'gerente@arenabeach.com.br' },
    update: {},
    create: {
      name: 'Gerente Arena',
      email: 'gerente@arenabeach.com.br',
      passwordHash: managerHash,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  })

  // Client user (para testes)
  const clientHash = await bcrypt.hash('cliente123', 12)
  const client = await prisma.user.upsert({
    where: { email: 'joao@email.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '(11) 99999-9999',
      passwordHash: clientHash,
      role: 'CLIENT',
      status: 'ACTIVE',
    },
  })

  // Quadras
  const quadra1 = await prisma.court.upsert({
    where: { id: 'court-1' },
    update: {},
    create: {
      id: 'court-1',
      name: 'Quadra 01',
      description: 'Quadra de vôlei e futevôlei com areia de qualidade superior, iluminação profissional para jogos noturnos e rede regulamentada.',
      pricePerHour: 80,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOMbajaKEzzrxV28ZQlnYpqi1-q5uZEAYjG7P-6lnIFty02dnxfFG7K1CNF5a9y5dn19VsPKtA5EbncUoEGrWhaU6nAr5IWQn-Ng0F-MjcMibVXTXz75CdY7Rri_PWOo8MmV-ZU_wlqBXGERm-siDAcEJGUBP4b4RI_J0OJkxSJen_JgbRRN6g39NPKrP3RKrYVJtIADYEeCDrP4BaeoEqkvaJOzrTYN2xB-F3SWAX09TTSBsC51gw_pc0SJecmiVRN72wUYyF9A',
      type: 'REGULAR',
      amenities: ['Ducha', 'Iluminação Profissional', 'Vestiário'],
      maxPlayers: 12,
      location: 'Arena Central',
      isActive: true,
      openTime: '06:00',
      closeTime: '22:00',
      slotDuration: 60,
    },
  })

  const quadra2 = await prisma.court.upsert({
    where: { id: 'court-2' },
    update: {},
    create: {
      id: 'court-2',
      name: 'Quadra 02',
      description: 'Quadra oficial de beach tennis com marcações precisas, redes de competição e kit de raquetes disponível para locação.',
      pricePerHour: 95,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqG-8IeFClXWUjwZPiIQhXlAW4SjkcIXNTdl3E7PKrzexHEEdSaLA9pDiYpPIGh83VrgjuAHoEAZw0elTfLz2fcJFNWM_oE0yktXMewyC_yaD6l15Ov_P9tJkZkRI6t1qqQa7LVqlLSJWhvfnLmXHEq0YbaVUVvrly9XQT9tL1nnAtG6zAfIajXbcdn6PnSZlNaEcYBl_rmPg20kqvuY-yUaM13sy00xr-NI4uiiXrJQQLDJ8mwgOClIB339TI2hBW__-T4Y35gA',
      type: 'REGULAR',
      amenities: ['Kit Raquetes', 'Bolas Incluídas', 'Rede de Competição'],
      maxPlayers: 4,
      location: 'Setor Sul',
      isActive: true,
      openTime: '06:00',
      closeTime: '22:00',
      slotDuration: 60,
    },
  })

  await prisma.court.upsert({
    where: { id: 'court-3' },
    update: {
      imageUrl: '/images/laje-bs-v2.jpg',
    },
    create: {
      id: 'court-3',
      name: 'Laje BS',
      description: 'Espaço exclusivo no rooftop com vista panorâmica para a cidade, ideal para eventos, confraternizações e festas privadas.',
      pricePerHour: 0,
      imageUrl: '/images/laje-bs-v2.jpg',
      type: 'EXCLUSIVE',
      amenities: ['Open Bar Opcional', 'Som Ambiente', 'Vista Panorâmica', 'Churrasqueira'],
      maxPlayers: 50,
      location: 'Rooftop',
      isActive: true,
      openTime: '10:00',
      closeTime: '23:00',
      slotDuration: 120,
    },
  })

  // Agendamentos de exemplo
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingBooking1 = await prisma.booking.findFirst({
    where: { accessCode: 'AB-1234-DEMO01' },
  })

  if (!existingBooking1) {
    const booking1 = await prisma.booking.create({
      data: {
        userId: client.id,
        courtId: quadra1.id,
        date: today,
        startTime: '08:00',
        endTime: '09:00',
        durationHours: 1,
        totalValue: 80,
        status: 'CONFIRMED',
        accessCode: 'AB-1234-DEMO01',
      },
    })

    await prisma.payment.create({
      data: {
        bookingId: booking1.id,
        method: 'PIX',
        status: 'APPROVED',
        amount: 80,
        paidAt: new Date(),
      },
    })
  }

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const existingBooking2 = await prisma.booking.findFirst({
    where: { accessCode: 'AB-5678-DEMO02' },
  })

  if (!existingBooking2) {
    const booking2 = await prisma.booking.create({
      data: {
        userId: client.id,
        courtId: quadra2.id,
        date: tomorrow,
        startTime: '10:00',
        endTime: '11:00',
        durationHours: 1,
        totalValue: 95,
        status: 'CONFIRMED',
        accessCode: 'AB-5678-DEMO02',
      },
    })

    await prisma.payment.create({
      data: {
        bookingId: booking2.id,
        method: 'CREDIT_CARD',
        status: 'APPROVED',
        amount: 95,
        cardLastFour: '4242',
        cardBrand: 'Visa',
        paidAt: new Date(),
      },
    })
  }

  console.log('✅ Seed concluído!')
  console.log('')
  console.log('Usuários criados:')
  console.log('  👑 Admin:   admin@arenabeach.com.br / admin123')
  console.log('  👔 Gerente: gerente@arenabeach.com.br / manager123')
  console.log('  👤 Cliente: joao@email.com / cliente123')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
