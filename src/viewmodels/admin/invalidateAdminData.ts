import type { QueryClient } from '@tanstack/react-query'

// Invalida todas as queries do painel que dependem de bookings/pagamentos.
// Usado após cancelar/estornar para refletir o novo estado em Agendamentos,
// Dashboard, Central de Transações e Relatórios sem recarregar a página.
// invalidateQueries faz match por prefixo, então cobre as variações com filtros/datas.
export function invalidateAdminData(qc: QueryClient, bookingId?: string) {
  const keys = [
    ['admin-bookings'],
    ['admin-stats'],
    ['admin-payments'],
    ['admin-reports'],
    ['financeiro-summary'],
    ['financeiro-by-period'],
    ['financeiro-by-method'],
    ['financeiro-transactions'],
  ]
  for (const key of keys) qc.invalidateQueries({ queryKey: key })
  if (bookingId) qc.invalidateQueries({ queryKey: ['booking', bookingId] })
}
