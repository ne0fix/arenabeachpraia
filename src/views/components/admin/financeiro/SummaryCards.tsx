import { StatsCard } from "../StatsCard";
import { FinanceiroSummary } from "@/types/financeiro";
import { formatCurrency } from "@/core/utils/formatCurrency";
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertCircle, Receipt, AlertTriangle } from "lucide-react";

interface SummaryCardsProps {
  data?: FinanceiroSummary;
  loading: boolean;
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const { revenue, transactions, comparison } = data;

  const formatDelta = (delta?: number) => {
    if (delta === undefined) return undefined;
    const value = Math.abs(delta).toFixed(1);
    return `${value}%`;
  };

  return (
    <>
      {revenue.pendingManualRefundCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-headline text-sm font-bold text-amber-800">
              {revenue.pendingManualRefundCount} pagamento(s) aguardando estorno manual — {formatCurrency(revenue.pendingManualRefund)}
            </p>
            <p className="font-headline text-xs text-amber-700 mt-0.5">
              Clientes pagaram após outro confirmar o mesmo horário. Estes valores NÃO são contados como receita. Processe o estorno na lista de transações abaixo.
            </p>
          </div>
        </div>
      )}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <StatsCard
        title="Receita Bruta"
        value={formatCurrency(revenue.gross)}
        delta={formatDelta(comparison?.grossRevenueDelta)}
        deltaPositive={(comparison?.grossRevenueDelta || 0) >= 0}
        icon={<DollarSign size={20} />}
        color="primary"
      />
      <StatsCard
        title="Receita Líquida"
        value={formatCurrency(revenue.net)}
        delta={formatDelta(comparison?.netRevenueDelta)}
        deltaPositive={(comparison?.netRevenueDelta || 0) >= 0}
        icon={<TrendingUp size={20} />}
        color="success"
      />
      <StatsCard
        title="Total Estornos"
        value={formatCurrency(revenue.refunded)}
        delta={formatDelta(comparison?.netRevenueDelta !== undefined ? -comparison.netRevenueDelta : undefined)}
        deltaPositive={false} // Estorno geralmente é negativo no contexto de receita, mas aqui mostramos o valor positivo do estorno
        icon={<TrendingDown size={20} />}
        color="danger"
      />
      <StatsCard
        title="Ticket Médio"
        value={formatCurrency(revenue.averageTicket)}
        icon={<Receipt size={20} />}
        color="primary"
      />
      <StatsCard
        title="Taxa de Aprovação"
        value={`${transactions.approvalRate.toFixed(1)}%`}
        delta={comparison?.approvalRateDelta !== undefined ? `${Math.abs(comparison.approvalRateDelta).toFixed(1)}pp` : undefined}
        deltaPositive={(comparison?.approvalRateDelta || 0) >= 0}
        icon={<Percent size={20} />}
        color="success"
      />
      <StatsCard
        title="Em Análise"
        value={transactions.processing}
        icon={<AlertCircle size={20} />}
        color="warning"
      />
    </div>
    </>
  );
}
