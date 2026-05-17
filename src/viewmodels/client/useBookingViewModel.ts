'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import type { Court, DayAvailability, TimeSlot } from '@/models/entities/Court'

interface SlotGroup {
  label: string
  color: string
  slots: TimeSlot[]
}

export function useBookingViewModel(courtId: string) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const days = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i))

  const { data: court, isLoading: loadingCourt } = useQuery<Court>({
    queryKey: ['court', courtId],
    queryFn: () => fetch(`/api/courts/${courtId}`).then((r) => r.json()),
  })

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const { data: availability, isLoading: loadingSlots } = useQuery<DayAvailability>({
    queryKey: ['availability', courtId, dateStr],
    queryFn: () =>
      fetch(`/api/courts/${courtId}/availability?date=${dateStr}`).then((r) => r.json()),
    enabled: !!courtId,
  })

  const slotGroups = useMemo<SlotGroup[]>(() => {
    const slots = availability?.slots ?? []
    if (!slots.length) return []

    const toMin = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
    const noon = 12 * 60

    const morning = slots.filter((s) => toMin(s.time) < noon)
    const afternoon = slots.filter((s) => toMin(s.time) >= noon)

    const groups: SlotGroup[] = []
    if (morning.length > 0) groups.push({ label: 'Manhã', color: 'bg-amber-400', slots: morning })
    if (afternoon.length > 0) groups.push({ label: 'Tarde', color: 'bg-orange-500', slots: afternoon })
    return groups
  }, [availability])

  const handleDateChange = (day: Date) => {
    setSelectedDate(day)
    setSelectedSlot(null)
  }

  const handleSlotSelect = (time: string) => setSelectedSlot(time)

  const proceed = () => {
    if (!selectedSlot) return
    router.push(
      `/payment?courtId=${courtId}&date=${dateStr}&startTime=${selectedSlot}`
    )
  }

  return {
    court,
    days,
    selectedDate,
    selectedSlot,
    availability,
    slotGroups,
    loadingCourt,
    loadingSlots,
    handleDateChange,
    handleSlotSelect,
    proceed,
    goBack: () => router.back(),
  }
}
