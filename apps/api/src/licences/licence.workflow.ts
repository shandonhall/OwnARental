import { BadRequestException } from '@nestjs/common';
import { LicenceRenewalStatus } from '../generated/prisma/enums';
import { TERMINAL_LICENCE_STATUSES } from './licence.constants';

export type LicenceMark =
  | 'start'
  | 'renewed'
  | 'received'
  | 'sent'
  | 'collected'
  | 'cancel'
  | 'client_notified';

const STATUS_RANK: Record<LicenceRenewalStatus, number> = {
  [LicenceRenewalStatus.OPEN]: 0,
  [LicenceRenewalStatus.IN_PROGRESS]: 1,
  [LicenceRenewalStatus.RENEWED]: 2,
  [LicenceRenewalStatus.RECEIVED]: 3,
  [LicenceRenewalStatus.COMPLETED]: 4,
  [LicenceRenewalStatus.CANCELLED]: 5,
};

export function isTerminalStatus(status: LicenceRenewalStatus): boolean {
  return (TERMINAL_LICENCE_STATUSES as readonly string[]).includes(status);
}

export function statusForMark(mark: LicenceMark): LicenceRenewalStatus | null {
  switch (mark) {
    case 'start':
      return LicenceRenewalStatus.IN_PROGRESS;
    case 'renewed':
      return LicenceRenewalStatus.RENEWED;
    case 'received':
      return LicenceRenewalStatus.RECEIVED;
    case 'sent':
    case 'collected':
      return LicenceRenewalStatus.COMPLETED;
    case 'cancel':
      return LicenceRenewalStatus.CANCELLED;
    case 'client_notified':
      return null;
    default:
      return null;
  }
}

/** Forward-only (or cancel). Skipping ahead is allowed; backward is not. */
export function assertForwardOrCancel(
  from: LicenceRenewalStatus,
  to: LicenceRenewalStatus,
): void {
  if (isTerminalStatus(from)) {
    throw new BadRequestException(
      `Cannot change workflow from terminal status ${from}`,
    );
  }
  if (to === LicenceRenewalStatus.CANCELLED) return;
  if (isTerminalStatus(to) && to !== LicenceRenewalStatus.COMPLETED) {
    throw new BadRequestException(`Invalid target status ${to}`);
  }
  if (STATUS_RANK[to] < STATUS_RANK[from]) {
    throw new BadRequestException(
      `Cannot move licence renewal backward from ${from} to ${to}`,
    );
  }
}

export function timestampPatchForMark(
  mark: LicenceMark,
  now: Date,
): Record<string, Date> {
  switch (mark) {
    case 'start':
      return { renewalStartedAt: now };
    case 'renewed':
      return { renewedAt: now };
    case 'received':
      return { receivedAt: now };
    case 'sent':
      return { sentAt: now };
    case 'collected':
      return { collectedAt: now };
    case 'client_notified':
      return { clientNotifiedAt: now };
    case 'cancel':
      return {};
    default:
      return {};
  }
}
