'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, roleLabel } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { GlobalSearch } from '@/components/global-search';
import { NotificationCenter } from '@/components/notification-center';

const opsLinks = [
  { href: '/', label: 'Overview' },
  { href: '/fleet', label: 'Master Fleet' },
  { href: '/map', label: 'Live Map' },
  { href: '/clients', label: 'Clients' },
  { href: '/contracts', label: 'Contracts' },
  { href: '/pipeline', label: 'End-of-term' },
  { href: '/fines', label: 'Fines' },
  { href: '/profitability', label: 'Profitability' },
  { href: '/notifications', label: 'Alerts' },
  { href: '/automation', label: 'Automation' },
];

const demoLinks = [{ href: '/website', label: 'Website demo' }];

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

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm transition ${
        active
          ? 'bg-brand/10 font-medium text-brand'
          : 'text-navy/80 hover:bg-slate-200/60 hover:text-navy dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('oar-theme');
    const initial =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('oar-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

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

  const allLinks = [...opsLinks, ...demoLinks];

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
            <p className="mb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-brand-grey">
              Operations
            </p>
            {opsLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                pathname={pathname}
              />
            ))}
            <p className="mb-1 mt-4 px-3 text-[10px] uppercase tracking-[0.18em] text-brand-grey">
              Pitch / demo
            </p>
            {demoLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                pathname={pathname}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            {me.data ? (
              <div className="mb-3 text-xs text-brand-grey">
                <p className="truncate text-navy">{me.data.fullName}</p>
                <p className="mt-0.5">{roleLabel(me.data.role)}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full rounded-md border border-slate-200 bg-surface px-3 py-2 text-left text-sm text-navy hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-md border border-slate-200 bg-surface px-3 py-2 text-left text-sm text-navy hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 md:hidden">
              <Link href="/">
                <BrandMark className="h-8 w-auto" />
              </Link>
              <div className="flex items-center gap-2">
                <NotificationCenter />
                <button
                  type="button"
                  onClick={signOut}
                  className="text-sm text-brand-grey"
                >
                  Sign out
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <GlobalSearch className="min-w-0 flex-1" />
              <div className="hidden shrink-0 md:block">
                <NotificationCenter />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm md:hidden">
              {allLinks.map((link) => (
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
              <button
                type="button"
                onClick={toggleTheme}
                className="text-brand-grey"
              >
                Theme
              </button>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
