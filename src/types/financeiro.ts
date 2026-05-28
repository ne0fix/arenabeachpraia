import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export interface FinanceiroSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    gross: number;
    net: number;
    refunded: number;
    averageTicket: number;
    pendingManualRefund: number;
    pendingManualRefundCount: number;
  };
  transactions: {
    total: number;
    approved: number;
    processing: number;
    rejected: number;
    cancelled: number;
    refunded: number;
    expired: number;
    approvalRate: number;
  };
  comparison?: {
    grossRevenueDelta: number;
    netRevenueDelta: number;
    approvalRateDelta: number;
    approvedCountDelta: number;
  };
}

export type Granularity = "day" | "week" | "month";

export interface PeriodDataPoint {
  label: string;
  date: string;
  gross: number;
  net: number;
  refunded: number;
  count: number;
}

export interface FinanceiroByPeriod {
  granularity: Granularity;
  data: PeriodDataPoint[];
}

export interface MethodData {
  method: PaymentMethod;
  label: string;
  gross: number;
  refunded: number;
  count: number;
  totalAttempts: number;
  approvalRate: number;
  averageTicket: number;
  shareOfRevenue: number;
}

export interface FinanceiroByMethod {
  methods: MethodData[];
  total: {
    gross: number;
    count: number;
  };
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  status?: PaymentStatus[];
  method?: PaymentMethod[];
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export interface Transaction {
  id: string;
  createdAt: Date;
  paidAt: Date | null;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  refundAmount: number | null;
  refundReason: string | null;
  gatewayId: string | null;
  gatewayStatus: string | null;
  cardLastFour: string | null;
  cardBrand: string | null;
  pendingManualRefund?: boolean;
  booking: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    court: { id: string; name: string };
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    totalRefunded: number;
    count: number;
  };
}
