import { Prisma } from '../generated/prisma/client';

const DEFAULT_SERVICE_INTERVAL_KM = 15000;

export function estimateAverageDailyKm(input: {
  previousOdometer: number;
  previousSyncedAt: Date | null;
  newOdometer: number;
  now?: Date;
  existingAverage?: Prisma.Decimal | number | null;
}): Prisma.Decimal {
  const now = input.now ?? new Date();
  const deltaKm = Math.max(0, input.newOdometer - input.previousOdometer);

  if (!input.previousSyncedAt) {
    return new Prisma.Decimal(input.existingAverage ?? Math.max(deltaKm, 30));
  }

  const elapsedDays = Math.max(
    (now.getTime() - input.previousSyncedAt.getTime()) / (1000 * 60 * 60 * 24),
    1 / 24,
  );
  const sample = new Prisma.Decimal(deltaKm).div(elapsedDays);
  const existing = new Prisma.Decimal(input.existingAverage ?? sample);
  // Smooth with prior average
  return existing.mul(0.7).add(sample.mul(0.3));
}

export function predictNextService(input: {
  currentOdometerKm: number;
  averageDailyKm: Prisma.Decimal | number;
  nextServiceDueKm?: number | null;
  serviceIntervalKm?: number;
  now?: Date;
}) {
  const interval = input.serviceIntervalKm ?? DEFAULT_SERVICE_INTERVAL_KM;
  const nextDueKm =
    input.nextServiceDueKm && input.nextServiceDueKm > input.currentOdometerKm
      ? input.nextServiceDueKm
      : Math.ceil((input.currentOdometerKm + 1) / interval) * interval;

  const remainingKm = Math.max(nextDueKm - input.currentOdometerKm, 0);
  const avg = Number(input.averageDailyKm);
  const daysUntil = avg > 0 ? remainingKm / avg : 90;
  const now = input.now ?? new Date();
  const nextServiceDueDate = new Date(now);
  nextServiceDueDate.setDate(nextServiceDueDate.getDate() + Math.ceil(daysUntil));

  return {
    nextServiceDueKm: nextDueKm,
    nextServiceDueDate,
    remainingKm,
    estimatedDaysUntilService: Math.ceil(daysUntil),
  };
}

export function mileageAgainstLimit(input: {
  currentOdometerKm: number;
  monthlyLimit?: number | null;
  contractMonthlyLimit?: number | null;
  averageDailyKm?: Prisma.Decimal | number | null;
}) {
  const limit = input.monthlyLimit ?? input.contractMonthlyLimit ?? null;
  const avg = Number(input.averageDailyKm ?? 0);
  const projectedMonthly = Math.round(avg * 30);

  return {
    monthlyLimitKm: limit,
    projectedMonthlyKm: projectedMonthly,
    overLimit:
      limit != null ? projectedMonthly > limit : false,
    usagePercent:
      limit != null && limit > 0
        ? Math.round((projectedMonthly / limit) * 1000) / 10
        : null,
  };
}
