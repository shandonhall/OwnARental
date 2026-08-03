'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-slate-500 focus:border-brand';

function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
      } else {
        setError(
          'Reset link is missing or expired. Request a new forgot-password email.',
        );
      }
      setChecking(false);
    }

    void checkSession();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirmation do not match.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setMessage('Password updated. You can sign in with your new password.');
    setLoading(false);
    setTimeout(() => {
      router.replace('/login');
      router.refresh();
    }, 1200);
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
            <p className="mt-3 text-sm text-slate-600">
              Choose a new password for your account
            </p>
          </div>

          {checking ? (
            <p className="text-sm text-slate-600">Checking reset link…</p>
          ) : null}

          {!checking && ready ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  New password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                  placeholder="At least 8 characters"
                  minLength={8}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  Confirm new password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClass}
                  placeholder="Repeat new password"
                  minLength={8}
                />
              </label>

              {error ? <p className="text-sm text-danger">{error}</p> : null}
              {message ? <p className="text-sm text-success">{message}</p> : null}

              <button
                type="submit"
                disabled={loading || Boolean(message)}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#13729a] disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          ) : null}

          {!checking && !ready ? (
            <div className="space-y-4">
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Link
                href="/login"
                className="inline-flex text-sm text-brand hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-slate-600">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
