'use client'

import { useState } from 'react'
import { Modal } from '@/views/components/ui/Modal'
import { Button } from '@/views/components/ui/Button'
import { useCancelBookingViewModel } from '@/viewmodels/admin/useCancelBookingViewModel'
import { formatCurrency } from '@/core/utils/formatCurrency'
import type { BookingWithDetails } from '@/models/entities/Booking'

interface CancellationModalProps {
  booking: BookingWithDetails
  open: boolean
  onClose: () => void
}

export function CancellationModal({ booking, open, onClose }: CancellationModalProps) {
  const vm = useCancelBookingViewModel(booking.id, onClose)
  const canRefund = booking.payment?.status === 'APPROVED'

  return (
    <Modal open={open} onClose={onClose} title="Cancelar Agendamento">
      <div className="space-y-5">
        <div className="bg-surface-container rounded-xl p-4">
          <p className="font-headline text-sm text-on-surface font-bold">{booking.court.name}</p>
          <p className="font-headline text-xs text-on-surface-variant">
            {new Date(String(booking.date).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR')} às {booking.startTime}
          </p>
          <p className="font-headline text-sm text-primary font-bold mt-1">
            {formatCurrency(booking.totalValue)}
          </p>
        </div>

        <div>
          <label className="block font-headline text-[10px] text-on-surface-variant font-bold uppercase mb-2">
            Motivo do cancelamento *
          </label>
          <textarea
            value={vm.reason}
            onChange={(e) => vm.setReason(e.target.value)}
            placeholder="Descreva o motivo..."
            rows={3}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 font-sans text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {canRefund && (
          <div className="flex items-center gap-3 p-4 bg-surface-container rounded-xl">
            <input
              type="checkbox"
              id="refund-check"
              checked={vm.refund}
              onChange={(e) => vm.setRefund(e.target.checked)}
              className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="refund-check" className="flex-1">
              <span className="font-headline text-sm text-on-surface font-bold block">
                Processar estorno
              </span>
              <span className="font-headline text-xs text-on-surface-variant">
                Estornar {formatCurrency(booking.payment!.amount)} para o cliente
              </span>
            </label>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Voltar
          </Button>
          <Button
            variant={vm.refund ? 'primary' : 'danger'}
            className="flex-1"
            onClick={() => vm.cancel()}
            isLoading={vm.isPending}
          >
            {vm.refund ? 'Cancelar + Estornar' : 'Cancelar Reserva'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
