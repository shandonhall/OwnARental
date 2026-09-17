import { BadRequestException } from '@nestjs/common';
import { LicenceRenewalStatus } from '../generated/prisma/enums';
import { toUtcDateOnly } from './licence.urgency';

/** Pure completion preconditions shared with LicencesService.completeCycle. */
export function assertLicenceCompletionReady(input: {
  expiryDate: Date | string;
  renewedExpiryDate: Date | string | null | undefined;
  sentAt: Date | null | undefined;
  collectedAt: Date | null | undefined;
}): { renewedExpiry: Date } {
  if (!input.renewedExpiryDate) {
    throw new BadRequestException(
      'renewedExpiryDate is required to complete a licence renewal',
    );
  }
  if (!input.sentAt && !input.collectedAt) {
    throw new BadRequestException(
      'sentAt or collectedAt is required to complete a licence renewal',
    );
  }
  const renewedExpiry = toUtcDateOnly(input.renewedExpiryDate);
  const oldExpiry = toUtcDateOnly(input.expiryDate);
  if (renewedExpiry.getTime() <= oldExpiry.getTime()) {
    throw new BadRequestException(
      'renewedExpiryDate must be after the current expiryDate',
    );
  }
  return { renewedExpiry };
}

export function nextCycleCreateData(input: {
  vehicleId: string;
  renewedExpiry: Date;
}) {
  return {
    vehicleId: input.vehicleId,
    expiryDate: input.renewedExpiry,
    status: LicenceRenewalStatus.OPEN,
    contractId: null as string | null,
    clientId: null as string | null,
    responsibleUserId: null as string | null,
    renewalCost: null,
    notes: null,
  };
}
