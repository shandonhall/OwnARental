import { Prisma } from '../generated/prisma/client';
import {
  LedgerEntryStatus,
  LedgerEntryType,
} from '../generated/prisma/enums';

const INCOME_TYPES: LedgerEntryType[] = [
  LedgerEntryType.RENTAL_PAYMENT,
  LedgerEntryType.DEPOSIT,
  LedgerEntryType.BALLOON_PAYMENT,
];

const PAID_STATUSES: LedgerEntryStatus[] = [
  LedgerEntryStatus.ON_TIME,
  LedgerEntryStatus.EARLY,
  LedgerEntryStatus.LATE,
];

const COST_TYPES: LedgerEntryType[] = [
  LedgerEntryType.MAINTENANCE,
  LedgerEntryType.FINE,
  LedgerEntryType.TOLL,
  LedgerEntryType.ADMIN_FEE,
];

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function expectedContractTotal(input: {
  monthlyRate: Prisma.Decimal | number | string;
  termMonths: number;
  depositAmount?: Prisma.Decimal | number | string | null;
  balloonAmount?: Prisma.Decimal | number | string | null;
}): Prisma.Decimal {
  const monthly = new Prisma.Decimal(input.monthlyRate);
  const deposit = new Prisma.Decimal(input.depositAmount ?? 0);
  const balloon = new Prisma.Decimal(input.balloonAmount ?? 0);
  return monthly.mul(input.termMonths).add(deposit).add(balloon);
}

export function sumPaidIncome(
  entries: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: Prisma.Decimal | number | string;
  }>,
): Prisma.Decimal {
  return entries.reduce((total, entry) => {
    if (!INCOME_TYPES.includes(entry.type)) return total;
    if (!PAID_STATUSES.includes(entry.status)) return total;
    return total.add(new Prisma.Decimal(entry.amount));
  }, new Prisma.Decimal(0));
}

/** Unpaid rental / deposit / balloon lines — money still owed by clients. */
export function sumOutstandingIncome(
  entries: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: Prisma.Decimal | number | string;
  }>,
): Prisma.Decimal {
  return entries.reduce((total, entry) => {
    if (!INCOME_TYPES.includes(entry.type)) return total;
    if (entry.status !== LedgerEntryStatus.PENDING) return total;
    return total.add(new Prisma.Decimal(entry.amount));
  }, new Prisma.Decimal(0));
}

/** Paid + pending income (expected receipts for the scope). */
export function sumExpectedIncome(
  entries: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: Prisma.Decimal | number | string;
  }>,
): Prisma.Decimal {
  return sumPaidIncome(entries).add(sumOutstandingIncome(entries));
}

export function isIncomeLedgerType(type: LedgerEntryType): boolean {
  return INCOME_TYPES.includes(type);
}

const RECOGNIZED_COST_STATUSES: LedgerEntryStatus[] = [
  LedgerEntryStatus.PENDING,
  LedgerEntryStatus.ON_TIME,
  LedgerEntryStatus.EARLY,
  LedgerEntryStatus.LATE,
];

/** Paid cost lines only (settled fees / fines / maintenance). */
export function sumPaidCosts(
  entries: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: Prisma.Decimal | number | string;
  }>,
): Prisma.Decimal {
  return entries.reduce((total, entry) => {
    if (!COST_TYPES.includes(entry.type)) return total;
    if (!PAID_STATUSES.includes(entry.status)) return total;
    return total.add(new Prisma.Decimal(entry.amount));
  }, new Prisma.Decimal(0));
}

/**
 * Operating costs for P&L views — includes pending fines/fees that have
 * been incurred, not only settled payments. Excludes VOID / FAILED.
 */
export function sumRecognizedCosts(
  entries: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: Prisma.Decimal | number | string;
  }>,
): Prisma.Decimal {
  return entries.reduce((total, entry) => {
    if (!COST_TYPES.includes(entry.type)) return total;
    if (!RECOGNIZED_COST_STATUSES.includes(entry.status)) return total;
    return total.add(new Prisma.Decimal(entry.amount));
  }, new Prisma.Decimal(0));
}

export function isCostLedgerType(type: LedgerEntryType): boolean {
  return COST_TYPES.includes(type);
}

export function termProgress(input: {
  startDate: Date;
  endDate: Date;
  termMonths: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  const totalMs = Math.max(end.getTime() - start.getTime(), 1);
  const elapsedMs = Math.min(Math.max(now.getTime() - start.getTime(), 0), totalMs);
  const percent = Math.round((elapsedMs / totalMs) * 1000) / 10;

  const monthsElapsed = Math.min(
    input.termMonths,
    Math.max(
      0,
      (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth()) +
        (now.getDate() >= start.getDate() ? 0 : -1),
    ),
  );

  const daysRemaining = Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    percent: Math.min(100, Math.max(0, percent)),
    monthsElapsed: Math.max(0, monthsElapsed),
    termMonths: input.termMonths,
    daysRemaining,
    isFinalNinetyDays: daysRemaining <= 90 && daysRemaining >= 0 && now <= end,
  };
}

export function withFinanceSummary<T extends {
  monthlyRate: Prisma.Decimal;
  termMonths: number;
  depositAmount: Prisma.Decimal;
  balloonAmount: Prisma.Decimal | null;
  totalPaid: Prisma.Decimal;
  outstandingBalance: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
  ledger?: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: Prisma.Decimal;
    dueDate?: Date | null;
    paidAt?: Date | null;
  }>;
}>(contract: T, now = new Date()) {
  const expectedTotal = expectedContractTotal(contract);
  const totalPaid = contract.ledger
    ? sumPaidIncome(contract.ledger)
    : new Prisma.Decimal(contract.totalPaid);
  const outstandingBalance = Prisma.Decimal.max(
    expectedTotal.sub(totalPaid),
    new Prisma.Decimal(0),
  );
  const progress = termProgress({ ...contract, now });

  const balloon = new Prisma.Decimal(contract.balloonAmount ?? 0);
  const balloonPaid = Boolean(
    contract.ledger?.some(
      (entry) =>
        entry.type === LedgerEntryType.BALLOON_PAYMENT &&
        PAID_STATUSES.includes(entry.status),
    ),
  );
  const balloonOutstanding = balloonPaid
    ? new Prisma.Decimal(0)
    : Prisma.Decimal.min(balloon, outstandingBalance);
  const outstandingExBalloon = Prisma.Decimal.max(
    outstandingBalance.sub(balloonOutstanding),
    new Prisma.Decimal(0),
  );

  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthOwed = (contract.ledger ?? []).reduce((total, entry) => {
    if (entry.type !== LedgerEntryType.RENTAL_PAYMENT) return total;
    if (entry.status !== LedgerEntryStatus.PENDING) return total;
    const due = entry.dueDate ?? entry.paidAt;
    // Due this month or already overdue (still unpaid monthly rent)
    if (due && due > monthEnd) return total;
    return total.add(new Prisma.Decimal(entry.amount));
  }, new Prisma.Decimal(0));

  return {
    ...contract,
    expectedTotal: expectedTotal.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    outstandingBalance: outstandingBalance.toFixed(2),
    outstandingExBalloon: outstandingExBalloon.toFixed(2),
    balloonOutstanding: balloonOutstanding.toFixed(2),
    hasBalloon: balloon.gt(0),
    balloonPaid,
    monthOwed: monthOwed.toFixed(2),
    termProgress: progress,
  };
}
