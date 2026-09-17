import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import {
  assertCanAccessLead,
  assertSalesMayCreateSource,
  canAssignLeads,
  canEditAttribution,
  canViewAllLeads,
  leadAssigneeScope,
  rejectAttributionIfPresent,
  stripAttributionFields,
} from './lead.access';

describe('Phase 2A lead access', () => {
  const sales = { id: 'sales-1', role: Role.SALES };
  const admin = { id: 'admin-1', role: Role.ADMIN };

  it('scopes Sales to own assignee and Admin to all', () => {
    expect(canViewAllLeads(Role.SALES)).toBe(false);
    expect(canViewAllLeads(Role.ADMIN)).toBe(true);
    expect(leadAssigneeScope(sales)).toEqual({ assignedUserId: 'sales-1' });
    expect(leadAssigneeScope(admin)).toEqual({});
  });

  it('denies Sales assign and attribution edits', () => {
    expect(canAssignLeads(Role.SALES)).toBe(false);
    expect(canEditAttribution(Role.SALES)).toBe(false);
    expect(canAssignLeads(Role.ADMIN)).toBe(true);
    expect(() =>
      rejectAttributionIfPresent(sales, { creativeType: 'VIDEO' }),
    ).toThrow(ForbiddenException);
    expect(
      stripAttributionFields({
        firstName: 'A',
        creativeType: 'VIDEO',
        campaignId: 'x',
      }),
    ).toEqual({ firstName: 'A' });
  });

  it('hides unassigned and other Sales leads as not found', () => {
    expect(() =>
      assertCanAccessLead(sales, {
        id: 'l1',
        assignedUserId: null,
      }),
    ).toThrow(NotFoundException);
    expect(() =>
      assertCanAccessLead(sales, {
        id: 'l1',
        assignedUserId: 'other',
      }),
    ).toThrow(NotFoundException);
    expect(() =>
      assertCanAccessLead(sales, {
        id: 'l1',
        assignedUserId: 'sales-1',
      }),
    ).not.toThrow();
    expect(() =>
      assertCanAccessLead(admin, {
        id: 'l1',
        assignedUserId: null,
      }),
    ).not.toThrow();
  });

  it('restricts Sales create sources', () => {
    expect(() => assertSalesMayCreateSource(sales, 'META_LEAD_FORM')).toThrow(
      ForbiddenException,
    );
    expect(() => assertSalesMayCreateSource(sales, 'MANUAL')).not.toThrow();
    expect(() =>
      assertSalesMayCreateSource(admin, 'META_LEAD_FORM'),
    ).not.toThrow();
  });
});
