'use client'

import { Modal } from '@/views/components/ui/Modal'
import { Button } from '@/views/components/ui/Button'
import { useRefundViewModel } from '@/viewmodels/admin/useRefundViewModel'
import { formatCurrency } from '@/core/utils/formatCurrency'
import { AlertCircle } from 'lucide-react'

interface RefundModalProps {
  bookingId: string
  maxAmount: number
  open: boolean
  onClose: () => void
}

export function RefundModal({ bookingId, maxAmount, open, onClose }: RefundModalProps) {
  const vm = useRefundViewModel(bookingId, maxAmount, onClose)

  return (
    <Modal open={open} onClose={onClose} title="Processar Estorno">
      <div className="space-y-4">
        {/* Aviso */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-headline text-xs text-amber-800 font-bold">Ação irreversível</p>
            <p className="font-headline text-xs text-amber-700 mt-0.5">
              O valor será devolvido ao cliente via MercadoPago e a reserva voltará para <strong>Pendente</strong>.
            </p>
          </div>
        </div>

        {/* Tipo */}
        <div>
          <p className="font-headline text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2">Tipo de Estorno</p>
          <div className="flex gap-2">
            <button
              onClick={() => vm.setIsPartial(false)}
              className={`flex-1 py-2.5 px-3 rounded-xl border font-headline text-xs font-bold transition-all ${!vm.isPartial ? 'bg-primary text-white border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'}`}
            >
              Total · {formatCurrency(maxAmount)}
            </button>
            <button
              onClick={() => vm.setIsPartial(true)}
              className={`flex-1 py-2.5 px-3 rounded-xl border font-headline text-xs font-bold transition-all ${vm.isPartial ? 'bg-primary text-white border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'}`}
            >
              Parcial
            </button>
          </div>
        </div>

        {/* Valor parcial */}
        {vm.isPartial && (
          <div>
            <label className="block font-headline text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1.5">
              Valor (máx. {formatCurrency(maxAmount)})
            </label>
            <input
              type="number"
              value={vm.amount}
              onChange={(e) => vm.setAmount(Number(e.target.value))}
              max={maxAmount}
              min={0.01}
              step={0.01}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 font-sans text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Motivo */}
        <div>
          <label className="block font-headline text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1.5">
            Motivo
          </label>
          <textarea
            value={vm.reason}
            onChange={(e) => vm.setReason(e.target.value)}
            rows={2}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 font-sans text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Erro */}
        {vm.errorMessage && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="font-headline text-xs text-red-700 font-medium">{vm.errorMessage}</p>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={vm.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => vm.refund()}
            isLoading={vm.isPending}
          >
            Confirmar Estorno
          </Button>
        </div>
      </div>
    </Modal>
  )
}
