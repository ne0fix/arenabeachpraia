'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import type { Court, DayAvailability, TimeSlot } from '@/models/entities/Court'
import { useBookingCart } from '@/lib/useBookingCart'

interface SlotGroup {
  label: string
  color: string
  slots: TimeSlot[]
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

function toMin(t: string) {
  return parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
}

// Agrupa slots selecionados em blocos contíguos usando tempo real (não índice)
// Dois slots são contíguos se o próximo começa exatamente slotDuration minutos após o anterior
function findSelectionRuns(selected: string[], allTimes: string[], slotDuration: number): string[][] {
  if (selected.length === 0) return []
  const sorted = [...selected].sort((a, b) => allTimes.indexOf(a) - allTimes.indexOf(b))
  const runs: string[][] = []
  let current = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const expectedNext = addMinutesToTime(sorted[i - 1], slotDuration)
    if (sorted[i] === expectedNext) {
      current.push(sorted[i])
    } else {
      runs.push(current)
      current = [sorted[i]]
    }
  }
  runs.push(current)
  return runs
}

export function useBookingViewModel(courtId: string) {
  const router = useRouter()
  const cart = useBookingCart()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [slotError, setSlotError] = useState('')
  const [addedFeedback, setAddedFeedback] = useState(false)

  const days = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i))

  const { data: court, isLoading: loadingCourt } = useQuery<Court>({
    queryKey: ['court', courtId],
    queryFn: () => fetch(`/api/courts/${courtId}`).then((r) => r.json()),
  })

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: availability, isLoading: loadingSlots } = useQuery<DayAvailability>({
    queryKey: ['availability', courtId, dateStr],
    queryFn: () => fetch(`/api/courts/${courtId}/availability?date=${dateStr}`).then((r) => r.json()),
    enabled: !!courtId,
  })

  const slotGroups = useMemo<SlotGroup[]>(() => {
    const slots = availability?.slots ?? []
    if (!slots.length) return []
    const noon = 12 * 60
    const morning = slots.filter((s) => toMin(s.time) < noon)
    const afternoon = slots.filter((s) => toMin(s.time) >= noon)
    const groups: SlotGroup[] = []
    if (morning.length > 0) groups.push({ label: 'Manhã', color: 'bg-amber-400', slots: morning })
    if (afternoon.length > 0) groups.push({ label: 'Tarde', color: 'bg-orange-500', slots: afternoon })
    return groups
  }, [availability])

  // Computed values from selection
  const slotDuration = court?.slotDuration ?? 60
  const allTimes = useMemo(() => (availability?.slots ?? []).map((s) => s.time), [availability])

  const selectionRuns = useMemo(
    () => findSelectionRuns(selectedSlots, allTimes, slotDuration),
    [selectedSlots, allTimes, slotDuration]
  )
  const isNonContiguous = selectionRuns.length > 1

  // Cada bloco com startTime e endTime já calculados para exibição
  const selectionRunsWithEnd = useMemo(
    () => selectionRuns.map((run) => ({
      slots: run,
      startTime: run[0],
      endTime: addMinutesToTime(run[run.length - 1], slotDuration),
    })),
    [selectionRuns, slotDuration]
  )

  // Para exibição: primeiro slot do primeiro grupo, último slot do último grupo
  const sortedSelected = useMemo(
    () => [...selectedSlots].sort((a, b) => allTimes.indexOf(a) - allTimes.indexOf(b)),
    [selectedSlots, allTimes]
  )
  const selectedStartTime = sortedSelected[0] ?? null
  const selectedEndTime = sortedSelected.length > 0
    ? addMinutesToTime(sortedSelected[sortedSelected.length - 1], slotDuration)
    : null
  const selectedDurationHours = (selectedSlots.length * slotDuration) / 60
  const selectedTotal = Number(court?.pricePerHour ?? 0) * selectedDurationHours

  const handleDateChange = (day: Date) => {
    setSelectedDate(day)
    setSelectedSlots([])
    setSlotError('')
  }

  const handleSlotSelect = (time: string) => {
    const allSlots = availability?.slots ?? []
    const thisIdx = allTimes.indexOf(time)

    // Slot já selecionado → remove APENAS esse slot (não afeta os demais)
    if (selectedSlots.includes(time)) {
      setSelectedSlots(selectedSlots.filter((s) => s !== time))
      setSlotError('')
      return
    }

    // Seleção vazia → inicia com este slot
    if (selectedSlots.length === 0) {
      setSelectedSlots([time])
      setSlotError('')
      return
    }

    const selectedIdxs = sortedSelected.map((s) => allTimes.indexOf(s))
    const firstIdx = selectedIdxs[0]
    const lastIdx = selectedIdxs[selectedIdxs.length - 1]

    if (thisIdx > lastIdx) {
      // Expande para a direita a partir do último slot selecionado
      const slotsToAdd = allSlots.slice(lastIdx + 1, thisIdx + 1)
      const blocked = slotsToAdd.find((s) => !s.available)
      if (blocked) {
        setSlotError(`O horário ${blocked.time} não está disponível.`)
        return
      }
      setSelectedSlots([...selectedSlots, ...slotsToAdd.map((s) => s.time)])
      setSlotError('')
    } else if (thisIdx < firstIdx) {
      // Expande para a esquerda a partir do primeiro slot selecionado
      const slotsToAdd = allSlots.slice(thisIdx, firstIdx)
      const blocked = slotsToAdd.find((s) => !s.available)
      if (blocked) {
        setSlotError(`O horário ${blocked.time} não está disponível.`)
        return
      }
      setSelectedSlots([...slotsToAdd.map((s) => s.time), ...selectedSlots])
      setSlotError('')
    } else {
      // Clicou dentro do intervalo atual (preenchendo uma lacuna criada por desmarcação)
      const newSlots = [...selectedSlots, time].sort(
        (a, b) => allTimes.indexOf(a) - allTimes.indexOf(b)
      )
      setSelectedSlots(newSlots)
      setSlotError('')
    }
  }

  const addToCart = () => {
    if (selectedSlots.length === 0 || !court) return
    // Cada bloco contíguo vira um item separado no carrinho
    for (const run of selectionRuns) {
      const runStart = run[0]
      const runEnd = addMinutesToTime(run[run.length - 1], slotDuration)
      const durationHours = (run.length * slotDuration) / 60
      const totalAmount = Number(court.pricePerHour) * durationHours
      cart.addItem({ courtId, courtName: court.name, date: dateStr, startTime: runStart, endTime: runEnd, totalAmount, durationHours })
    }
    setSelectedSlots([])
    setSlotError('')
    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2500)
  }

  const goToCart = () => router.push('/cart')

  return {
    court,
    days,
    selectedDate,
    selectedSlots,
    selectedStartTime,
    selectedEndTime,
    selectedDurationHours,
    selectedTotal,
    selectionRuns,
    selectionRunsWithEnd,
    isNonContiguous,
    slotError,
    availability,
    slotGroups,
    loadingCourt,
    loadingSlots,
    handleDateChange,
    handleSlotSelect,
    addToCart,
    goToCart,
    addedFeedback,
    cartCount: cart.totalCount,
    cartTotal: cart.totalAmount,
    goBack: () => router.back(),
  }
}
