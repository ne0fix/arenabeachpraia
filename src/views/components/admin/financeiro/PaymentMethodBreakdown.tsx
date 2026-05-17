"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MethodData } from "@/types/financeiro";
import { formatCurrency } from "@/core/utils/formatCurrency";
import { Zap, CreditCard } from "lucide-react";
import { cn } from "@/core/utils/helpers";

interface PaymentMethodBreakdownProps {
  data: MethodData[];
  loading: boolean;
}

const COLORS = ["#624325", "#9c7c5f", "#c4a484", "#e0cbb8"];

const METHOD_ICON: Record<string, any> = {
  PIX: Zap,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
};

export function PaymentMethodBreakdown({ data, loading }: PaymentMethodBreakdownProps) {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 animate-pulse">
        <div className="h-4 w-40 bg-surface-container rounded mb-4" />
        <div className="h-[200px] bg-surface-container rounded-xl mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-surface-container rounded-xl" />)}
        </div>
      </div>
    );
  }

  const activeData = data.filter((m) => m.gross > 0);
  const chartData = activeData.map((m) => ({ name: m.label, value: m.gross }));
  const totalGross = activeData.reduce((s, m) => s + m.gross, 0);

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5">
      <h3 className="font-headline font-black text-base text-on-surface mb-4">Pagamentos por Método</h3>

      {activeData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="font-headline text-xs text-on-surface-variant uppercase tracking-widest">Sem dados no período</p>
        </div>
      ) : (
        <>
          {/* Donut */}
          <div className="h-[180px] w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), ""]}
                  contentStyle={{
                    background: "#fff8f5",
                    border: "1px solid #d3c4b8",
                    borderRadius: 12,
                    fontFamily: "Lexend",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Method cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.map((m, i) => {
              const Icon = METHOD_ICON[m.method] ?? CreditCard;
              const share = totalGross > 0 ? ((m.gross / totalGross) * 100).toFixed(0) : "0";
              return (
                <div key={m.method} className="flex items-center gap-3 bg-surface-container rounded-xl p-3 border border-outline-variant/20">
                  <div className="w-2.5 h-full min-h-[40px] rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon size={12} className="text-primary flex-shrink-0" />
                      <p className="font-headline text-[10px] font-bold text-on-surface-variant uppercase tracking-widest truncate">{m.label}</p>
                    </div>
                    <p className="font-headline text-sm font-black text-on-surface">{formatCurrency(m.gross)}</p>
                    <p className="font-headline text-[10px] text-on-surface-variant">{m.count} transações · {share}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
