'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/views/providers/SocketProvider'
import { invalidateAdminData } from '@/viewmodels/admin/invalidateAdminData'

// Sincroniza o painel em tempo real: ao receber eventos de mudança de dados
// (cancelamento, estorno, novo agendamento) invalida as queries do admin,
// atualizando Agendamentos, Dashboard, Financeiro e Relatórios sem recarregar.
export function AdminDataSync() {
  const qc = useQueryClient()
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return
    const handler = () => invalidateAdminData(qc)
    socket.on('data:changed', handler)
    socket.on('booking:new', handler)
    return () => {
      socket.off('data:changed', handler)
      socket.off('booking:new', handler)
    }
  }, [socket, qc])

  return null
}
