import { Prisma } from '../generated/prisma/client';
import {
  hasCompleteMonthlyBreakdown,
  monthlyComponentsMatchAllIn,
  type MonthlyComponentsInput,
} from '../finance/finance.utils';
import type { CreateContractDto, UpdateContractDto } from './contracts.schemas';

export function moneyOrNull(
  value: string | number | null | undefined,
): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') return null;
  return new Prisma.Decimal(value);
}

export function componentsFromDto(
  data: CreateContractDto | UpdateContractDto,
): MonthlyComponentsInput {
  return {
    vehicleRentalAmount: data.vehicleRentalAmount ?? null,
    administrationAmount: data.administrationAmount ?? null,
    warrantyAmount: data.warrantyAmount ?? null,
    servicePlanAmount: data.servicePlanAmount ?? null,
    trackingAmount: data.trackingAmount ?? null,
    licenceFeeAmount: data.licenceFeeAmount ?? null,
    insuranceAmount: data.insuranceAmount ?? null,
    lifeInsuranceAmount: data.lifeInsuranceAmount ?? null,
    otherMonthlyAmount: data.otherMonthlyAmount ?? null,
  };
}

/**
 * When every monthly component is explicitly captured (including zeros),
 * the sum must equal monthlyRate (All-In). Legacy/partial breakdowns are allowed.
 */
export function assertCompleteBreakdownMatchesAllIn(
  monthlyRate: Prisma.Decimal | number | string,
  components: MonthlyComponentsInput,
): void {
  if (!hasCompleteMonthlyBreakdown(components)) return;
  const matches = monthlyComponentsMatchAllIn(monthlyRate, components);
  if (matches === false) {
    throw new Error(
      'Monthly component total must equal Rental Amount All In (monthlyRate) when all components are captured',
    );
  }
}

export const PHASE1A_MONEY_KEYS = [
  'cipAmount',
  'vehicleValue',
  'initialOnRoadCosts',
  'vehicleRentalAmount',
  'administrationAmount',
  'warrantyAmount',
  'servicePlanAmount',
  'trackingAmount',
  'licenceFeeAmount',
  'insuranceAmount',
  'lifeInsuranceAmount',
  'otherMonthlyAmount',
] as const;

export type Phase1aMoneyKey = (typeof PHASE1A_MONEY_KEYS)[number];
