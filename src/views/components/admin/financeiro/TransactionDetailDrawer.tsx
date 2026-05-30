import { Transaction } from "@/types/financeiro";
import { X, Calendar, User, CreditCard, ExternalLink, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/core/utils/formatCurrency";
import { Badge } from "@/views/components/ui/Badge";
import { PaymentStatus, PaymentMethod } from "@/types/payment-enums";
import { cn } from "@/core/utils/helpers";
import Link from "next/link";

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  onRefund: (paymentId: string) => void;
}

export function TransactionDetailDrawer({
  transaction,
  open,
  onClose,
  onRefund,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const statusConfig: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    [PaymentStatus.APPROVED]: { label: "Aprovado", variant: "success" },
    [PaymentStatus.PROCESSING]: { label: "Em Análise", variant: "info" },
    [PaymentStatus.PENDING]: { label: "Pendente", variant: "warning" },
    [PaymentStatus.REJECTED]: { label: "Recusado", variant: "danger" },
    [PaymentStatus.CANCELLED]: { label: "Cancelado", variant: "default" },
    [PaymentStatus.REFUNDED]: { label: "Reembolsado", variant: "default" },
    [PaymentStatus.PARTIAL_REFUND]: { label: "Reembolso Parcial", variant: "warning" },
    [PaymentStatus.EXPIRED]: { label: "Expirado", variant: "default" },
  };

  const config = statusConfig[transaction.status];

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-end transition-opacity duration-300",
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div
        className={cn(
          "relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
          <div>
            <h2 className="font-headline font-black text-lg text-on-surface">Detalhes da Transação</h2>
            <p className="text-xs font-mono text-on-surface-variant">#{transaction.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container text-on-surface-variant rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Status and Amount */}
          <div className="bg-surface-container-low/50 rounded-2xl p-6 text-center border border-outline-variant/20">
            <Badge variant={config.variant} className="mb-3">{config.label}</Badge>
            <div className="font-headline font-black text-3xl text-on-surface">
              {formatCurrency(transaction.amount)}
            </div>
            {transaction.refundAmount && (
              <div className="text-sm text-red-600 font-bold mt-1">
                Estornado: {formatCurrency(transaction.refundAmount)}
              </div>
            )}
          </div>

          {/* Payment Info */}
          <section>
            <h3 className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
              <CreditCard size={14} /> Pagamento
            </h3>
            <div className="space-y-4">
              <DetailItem label="Método" value={transaction.method === PaymentMethod.PIX ? "PIX" : transaction.method === PaymentMethod.CREDIT_CARD ? "Cartão de Crédito" : "Cartão de Débito"} />
              <DetailItem label="Gateway ID" value={transaction.gatewayId || "-"} />
              <DetailItem label="Criado em" value={format(new Date(transaction.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              {transaction.paidAt && (
                <DetailItem label="Pago em" value={format(new Date(transaction.paidAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              )}
              {transaction.cardBrand && (
                <DetailItem label="Cartão" value={`${transaction.cardBrand.toUpperCase()} •••• ${transaction.cardLastFour}`} />
              )}
            </div>
          </section>

          {/* Client Info */}
          <section>
            <h3 className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
              <User size={14} /> Cliente
            </h3>
            <div className="space-y-4">
              <DetailItem label="Nome" value={transaction.booking.user.name} />
              <DetailItem label="E-mail" value={transaction.booking.user.email} />
              <DetailItem label="Telefone" value={transaction.booking.user.phone || "-"} />
            </div>
          </section>

          {/* Booking Info */}
          <section>
            <h3 className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
              <Calendar size={14} /> {transaction.itemCount && transaction.itemCount > 1 ? `Pedido · ${transaction.itemCount} horários` : 'Agendamento'}
            </h3>
            {transaction.bookings && transaction.bookings.length > 1 ? (
              <div className="space-y-2">
                {transaction.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 bg-surface-container-low/40 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{b.court.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {format(new Date(String(b.date).slice(0, 10) + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} • {b.startTime}–{b.endTime}
                      </p>
                    </div>
                    <span className="text-sm font-black text-on-surface whitespace-nowrap">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <DetailItem label="Quadra" value={transaction.booking.court.name} />
                <DetailItem
                  label="Horário"
                  value={`${format(new Date(String(transaction.booking.date).slice(0, 10) + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} • ${transaction.booking.startTime} às ${transaction.booking.endTime}`}
                />
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/30 bg-surface-container-low/30 space-y-3">
          <Link
            href={`/admin/bookings/${transaction.booking.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-on-primary font-headline font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-primary-container transition-colors"
          >
            <ExternalLink size={16} />
            Ver Agendamento
          </Link>
          
          {transaction.status === PaymentStatus.APPROVED && (
            <button
              onClick={() => onRefund(transaction.id)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-700 border border-red-200 font-headline font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-red-100 transition-colors"
            >
              <RefreshCcw size={16} />
              Processar Reembolso
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-on-surface-variant font-medium">{label}</span>
      <span className="text-on-surface font-bold">{value}</span>
    </div>
  );
}
