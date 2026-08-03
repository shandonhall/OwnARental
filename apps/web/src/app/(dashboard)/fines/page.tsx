'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, type FineImportRow } from '@/lib/api';
import { PrimaryButton, SecondaryButton } from '@/components/form';
import { useTableSort } from '@/lib/table-sort';
import { formatMoney } from '@/lib/format-money';

function money(value: string) {
  return formatMoney(value);
}

export default function FinesPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ['fines-status'],
    queryFn: () => api.getFinesStatus(),
    refetchInterval: 60_000,
  });

  const fines = useQuery({
    queryKey: ['fines'],
    queryFn: () => api.getFines({ limit: 50 }),
    refetchInterval: 60_000,
  });

  const sync = useMutation({
    mutationFn: () => api.syncFines(),
    onSuccess: async (result) => {
      setMessage(
        `Synced ${result.scanned} vehicles · imported ${result.imported} (admin fee R${result.adminFeeZar})`,
      );
      await queryClient.invalidateQueries({ queryKey: ['fines'] });
      await queryClient.invalidateQueries({ queryKey: ['fines-status'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Sync failed');
    },
  });

  const invoice = useMutation({
    mutationFn: (id: string) => api.invoiceFine(id),
    onSuccess: async () => {
      setMessage('Fine invoiced to contract ledger');
      await queryClient.invalidateQueries({ queryKey: ['fines'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Invoice failed');
    },
  });

  const rows: FineImportRow[] = useMemo(
    () => fines.data ?? [],
    [fines.data],
  );

  const accessors = useMemo(
    () => ({
      notice: (r: FineImportRow) => r.externalId,
      source: (r: FineImportRow) => r.source,
      vehicle: (r: FineImportRow) => r.registration,
      client: (r: FineImportRow) =>
        r.client ? `${r.client.lastName} ${r.client.firstName}` : '',
      amount: (r: FineImportRow) => Number(r.amount),
      status: (r: FineImportRow) => r.status,
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'status');

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-navy"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            Fines & tolls
          </h1>
          <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-300">
            Import AARTO/SANRAL notices by registration, match active
            contracts, and auto-post fine + admin handling fee to the ledger.
          </p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton
            type="button"
            onClick={() => {
              void fines.refetch();
              void status.refetch();
            }}
          >
            Refresh
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            {sync.isPending ? 'Syncing…' : 'Sync fines'}
          </PrimaryButton>
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Provider
          </p>
          <p className="mt-2 text-2xl text-navy">
            {status.data?.provider ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{status.data?.message}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Admin fee
          </p>
          <p className="mt-2 text-2xl text-navy">
            R {status.data?.adminFeeZar ?? 150}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Added per invoiced notice
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Last sync
          </p>
          <p className="mt-2 text-lg text-navy">
            {status.data?.lastSyncAt
              ? new Date(status.data.lastSyncAt).toLocaleString()
              : '—'}
          </p>
          {status.data?.lastError ? (
            <p className="mt-1 text-xs text-danger">{status.data.lastError}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Imported {status.data?.lastImported ?? 0} last run
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <tr>
              <SortTh column="notice">Notice</SortTh>
              <SortTh column="vehicle">Vehicle</SortTh>
              <SortTh column="client">Client</SortTh>
              <SortTh column="amount">Amount</SortTh>
              <SortTh column="status">Status</SortTh>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-navy">{row.externalId}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {row.source}
                    {row.description ? ` · ${row.description}` : ''}
                  </p>
                </td>
                <td className="px-4 py-3 text-navy">{row.registration}</td>
                <td className="px-4 py-3">
                  {row.client ? (
                    <Link
                      href={`/clients/${row.client.id}`}
                      className="text-brand hover:underline"
                    >
                      {row.client.firstName} {row.client.lastName}
                    </Link>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">Unmatched</span>
                  )}
                </td>
                <td className="px-4 py-3">{money(row.amount)}</td>
                <td className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {row.status}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {row.href ? (
                      <Link
                        href={row.href}
                        className="text-xs text-brand hover:underline"
                      >
                        Contract
                      </Link>
                    ) : null}
                    {row.status !== 'INVOICED' && row.contractId ? (
                      <button
                        type="button"
                        className="text-xs text-navy hover:underline"
                        disabled={invoice.isPending}
                        onClick={() => invoice.mutate(row.id)}
                      >
                        Invoice
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!fines.isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                  No imported fines yet — run Sync fines to pull notices.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
