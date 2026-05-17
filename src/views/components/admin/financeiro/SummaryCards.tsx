import { StatsCard } from "../StatsCard";
import { FinanceiroSummary } from "@/types/financeiro";
import { formatCurrency } from "@/core/utils/formatCurrency";
import { TrendingUp, TrendingDown, DollarSign, Percent, AlertCircle, Receipt } from "lucide-react";

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
  );
}
