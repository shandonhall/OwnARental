'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.session?.access_token) {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          },
        );
      } catch {
        // Profile sync can retry later via /auth/me
      }
    }

    const next = searchParams.get('next') || '/';
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="oar-topbar px-4 py-2 text-center text-xs tracking-wide">
        011 477 6222 · sales@ownarental.co.za
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <Image
              src="/brand/oar-logo.svg"
              alt="ownArental — Giving You Wheels"
              width={220}
              height={44}
              className="mx-auto h-12 w-auto"
              priority
            />
            <p className="mt-3 text-sm text-brand-grey">
              Fleet operations login — Admin and User access
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-brand-grey">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-brand"
                placeholder="you@ownarental.co.za"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-brand-grey">
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-brand"
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#13729a] disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-brand-grey">
            Staff accounts are managed in Supabase Auth with roles in the users
            table.
          </p>
        </div>
      </div>
    </div>
  );
}
