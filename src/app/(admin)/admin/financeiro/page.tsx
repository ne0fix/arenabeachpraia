"use client";

import { useFinanceiroViewModel } from "@/viewmodels/admin/useFinanceiroViewModel";
import { SummaryCards } from "@/views/components/admin/financeiro/SummaryCards";
import { ProcessingAlert } from "@/views/components/admin/financeiro/ProcessingAlert";
import { TransactionTable } from "@/views/components/admin/financeiro/TransactionTable";
import { TransactionDetailDrawer } from "@/views/components/admin/financeiro/TransactionDetailDrawer";
import { RevenuePeriodChart } from "@/views/components/admin/financeiro/RevenuePeriodChart";
import { PaymentMethodBreakdown } from "@/views/components/admin/financeiro/PaymentMethodBreakdown";
import { Calendar, Search, Download, Filter } from "lucide-react";

export default function FinanceiroPage() {
  const vm = useFinanceiroViewModel();

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline font-black text-2xl text-on-surface">Gestão Financeira</h1>
          <p className="font-headline text-xs text-on-surface-variant mt-0.5">Saúde financeira da arena em tempo real</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-surface-container-lowest rounded-xl border border-outline-variant/30 px-3 py-2">
            <Calendar size={14} className="text-primary flex-shrink-0" />
            <input
              type="date"
              value={vm.startDate}
              onChange={(e) => vm.setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface focus:outline-none w-28"
            />
            <span className="text-outline-variant text-xs">—</span>
            <input
              type="date"
              value={vm.endDate}
              onChange={(e) => vm.setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-on-surface focus:outline-none w-28"
            />
          </div>
          <a
            href={`/api/admin/financeiro/transactions/export?startDate=${vm.startDate}&endDate=${vm.endDate}`}
            className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl font-headline font-bold text-xs uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <Download size={14} />
            Exportar
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards data={vm.summary} loading={vm.loadingSummary} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RevenuePeriodChart
            data={vm.periodData?.data || []}
            granularity={vm.granularity}
            loading={vm.loadingPeriod}
          />
        </div>
        <div className="lg:col-span-2">
          <PaymentMethodBreakdown
            data={vm.methodData?.methods || []}
            loading={vm.loadingMethod}
          />
        </div>
      </div>

      {/* Processing Alert */}
      <ProcessingAlert transactions={vm.processingTransactions} />

      {/* Transações */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-headline font-black text-lg text-on-surface">Central de Transações</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={14} />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={vm.filters.search || ""}
                onChange={(e) => vm.handleFilterChange({ search: e.target.value, page: 1 })}
                className="pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-xs focus:outline-none focus:border-primary transition-colors w-44"
              />
            </div>
            <button className="p-2 bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl hover:bg-surface-container transition-colors">
              <Filter size={16} />
            </button>
          </div>
        </div>

        <TransactionTable
          transactions={vm.transactionsResult?.data || []}
          pagination={vm.transactionsResult?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 }}
          loading={vm.loadingTransactions}
          onPageChange={vm.handlePageChange}
          onFilterChange={vm.handleFilterChange}
          onSelect={vm.handleSelectTransaction}
          onRefund={vm.handleRefund}
          currentStatus={vm.filters.status?.[0]}
        />
      </div>

      <TransactionDetailDrawer
        transaction={vm.selectedTransaction}
        open={vm.isDrawerOpen}
        onClose={vm.handleCloseDrawer}
        onRefund={vm.handleRefund}
      />
    </div>
  );
}
