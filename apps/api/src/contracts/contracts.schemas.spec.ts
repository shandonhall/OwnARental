import {
  createContractSchema,
  updateContractSchema,
} from './contracts.schemas';

describe('contracts.schemas Phase 1A', () => {
  const base = {
    clientId: '11111111-1111-4111-8111-111111111111',
    vehicleId: '22222222-2222-4222-8222-222222222222',
    planType: 'CIP_10' as const,
    termMonths: 48,
    monthlyRate: 6000,
    startDate: '2026-01-01',
  };

  it('accepts legacy create payload without Schedule A fields', () => {
    const parsed = createContractSchema.parse(base);
    expect(parsed.monthlyRate).toBe(6000);
    expect(parsed.agreementNumber).toBeNull();
    expect(parsed.cipAmount).toBeNull();
    expect(parsed.vehicleRentalAmount).toBeNull();
  });

  it('trims agreementNumber and rejects empty as null', () => {
    expect(
      createContractSchema.parse({
        ...base,
        agreementNumber: '  OAR12345 EXMPLGP  ',
      }).agreementNumber,
    ).toBe('OAR12345 EXMPLGP');
    expect(
      createContractSchema.parse({ ...base, agreementNumber: '   ' })
        .agreementNumber,
    ).toBeNull();
  });

  it('keeps cipAmount independent of cipPercent', () => {
    const parsed = createContractSchema.parse({
      ...base,
      cipPercent: 10,
      cipAmount: 20000,
    });
    expect(parsed.cipPercent).toBe(10);
    expect(parsed.cipAmount).toBe(20000);
  });

  it('validates rentalDueDay 1-31', () => {
    expect(
      createContractSchema.parse({ ...base, rentalDueDay: 1 }).rentalDueDay,
    ).toBe(1);
    expect(
      createContractSchema.parse({ ...base, rentalDueDay: 31 }).rentalDueDay,
    ).toBe(31);
    expect(() =>
      createContractSchema.parse({ ...base, rentalDueDay: 0 }),
    ).toThrow();
    expect(() =>
      createContractSchema.parse({ ...base, rentalDueDay: 32 }),
    ).toThrow();
  });

  it('preserves nullable onboarding Unknown vs Yes/No', () => {
    const unknown = createContractSchema.parse(base);
    expect(unknown.lifeInsuranceAccepted).toBeNull();
    expect(
      createContractSchema.parse({
        ...base,
        lifeInsuranceAccepted: 'true',
      }).lifeInsuranceAccepted,
    ).toBe(true);
    expect(
      createContractSchema.parse({
        ...base,
        insuranceComplete: false,
      }).insuranceComplete,
    ).toBe(false);
  });

  it('allows partial update of Phase 1A fields', () => {
    const parsed = updateContractSchema.parse({
      agreementNumber: 'OAR99999 TESTGP',
      annualKmLimit: 30000,
      vehicleKeptAddress: '12 Demo Street, Randburg',
      otherMonthlyAmount: 0,
    });
    expect(parsed.agreementNumber).toBe('OAR99999 TESTGP');
    expect(parsed.annualKmLimit).toBe(30000);
    expect(parsed.otherMonthlyAmount).toBe(0);
  });

  it('rejects negative money amounts', () => {
    expect(() =>
      createContractSchema.parse({ ...base, vehicleValue: -1 }),
    ).toThrow();
  });
});
