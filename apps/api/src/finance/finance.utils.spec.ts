jest.mock('../generated/prisma/client', () => {
  // Prisma generated ESM paths break under Jest; Decimal is enough for these helpers.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
  const Decimal = require('@prisma/client/runtime/client').Decimal as new (
    value: string | number,
  ) => { toString(): string };
  return { Prisma: { Decimal } };
});

import {
  expectedContractTotal,
  hasCompleteMonthlyBreakdown,
  isMonthlyBreakdownUncaptured,
  monthlyComponentsMatchAllIn,
  sumMonthlyComponents,
  termProgress,
  withMonthlyPricingSummary,
} from './finance.utils';

describe('finance.utils Phase 1A monthly components', () => {
  const complete = {
    vehicleRentalAmount: 4200,
    administrationAmount: 250,
    warrantyAmount: 300,
    servicePlanAmount: 400,
    trackingAmount: 150,
    licenceFeeAmount: 100,
    insuranceAmount: 500,
    lifeInsuranceAmount: 100,
    otherMonthlyAmount: 0,
  };

  it('treats all-null components as uncaptured', () => {
    expect(isMonthlyBreakdownUncaptured({})).toBe(true);
    expect(sumMonthlyComponents({})).toBeNull();
    expect(hasCompleteMonthlyBreakdown({})).toBe(false);
  });

  it('preserves null vs zero distinction', () => {
    expect(isMonthlyBreakdownUncaptured({ vehicleRentalAmount: null })).toBe(
      true,
    );
    expect(isMonthlyBreakdownUncaptured({ vehicleRentalAmount: 0 })).toBe(
      false,
    );
    expect(sumMonthlyComponents({ vehicleRentalAmount: 0 })?.toFixed(2)).toBe(
      '0.00',
    );
  });

  it('sums complete Schedule A components with Decimal arithmetic', () => {
    const sum = sumMonthlyComponents(complete);
    expect(sum?.toFixed(2)).toBe('6000.00');
    expect(hasCompleteMonthlyBreakdown(complete)).toBe(true);
  });

  it('matches all-in monthlyRate only when breakdown is complete', () => {
    expect(monthlyComponentsMatchAllIn(6000, complete)).toBe(true);
    expect(monthlyComponentsMatchAllIn(5999.99, complete)).toBe(false);
    expect(
      monthlyComponentsMatchAllIn(6000, {
        vehicleRentalAmount: 4200,
        insuranceAmount: 500,
      }),
    ).toBeNull();
  });

  it('withMonthlyPricingSummary exposes UI flags', () => {
    const legacy = withMonthlyPricingSummary({ monthlyRate: 7200 });
    expect(legacy.pricingBreakdownCaptured).toBe(false);
    expect(legacy.calculatedComponentsTotal).toBeNull();
    expect(legacy.componentsMatchMonthlyRate).toBeNull();

    const ok = withMonthlyPricingSummary({ monthlyRate: 6000, ...complete });
    expect(ok.pricingBreakdownComplete).toBe(true);
    expect(ok.calculatedComponentsTotal).toBe('6000.00');
    expect(ok.componentsMatchMonthlyRate).toBe(true);
  });

  it('expectedContractTotal still uses monthlyRate (All-In)', () => {
    const total = expectedContractTotal({
      monthlyRate: 6000,
      termMonths: 48,
      depositAmount: 0,
      balloonAmount: null,
    });
    expect(total.toFixed(2)).toBe('288000.00');
  });

  it('termProgress still derives months from dates', () => {
    const start = new Date('2024-01-15');
    const end = new Date('2028-01-15');
    const progress = termProgress({
      startDate: start,
      endDate: end,
      termMonths: 48,
      now: new Date('2026-01-15'),
    });
    expect(progress.termMonths).toBe(48);
    expect(progress.monthsElapsed).toBe(24);
  });
});
