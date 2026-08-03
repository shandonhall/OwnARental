'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'change' | 'forgot';

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-slate-500 focus:border-brand';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(urlError);
  }, [searchParams]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function onSignIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

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

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      setLoading(false);
      return;
    }

    if (newPassword === password) {
      setError('New password must be different from the current password.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('Password updated. Sign in with your new password.');
    setMode('signin');
    setLoading(false);
  }

  async function onForgotPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/login/reset`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage(
      'If that email is registered, a reset link is on its way. Check your inbox.',
    );
    setLoading(false);
  }

  const subtitle =
    mode === 'signin'
      ? 'Fleet operations login — Admin and User access'
      : mode === 'change'
        ? 'Change your password — confirm with your current login'
        : 'Forgot password — we will email you a reset link';

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
            <p className="mt-3 text-sm text-slate-600">{subtitle}</p>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={onSignIn} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  placeholder="you@ownarental.co.za"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  Password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </label>

              {error ? <p className="text-sm text-danger">{error}</p> : null}
              {message ? <p className="text-sm text-success">{message}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#13729a] disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : null}

          {mode === 'change' ? (
            <form onSubmit={onChangePassword} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  placeholder="you@ownarental.co.za"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  Current password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  New password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#13729a] disabled:opacity-50"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <form onSubmit={onForgotPassword} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-600">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  placeholder="you@ownarental.co.za"
                />
              </label>

              {error ? <p className="text-sm text-danger">{error}</p> : null}
              {message ? <p className="text-sm text-success">{message}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#13729a] disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
            {mode === 'signin' ? (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-brand hover:underline"
                >
                  Forgot password
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('change')}
                  className="text-sm text-brand hover:underline"
                >
                  Change password
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-sm text-brand hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-600">
            Staff accounts are managed in Supabase Auth with roles in the users
            table.
          </p>
        </div>
      </div>
    </div>
  );
}
