import { prisma } from "@/infrastructure/database/prisma";
import { IFinanceiroRepository } from "@/repositories/IFinanceiroRepository";
import {
  FinanceiroSummary,
  PeriodDataPoint,
  Granularity,
  MethodData,
  TransactionFilters,
  Transaction,
  PaginatedResult,
} from "@/types/financeiro";
import { PaymentStatus, PaymentMethod } from "@prisma/client";
import { startOfDay, endOfDay, subDays, differenceInDays, format } from "date-fns";

// Payments com este refundReason são APPROVED no banco mas pendentes de estorno
// manual (cliente pagou após outro confirmar primeiro). NÃO contam como receita.
const PENDING_REFUND_FLAG = "PENDING_MANUAL_REFUND";

function isPendingManualRefund(p: { refundReason: string | null }): boolean {
  return p.refundReason?.startsWith(PENDING_REFUND_FLAG) ?? false;
}

export class PrismaFinanceiroRepository implements IFinanceiroRepository {
  async getSummary(startDate: Date, endDate: Date): Promise<FinanceiroSummary> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        status: true,
        amount: true,
        refundAmount: true,
        refundReason: true,
      },
    });

    // Excluí pagamentos pendentes de estorno manual da receita confirmada
    const approved = payments.filter(
      (p) => p.status === PaymentStatus.APPROVED && !isPendingManualRefund(p)
    );
    const pendingManualRefund = payments.filter(
      (p) => p.status === PaymentStatus.APPROVED && isPendingManualRefund(p)
    );
    const refunded = payments.filter(
      (p) => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIAL_REFUND
    );

    const grossRevenue = approved.reduce((acc, p) => acc + Number(p.amount), 0);
    const pendingRefundAmount = pendingManualRefund.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalRefunded = refunded.reduce((acc, p) => acc + Number(p.refundAmount || 0), 0);
    const netRevenue = grossRevenue - totalRefunded;
    const averageTicket = approved.length > 0 ? grossRevenue / approved.length : 0;

    const totalTransactions = payments.length;
    const approvedCount = approved.length;
    const processingCount = payments.filter((p) => p.status === PaymentStatus.PROCESSING).length;
    const rejectedCount = payments.filter((p) => p.status === PaymentStatus.REJECTED).length;
    const cancelledCount = payments.filter((p) => p.status === PaymentStatus.CANCELLED).length;
    const refundedCount = refunded.length;
    const expiredCount = payments.filter((p) => p.status === PaymentStatus.EXPIRED).length;

    const approvalRate =
      totalTransactions > 0 ? (approvedCount / totalTransactions) * 100 : 0;

    // Comparison logic
    const duration = differenceInDays(end, start) + 1;
    const prevStart = subDays(start, duration);
    const prevEnd = subDays(end, duration);

    const prevPayments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      select: {
        status: true,
        amount: true,
        refundAmount: true,
        refundReason: true,
      },
    });

    const prevApproved = prevPayments.filter(
      (p) => p.status === PaymentStatus.APPROVED && !isPendingManualRefund(p)
    );
    const prevRefunded = prevPayments.filter(
      (p) => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIAL_REFUND
    );

    const prevGrossRevenue = prevApproved.reduce((acc, p) => acc + Number(p.amount), 0);
    const prevTotalRefunded = prevRefunded.reduce((acc, p) => acc + Number(p.refundAmount || 0), 0);
    const prevNetRevenue = prevGrossRevenue - prevTotalRefunded;
    const prevApprovedCount = prevApproved.length;
    const prevApprovalRate =
      prevPayments.length > 0 ? (prevApprovedCount / prevPayments.length) * 100 : 0;

    const calculateDelta = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      period: {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      },
      revenue: {
        gross: grossRevenue,
        net: netRevenue,
        refunded: totalRefunded,
        averageTicket,
        pendingManualRefund: pendingRefundAmount,
        pendingManualRefundCount: pendingManualRefund.length,
      },
      transactions: {
        total: totalTransactions,
        approved: approvedCount,
        processing: processingCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
        refunded: refundedCount,
        expired: expiredCount,
        approvalRate,
      },
      comparison: {
        grossRevenueDelta: calculateDelta(grossRevenue, prevGrossRevenue),
        netRevenueDelta: calculateDelta(netRevenue, prevNetRevenue),
        approvalRateDelta: approvalRate - prevApprovalRate,
        approvedCountDelta: calculateDelta(approvedCount, prevApprovedCount),
      },
    };
  }

  async getByPeriod(
    startDate: Date,
    endDate: Date,
    granularity: Granularity
  ): Promise<PeriodDataPoint[]> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: {
          in: [
            PaymentStatus.APPROVED,
            PaymentStatus.REFUNDED,
            PaymentStatus.PARTIAL_REFUND,
          ],
        },
      },
      select: {
        createdAt: true,
        status: true,
        amount: true,
        refundAmount: true,
        refundReason: true,
      },
    });

    const dataMap = new Map<string, PeriodDataPoint>();

    payments.forEach((p) => {
      let key = "";
      let label = "";

      if (granularity === "day") {
        key = format(p.createdAt, "yyyy-MM-dd");
        label = format(p.createdAt, "dd MMM");
      } else if (granularity === "week") {
        key = format(p.createdAt, "yyyy-'W'ww");
        label = `Semana ${format(p.createdAt, "ww")}`;
      } else {
        key = format(p.createdAt, "yyyy-MM");
        label = format(p.createdAt, "MMMM");
      }

      const existing = dataMap.get(key) || {
        label,
        date: key,
        gross: 0,
        net: 0,
        refunded: 0,
        count: 0,
      };

      if (p.status === PaymentStatus.APPROVED && !isPendingManualRefund(p)) {
        existing.gross += Number(p.amount);
        existing.count += 1;
      } else if (
        p.status === PaymentStatus.REFUNDED ||
        p.status === PaymentStatus.PARTIAL_REFUND
      ) {
        existing.refunded += Number(p.refundAmount || 0);
      }

      existing.net = existing.gross - existing.refunded;
      dataMap.set(key, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getByMethod(startDate: Date, endDate: Date): Promise<MethodData[]> {
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        method: true,
        status: true,
        amount: true,
        refundAmount: true,
        refundReason: true,
      },
    });

    const methods: PaymentMethod[] = [
      PaymentMethod.PIX,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
    ];

    const totalGross = payments
      .filter((p) => p.status === PaymentStatus.APPROVED && !isPendingManualRefund(p))
      .reduce((acc, p) => acc + Number(p.amount), 0);

    return methods.map((m) => {
      const methodPayments = payments.filter((p) => p.method === m);
      const approved = methodPayments.filter(
        (p) => p.status === PaymentStatus.APPROVED && !isPendingManualRefund(p)
      );
      const refunded = methodPayments.filter(
        (p) => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIAL_REFUND
      );

      const gross = approved.reduce((acc, p) => acc + Number(p.amount), 0);
      const refundedAmt = refunded.reduce((acc, p) => acc + Number(p.refundAmount || 0), 0);
      const count = approved.length;
      const totalAttempts = methodPayments.length;
      const approvalRate = totalAttempts > 0 ? (count / totalAttempts) * 100 : 0;
      const averageTicket = count > 0 ? gross / count : 0;
      const shareOfRevenue = totalGross > 0 ? (gross / totalGross) * 100 : 0;

      const labels: Record<PaymentMethod, string> = {
        [PaymentMethod.PIX]: "PIX",
        [PaymentMethod.CREDIT_CARD]: "Crédito",
        [PaymentMethod.DEBIT_CARD]: "Débito",
      };

      return {
        method: m,
        label: labels[m],
        gross,
        refunded: refundedAmt,
        count,
        totalAttempts,
        approvalRate,
        averageTicket,
        shareOfRevenue,
      };
    });
  }

  async getTransactions(filters: TransactionFilters): Promise<PaginatedResult<Transaction>> {
    const {
      startDate,
      endDate,
      status,
      method,
      search,
      minAmount,
      maxAmount,
      page = 1,
      pageSize = 20,
    } = filters;

    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      status?: { in: PaymentStatus[] };
      method?: { in: PaymentMethod[] };
      amount?: { gte?: number; lte?: number };
      OR?: {
        id?: { contains: string; mode: "insensitive" };
        gatewayId?: { contains: string; mode: "insensitive" };
        booking?: {
          user: {
            name: { contains: string; mode: "insensitive" };
          };
        };
      }[];
    } = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startOfDay(new Date(startDate));
      if (endDate) where.createdAt.lte = endOfDay(new Date(endDate));
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (method && method.length > 0) {
      where.method = { in: method };
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { gatewayId: { contains: search, mode: "insensitive" } },
        {
          booking: {
            user: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              court: true,
              user: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Summary considera receita confirmada — exclui pendentes de estorno manual
    const allFiltered = await prisma.payment.findMany({
      where,
      select: { status: true, amount: true, refundAmount: true, refundReason: true },
    });
    const confirmedSum = allFiltered
      .filter((p) => p.status === PaymentStatus.APPROVED && !isPendingManualRefund(p))
      .reduce((s, p) => s + Number(p.amount), 0);
    const refundedSum = allFiltered
      .filter((p) => p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIAL_REFUND)
      .reduce((s, p) => s + Number(p.refundAmount || 0), 0);

    const data: Transaction[] = payments.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      method: p.method,
      status: p.status,
      amount: Number(p.amount),
      refundAmount: p.refundAmount ? Number(p.refundAmount) : null,
      refundReason: p.refundReason,
      gatewayId: p.gatewayId,
      gatewayStatus: p.gatewayStatus,
      cardLastFour: p.cardLastFour,
      cardBrand: p.cardBrand,
      pendingManualRefund: isPendingManualRefund(p),
      booking: {
        id: p.booking.id,
        date: p.booking.date,
        startTime: p.booking.startTime,
        endTime: p.booking.endTime,
        court: {
          id: p.booking.court.id,
          name: p.booking.court.name,
        },
        user: {
          id: p.booking.user.id,
          name: p.booking.user.name,
          email: p.booking.user.email,
          phone: p.booking.user.phone,
        },
      },
    }));

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalAmount: confirmedSum,
        totalRefunded: refundedSum,
        count: allFiltered.filter((p) => p.status === PaymentStatus.APPROVED && !isPendingManualRefund(p)).length,
      },
    };
  }
}
