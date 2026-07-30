'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, roleLabel } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/', label: 'Today' },
  { href: '/fleet', label: 'Master Fleet' },
  { href: '/map', label: 'Live Map' },
  { href: '/clients', label: 'Clients' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/profitability', label: 'Profitability' },
  { href: '/website', label: 'Website' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/oar-logo.svg"
      alt="ownArental — Giving You Wheels"
      width={180}
      height={36}
      className={className}
      priority
    />
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="oar-topbar px-4 py-2 text-center text-xs tracking-wide md:px-8 md:text-left">
        <span className="opacity-90">Fleet Operations · Giving You Wheels</span>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-2.25rem)] max-w-7xl gap-8 px-4 py-6 md:px-8">
        <aside className="hidden w-60 shrink-0 flex-col md:flex">
          <div className="mb-8">
            <Link href="/" className="inline-block">
              <BrandMark className="h-10 w-auto" />
            </Link>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-brand-grey">
              Fleet Operations
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-brand/10 font-medium text-brand'
                      : 'text-navy/80 hover:bg-slate-200/60 hover:text-navy'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-4">
            {me.data ? (
              <div className="mb-3 text-xs text-brand-grey">
                <p className="truncate text-navy">{me.data.fullName}</p>
                <p className="mt-0.5">{roleLabel(me.data.role)}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4 md:hidden">
            <Link href="/">
              <BrandMark className="h-8 w-auto" />
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    isActivePath(pathname, link.href)
                      ? 'text-brand'
                      : 'text-navy/70'
                  }
                >
                  {link.label}
                </Link>
              ))}
              <button type="button" onClick={signOut} className="text-brand-grey">
                Sign out
              </button>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
