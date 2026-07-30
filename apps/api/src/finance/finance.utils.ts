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
  }>;
}>(contract: T) {
  const expectedTotal = expectedContractTotal(contract);
  const totalPaid = contract.ledger
    ? sumPaidIncome(contract.ledger)
    : new Prisma.Decimal(contract.totalPaid);
  const outstandingBalance = Prisma.Decimal.max(
    expectedTotal.sub(totalPaid),
    new Prisma.Decimal(0),
  );
  const progress = termProgress(contract);

  return {
    ...contract,
    expectedTotal: expectedTotal.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    outstandingBalance: outstandingBalance.toFixed(2),
    termProgress: progress,
  };
}
