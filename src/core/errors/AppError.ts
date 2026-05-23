export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class BookingError extends AppError {
  constructor(code: string) {
    const messages: Record<string, string> = {
      COURT_NOT_FOUND: 'Quadra não encontrada ou inativa',
      SLOT_NOT_AVAILABLE: 'Horário não disponível. Escolha outro.',
      BOOKING_NOT_FOUND: 'Agendamento não encontrado',
      BOOKING_NOT_CANCELLABLE: 'Este agendamento não pode ser cancelado',
      UNAUTHORIZED: 'Sem permissão para esta ação',
    }
    super(code, messages[code] ?? code, code === 'UNAUTHORIZED' ? 403 : 400)
    this.name = 'BookingError'
  }
}

export class PaymentError extends AppError {
  constructor(code: string, detail?: string) {
    const messages: Record<string, string> = {
      PAYMENT_NOT_FOUND: 'Pagamento não encontrado',
      ALREADY_REFUNDED: 'Pagamento já estornado',
      NOT_APPROVED: 'Pagamento não aprovado. Não é possível estornar.',
      GATEWAY_ID_MISSING: 'ID do pagamento no gateway não encontrado',
      REFUND_GATEWAY_ERROR: detail ?? 'Erro ao processar estorno no MercadoPago. Tente novamente.',
      GATEWAY_ERROR: detail ?? 'Erro no gateway de pagamento',
    }
    super(code, messages[code] ?? code)
    this.name = 'PaymentError'
  }
}
