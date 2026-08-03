'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, isAdminRole } from '@/lib/api';
import { PrimaryButton, SecondaryButton } from '@/components/form';

export default function AutomationPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });

  const status = useQuery({
    queryKey: ['ghl-status'],
    queryFn: () => api.getGhlStatus(),
    refetchInterval: 60_000,
  });

  const runComms = useMutation({
    mutationFn: () => api.runGhlComms(),
    onSuccess: async (result) => {
      setMessage(
        result.status.lastError
          ? `Comms run finished with warning: ${result.status.lastError}`
          : `Comms run finished via ${result.status.provider} provider`,
      );
      await queryClient.invalidateQueries({ queryKey: ['ghl-status'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Comms run failed');
    },
  });

  const data = status.data;
  const canRun = me.data ? isAdminRole(me.data.role) : false;
  const intervalMins =
    data?.intervalMs != null ? Math.round(data.intervalMs / 60_000) : null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-navy"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            Automation
          </h1>
          <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-300">
            GoHighLevel routes WhatsApp/SMS for payment reminders, rule
            breaches, low driver scores, and end-of-term opportunities. Remote
            immobilization still requires Super Admin in the fleet UI.
          </p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton
            type="button"
            onClick={() => status.refetch()}
            disabled={status.isFetching}
          >
            Refresh
          </SecondaryButton>
          {canRun ? (
            <PrimaryButton
              type="button"
              disabled={runComms.isPending}
              onClick={() => runComms.mutate()}
            >
              {runComms.isPending ? 'Running…' : 'Run payment / term scan'}
            </PrimaryButton>
          ) : null}
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {status.isError ? (
        <p className="text-danger">Could not load GHL status.</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Provider
          </p>
          <p className="mt-2 text-2xl text-navy">{data?.provider ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{data?.message}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Auto-comms
          </p>
          <p className="mt-2 text-2xl text-navy">
            {data?.autoEnabled ? 'On' : 'Off'}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {intervalMins != null ? `Every ${intervalMins} min` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Webhooks
          </p>
          <p className="mt-2 text-2xl text-navy">
            {data?.webhookConfigured ? 'Configured' : 'Default / mock'}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Last event {data?.lastEvent ?? 'none'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Last run
          </p>
          <p className="mt-2 text-lg text-navy">
            {data?.lastEventAt
              ? new Date(data.lastEventAt).toLocaleString()
              : '—'}
          </p>
          {data?.lastError ? (
            <p className="mt-1 text-xs text-danger">{data.lastError}</p>
          ) : (
            <p className="mt-1 text-xs text-success">Healthy</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-5">
        <h2 className="text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Workflow events
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-navy sm:grid-cols-2">
          <li>MISSED_PAYMENT / LATE_PAYMENT — billing notices</li>
          <li>RULE_BREACH / SPEEDING / GEOFENCE_EXIT — driving alerts</li>
          <li>LOW_DRIVER_SCORE — first drop below 65</li>
          <li>END_OF_TERM — GHL opportunity in final 90 days</li>
          <li>IMMOBILIZE_RECOMMENDED — high-risk geofence + arrears</li>
          <li>IMMOBILIZED / MOBILIZED — after Super Admin action</li>
        </ul>
      </div>
    </section>
  );
}
