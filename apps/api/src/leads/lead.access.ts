import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Role } from '../generated/prisma/enums';
import { hasPermission, Permission } from '../auth/permissions';
import {
  ATTRIBUTION_FIELD_KEYS,
  SALES_CREATE_SOURCES,
  type AttributionFieldKey,
  type SalesCreateSource,
} from './lead.constants';

export type LeadViewer = {
  id: string;
  role: Role;
};

export type LeadAccessRow = {
  id: string;
  assignedUserId: string | null;
  archivedAt?: Date | null;
};

export function canViewAllLeads(role: Role): boolean {
  return hasPermission(role, Permission.LEADS_ASSIGN);
}

export function canAssignLeads(role: Role): boolean {
  return hasPermission(role, Permission.LEADS_ASSIGN);
}

export function canEditAttribution(role: Role): boolean {
  return hasPermission(role, Permission.LEADS_ASSIGN);
}

export function canAccessReports(role: Role): boolean {
  return hasPermission(role, Permission.LEADS_REPORTS);
}

/** Sales list/get scope: only rows assigned to the viewer. */
export function leadAssigneeScope(
  viewer: LeadViewer,
): { assignedUserId: string } | Record<string, never> {
  if (canViewAllLeads(viewer.role)) return {};
  return { assignedUserId: viewer.id };
}

export function assertCanAccessLead(
  viewer: LeadViewer,
  lead: LeadAccessRow | null,
): asserts lead is LeadAccessRow {
  if (!lead) {
    throw new NotFoundException('Lead not found');
  }
  if (canViewAllLeads(viewer.role)) return;
  if (lead.assignedUserId !== viewer.id) {
    throw new NotFoundException('Lead not found');
  }
}

export function assertCanAssign(viewer: LeadViewer): void {
  if (!canAssignLeads(viewer.role)) {
    throw new ForbiddenException('Missing permission: LEADS_ASSIGN');
  }
}

export function isSalesCreateSource(
  source: string,
): source is SalesCreateSource {
  return (SALES_CREATE_SOURCES as readonly string[]).includes(source);
}

export function assertSalesMayCreateSource(
  viewer: LeadViewer,
  source: string,
): void {
  if (canViewAllLeads(viewer.role)) return;
  if (!isSalesCreateSource(source)) {
    throw new ForbiddenException(
      'Sales may only create MANUAL or PHONE_IN leads',
    );
  }
}

/** Strip attribution keys Sales must not mutate (server-side). */
export function stripAttributionFields<T extends Record<string, unknown>>(
  body: T,
): Omit<T, AttributionFieldKey> {
  const copy = { ...body };
  for (const key of ATTRIBUTION_FIELD_KEYS) {
    delete copy[key];
  }
  return copy;
}

export function rejectAttributionIfPresent(
  viewer: LeadViewer,
  body: Record<string, unknown>,
): void {
  if (canEditAttribution(viewer.role)) return;
  const present = ATTRIBUTION_FIELD_KEYS.filter(
    (key) => body[key] !== undefined,
  );
  if (present.length > 0) {
    throw new ForbiddenException(
      `Sales cannot edit attribution fields: ${present.join(', ')}`,
    );
  }
}
