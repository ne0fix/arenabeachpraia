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

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

function toMin(t: string) {
  return parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1])
}

export function useBookingViewModel(courtId: string) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [slotError, setSlotError] = useState('')

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
  const selectedStartTime = selectedSlots[0] ?? null
  const selectedEndTime = selectedSlots.length > 0
    ? addMinutesToTime(selectedSlots[selectedSlots.length - 1], slotDuration)
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
    const allTimes = allSlots.map((s) => s.time)
    const thisIdx = allTimes.indexOf(time)

    // Click on already selected slot → deselect it and everything after
    const existingIdx = selectedSlots.indexOf(time)
    if (existingIdx !== -1) {
      setSelectedSlots(selectedSlots.slice(0, existingIdx))
      setSlotError('')
      return
    }

    // Empty selection → start fresh
    if (selectedSlots.length === 0) {
      setSelectedSlots([time])
      setSlotError('')
      return
    }

    const firstSelected = selectedSlots[0]
    const lastSelected = selectedSlots[selectedSlots.length - 1]
    const firstIdx = allTimes.indexOf(firstSelected)
    const lastIdx = allTimes.indexOf(lastSelected)

    if (thisIdx > lastIdx) {
      // Extending the end
      const slotsInRange = allSlots.slice(lastIdx + 1, thisIdx + 1)
      const blocked = slotsInRange.find((s) => !s.available)
      if (blocked) {
        setSlotError(`O horário ${blocked.time} não está disponível. Sua reserva pode ir até ${lastSelected}.`)
        return
      }
      setSelectedSlots([...selectedSlots, ...slotsInRange.map((s) => s.time)])
      setSlotError('')
    } else if (thisIdx < firstIdx) {
      // Extending the start
      const slotsInRange = allSlots.slice(thisIdx, firstIdx)
      const blocked = slotsInRange.find((s) => !s.available)
      if (blocked) {
        setSlotError(`O horário ${blocked.time} não está disponível. Selecione a partir de ${firstSelected}.`)
        return
      }
      setSelectedSlots([...slotsInRange.map((s) => s.time), ...selectedSlots])
      setSlotError('')
    } else {
      // Non-adjacent, non-selected → start fresh
      setSelectedSlots([time])
      setSlotError('')
    }
  }

  const proceed = () => {
    if (!selectedStartTime || !selectedEndTime) return
    router.push(
      `/payment?courtId=${courtId}&date=${dateStr}&startTime=${selectedStartTime}&endTime=${selectedEndTime}`
    )
  }

  return {
    court,
    days,
    selectedDate,
    selectedSlots,
    selectedStartTime,
    selectedEndTime,
    selectedDurationHours,
    selectedTotal,
    slotError,
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
