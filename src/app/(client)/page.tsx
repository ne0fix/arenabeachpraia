import { PrismaCourtRepository } from '@/infrastructure/repositories/PrismaCourtRepository'
import { CourtsLive } from '@/views/components/business/CourtsLive'
import type { Court } from '@/models/entities/Court'

export const dynamic = 'force-dynamic'

async function getCourts(): Promise<Court[]> {
  try {
    const repo = new PrismaCourtRepository()
    return repo.findAll({ isActive: true })
  } catch {
    return []
  }
}

export default async function HomePage() {
  const courts = await getCourts()

  return (
    <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 pb-24 md:pb-12 space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-1">
        <span className="font-headline text-[10px] md:text-xs text-primary uppercase tracking-widest font-bold">
          Escolha seu espaço
        </span>
        <h2 className="font-headline text-2xl md:text-4xl text-on-surface font-extrabold tracking-tight">
          Quadras Disponíveis
        </h2>
      </div>

      <CourtsLive initialCourts={courts} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-lg md:text-xl text-on-surface font-bold">Resumo da Agenda</h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full uppercase">Hoje</span>
        </div>
        <div className="bg-surface-container rounded-3xl p-4 md:p-6 overflow-hidden sun-shadow border border-outline-variant/20">
          <div className="flex gap-4 overflow-x-auto pb-4 court-scrollbar snap-x">
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
              <div key={h} className="flex flex-col items-center gap-2 min-w-[50px] md:min-w-[60px] snap-center">
                <div
                  className="w-full rounded-t-xl bg-primary/20 relative overflow-hidden"
                  style={{ height: `${Math.floor(Math.random() * 60 + 40)}px` }}
                >
                  <div 
                    className="absolute bottom-0 w-full bg-primary/40 transition-all duration-1000"
                    style={{ height: `${Math.floor(Math.random() * 100)}%` }}
                  />
                </div>
                <span className="font-headline text-[9px] md:text-[10px] text-on-surface-variant font-bold">
                  {h.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
