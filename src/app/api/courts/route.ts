import { NextResponse } from 'next/server'
import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'

const repo = new PrismaCourtRepository()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? undefined
    const courts = await repo.findAll({ isActive: true, type })
    return NextResponse.json(courts, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
