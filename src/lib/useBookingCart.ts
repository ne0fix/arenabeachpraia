'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CartItem {
  id: string
  courtId: string
  courtName: string
  date: string       // yyyy-MM-dd
  startTime: string
  endTime: string
  totalAmount: number
  durationHours: number
}

const CART_KEY = 'booking_cart'
const CART_EVENT = 'booking_cart_updated'

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(items: CartItem[]) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CART_EVENT))
}

export function useBookingCart() {
  const [items, setItems] = useState<CartItem[]>(readCart)

  useEffect(() => {
    // Lê o estado inicial no cliente (evita hydration mismatch)
    setItems(readCart())

    const sync = () => setItems(readCart())
    window.addEventListener(CART_EVENT, sync)
    return () => window.removeEventListener(CART_EVENT, sync)
  }, [])

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    const current = readCart()
    const next = [...current, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }]
    persist(next)
    setItems(next)
  }, [])

  const removeItem = useCallback((id: string) => {
    const next = readCart().filter((i) => i.id !== id)
    persist(next)
    setItems(next)
  }, [])

  // Remove pelo conteúdo da reserva (usado após confirmar pagamento)
  const removeByBooking = useCallback((courtId: string, date: string, startTime: string) => {
    const next = readCart().filter(
      (i) => !(i.courtId === courtId && i.date === date && i.startTime === startTime)
    )
    persist(next)
    setItems(next)
  }, [])

  const clearCart = useCallback(() => {
    persist([])
    setItems([])
  }, [])

  const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0)

  return { items, addItem, removeItem, removeByBooking, clearCart, totalCount: items.length, totalAmount }
}
