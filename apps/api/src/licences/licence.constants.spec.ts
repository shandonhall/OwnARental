import { NON_TERMINAL_LICENCE_STATUSES } from './licence.constants';
import { LicenceRenewalStatus } from '../generated/prisma/enums';

describe('Phase 1C one-open-cycle constants', () => {
  it('treats OPEN through RECEIVED as non-terminal', () => {
    expect(NON_TERMINAL_LICENCE_STATUSES).toEqual([
      LicenceRenewalStatus.OPEN,
      LicenceRenewalStatus.IN_PROGRESS,
      LicenceRenewalStatus.RENEWED,
      LicenceRenewalStatus.RECEIVED,
    ]);
  });
});
