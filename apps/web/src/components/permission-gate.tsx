'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  canAccessPath,
  hasPermission,
  type Permission,
} from '@/lib/permissions';

export function AccessDenied({
  title = 'Access denied',
  detail = 'Your role does not include permission for this area.',
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <section className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-2xl text-navy">{title}</h1>
      <p className="text-sm text-brand-grey">{detail}</p>
      <Link href="/" className="inline-block text-sm text-brand hover:underline">
        Return to overview
      </Link>
    </section>
  );
}

/**
 * Blocks direct navigation only after we know the viewer's role.
 * While auth/me is loading (or briefly fails), keep rendering children so a
 * refresh never leaves a blank main panel.
 */
export function RoutePermissionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: 1,
    staleTime: 30_000,
  });

  if (me.isPending) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-grey">Loading…</p>
        <div className="opacity-40 pointer-events-none">{children}</div>
      </div>
    );
  }

  // Auth failed (API down / expired token): do not wipe the shell — pages
  // already handle their own API errors. Middleware still enforces login.
  if (me.isError || !me.data) {
    return <>{children}</>;
  }

  if (!canAccessPath(me.data.role, pathname)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

/** Hide children when the viewer lacks a specific permission. */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: 1,
    staleTime: 30_000,
  });

  if (me.isPending || me.isError || !me.data) return null;
  if (!hasPermission(me.data.role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}
