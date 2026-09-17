import { BadRequestException } from '@nestjs/common';
import { LicenceRenewalStatus } from '../generated/prisma/enums';
import {
  assertLicenceCompletionReady,
  nextCycleCreateData,
} from './licence.completion';

describe('Phase 1C licence completion', () => {
  it('requires renewedExpiryDate and sent or collected', () => {
    expect(() =>
      assertLicenceCompletionReady({
        expiryDate: '2026-09-30',
        renewedExpiryDate: null,
        sentAt: new Date(),
        collectedAt: null,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertLicenceCompletionReady({
        expiryDate: '2026-09-30',
        renewedExpiryDate: '2027-09-30',
        sentAt: null,
        collectedAt: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('requires renewedExpiryDate after expiryDate', () => {
    expect(() =>
      assertLicenceCompletionReady({
        expiryDate: '2026-09-30',
        renewedExpiryDate: '2026-09-30',
        sentAt: new Date(),
        collectedAt: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts valid completion and builds a clean next OPEN cycle', () => {
    const { renewedExpiry } = assertLicenceCompletionReady({
      expiryDate: '2026-09-30',
      renewedExpiryDate: '2027-09-30',
      sentAt: null,
      collectedAt: new Date(),
    });
    expect(renewedExpiry.toISOString().slice(0, 10)).toBe('2027-09-30');

    const next = nextCycleCreateData({
      vehicleId: '11111111-1111-1111-1111-111111111111',
      renewedExpiry,
    });
    expect(next.status).toBe(LicenceRenewalStatus.OPEN);
    expect(next.contractId).toBeNull();
    expect(next.clientId).toBeNull();
    expect(next.responsibleUserId).toBeNull();
    expect(next.renewalCost).toBeNull();
    expect(next.notes).toBeNull();
    expect(next.expiryDate.toISOString().slice(0, 10)).toBe('2027-09-30');
  });
});
