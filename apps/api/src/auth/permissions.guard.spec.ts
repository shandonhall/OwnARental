import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from './permissions';
import { Role } from '../generated/prisma/enums';
import type { User } from '../generated/prisma/client';

function mockContext(
  user: User | undefined,
  required: Permission[] | undefined,
) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  const guard = new PermissionsGuard(reflector);
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  };
  return { guard, context };
}

function user(role: Role): User {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'staff@example.com',
    fullName: 'Staff',
    role,
    isActive: true,
  } as User;
}

describe('PermissionsGuard', () => {
  it('allows when no permissions are required', () => {
    const { guard, context } = mockContext(user(Role.SALES), undefined);
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('returns 403-style ForbiddenException for unauthorised roles', () => {
    const { guard, context } = mockContext(user(Role.SALES), [
      Permission.FINANCE_READ,
    ]);
    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(context as never)).toThrow(
      /Insufficient permissions/,
    );
  });

  it('allows FINANCE on finance endpoints', () => {
    const { guard, context } = mockContext(user(Role.FINANCE), [
      Permission.FINANCE_READ,
    ]);
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('denies FINANCE immobilisation', () => {
    const { guard, context } = mockContext(user(Role.FINANCE), [
      Permission.TELEMATICS_IMMOBILIZE,
    ]);
    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
  });

  it('denies FLEET_MANAGER user management', () => {
    const { guard, context } = mockContext(user(Role.FLEET_MANAGER), [
      Permission.USERS_MANAGE,
    ]);
    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
  });

  it('allows SUPER_ADMIN immobilisation', () => {
    const { guard, context } = mockContext(user(Role.SUPER_ADMIN), [
      Permission.TELEMATICS_IMMOBILIZE,
    ]);
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('allows ADMIN ordinary finance ops', () => {
    const { guard, context } = mockContext(user(Role.ADMIN), [
      Permission.FINANCE_WRITE,
    ]);
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('allows FLEET_MANAGER fleet read', () => {
    const { guard, context } = mockContext(user(Role.FLEET_MANAGER), [
      Permission.FLEET_READ,
    ]);
    expect(guard.canActivate(context as never)).toBe(true);
  });
});
