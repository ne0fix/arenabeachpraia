'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/views/providers/SocketProvider'
import { invalidateAdminData } from '@/viewmodels/admin/invalidateAdminData'

const POLLING_INTERVAL_MS = 30_000 // fallback quando WebSocket não está disponível

// Sincroniza o painel em tempo real via WebSocket (quando disponível) ou
// polling a cada 30s (fallback para Vercel/ambientes serverless).
export function AdminDataSync() {
  const qc = useQueryClient()
  const { socket } = useSocket()
  const wsConnected = useRef(false)

  // WebSocket: atualização instantânea
  useEffect(() => {
    if (!socket) return
    const handler = () => invalidateAdminData(qc)

    socket.on('data:changed', handler)
    socket.on('booking:new', handler)
    socket.on('connect', () => { wsConnected.current = true })
    socket.on('disconnect', () => { wsConnected.current = false })

    return () => {
      socket.off('data:changed', handler)
      socket.off('booking:new', handler)
    }
  }, [socket, qc])

  // Polling de fallback: garante atualização mesmo sem WebSocket (Vercel)
  useEffect(() => {
    const id = setInterval(() => {
      if (!wsConnected.current) {
        invalidateAdminData(qc)
      }
    }, POLLING_INTERVAL_MS)
    return () => clearInterval(id)
  }, [qc])

  return null
}
