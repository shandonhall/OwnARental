import { BadRequestException } from '@nestjs/common';
import { LicenceRenewalStatus } from '../generated/prisma/enums';
import {
  assertForwardOrCancel,
  isTerminalStatus,
  statusForMark,
  timestampPatchForMark,
} from './licence.workflow';

describe('Phase 1C licence workflow', () => {
  it('allows forward skipping without fabricating skipped timestamps', () => {
    expect(() =>
      assertForwardOrCancel(
        LicenceRenewalStatus.OPEN,
        LicenceRenewalStatus.RECEIVED,
      ),
    ).not.toThrow();
    expect(
      timestampPatchForMark('received', new Date('2026-09-09T10:00:00Z')),
    ).toEqual({ receivedAt: new Date('2026-09-09T10:00:00Z') });
  });

  it('rejects backward moves and terminal re-entry', () => {
    expect(() =>
      assertForwardOrCancel(
        LicenceRenewalStatus.RECEIVED,
        LicenceRenewalStatus.OPEN,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertForwardOrCancel(
        LicenceRenewalStatus.COMPLETED,
        LicenceRenewalStatus.OPEN,
      ),
    ).toThrow(BadRequestException);
    expect(isTerminalStatus(LicenceRenewalStatus.CANCELLED)).toBe(true);
  });

  it('maps marks to statuses', () => {
    expect(statusForMark('start')).toBe(LicenceRenewalStatus.IN_PROGRESS);
    expect(statusForMark('sent')).toBe(LicenceRenewalStatus.COMPLETED);
    expect(statusForMark('client_notified')).toBeNull();
  });
});
