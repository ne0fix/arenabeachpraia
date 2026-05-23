import { Transaction, TransactionFilters } from "@/types/financeiro";
import { PaymentStatus, PaymentMethod } from "@/types/payment-enums";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/core/utils/formatCurrency";
import { Badge } from "@/views/components/ui/Badge";
import { Zap, CreditCard, ChevronLeft, ChevronRight, Eye, RefreshCcw } from "lucide-react";
import { cn } from "@/core/utils/helpers";

interface TransactionTableProps {
  transactions: Transaction[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  loading: boolean;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: Partial<TransactionFilters>) => void;
  onSelect: (transaction: Transaction) => void;
  onRefund: (paymentId: string) => void;
  currentStatus?: string;
}

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

const methodIcons: Record<PaymentMethod, React.ComponentType<{ size?: number | string }>> = {
  [PaymentMethod.PIX]: Zap,
  [PaymentMethod.CREDIT_CARD]: CreditCard,
  [PaymentMethod.DEBIT_CARD]: CreditCard,
};

export function TransactionTable({
  transactions,
  pagination,
  loading,
  onPageChange,
  onFilterChange,
  onSelect,
  onRefund,
  currentStatus,
}: TransactionTableProps) {
  const tabs = [
    { label: "Todas", value: "" },
    { label: "Aprovadas", value: PaymentStatus.APPROVED },
    { label: "Em Análise", value: PaymentStatus.PROCESSING },
    { label: "Recusadas", value: PaymentStatus.REJECTED },
    { label: "Reembolsadas", value: PaymentStatus.REFUNDED },
  ];

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-outline-variant/30 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange({ status: tab.value ? [tab.value as PaymentStatus] : undefined, page: 1 })}
            className={cn(
              "px-4 py-4 text-xs font-headline font-bold uppercase tracking-widest border-b-2 transition-colors",
              (currentStatus === tab.value || (!currentStatus && !tab.value))
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">ID</th>
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Data/Hora</th>
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Quadra</th>
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Método</th>
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Valor</th>
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
              <th className="px-6 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-surface-container rounded" /></td>
                  ))}
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant font-medium">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const MethodIcon = methodIcons[t.method];
                const config = statusConfig[t.status];

                return (
                  <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-6 py-4 text-xs font-mono text-on-surface-variant">#{t.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-xs text-on-surface font-medium">
                      {format(new Date(t.paidAt || t.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-on-surface">{t.booking.user.name}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{t.booking.court.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <MethodIcon size={14} />
                        <span className="text-xs font-bold uppercase tracking-tighter">
                          {t.method === PaymentMethod.PIX ? "PIX" : t.method === PaymentMethod.CREDIT_CARD ? "Crédito" : "Débito"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-on-surface">{formatCurrency(t.amount)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onSelect(t)}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                        {t.status === PaymentStatus.APPROVED && (
                          <button 
                            onClick={() => onRefund(t.id)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Reembolsar"
                          >
                            <RefreshCcw size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant/30">
        <div className="text-xs text-on-surface-variant font-medium">
          Mostrando {transactions.length} de {pagination.total} transações
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={pagination.page === 1 || loading}
            onClick={() => onPageChange(pagination.page - 1)}
            className="p-2 hover:bg-surface-container text-on-surface disabled:opacity-50 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-xs font-bold text-on-surface">
            Página {pagination.page} de {pagination.totalPages}
          </div>
          <button
            disabled={pagination.page === pagination.totalPages || loading}
            onClick={() => onPageChange(pagination.page + 1)}
            className="p-2 hover:bg-surface-container text-on-surface disabled:opacity-50 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
