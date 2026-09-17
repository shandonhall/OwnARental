import { SetMetadata } from '@nestjs/common';
import type { Permission } from './permissions';

export const PERMISSIONS_KEY = 'permissions';

/** Require the authenticated user to hold all listed permissions. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
