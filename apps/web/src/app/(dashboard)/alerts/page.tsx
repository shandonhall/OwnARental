'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  alertCategory,
  api,
  type DashboardAlert,
} from '@/lib/api';
import { useTableSort } from '@/lib/table-sort';

type AlertTab = 'all' | 'internal' | 'driver';

const TABS: Array<{ id: AlertTab; label: string; hint: string }> = [
  { id: 'all', label: 'All', hint: 'Everything needing attention' },
  {
    id: 'internal',
    label: 'Internal',
    hint: 'Payments, arrears, fines, service',
  },
  {
    id: 'driver',
    label: 'Driver',
    hint: 'Behaviour / telematics rule breaches',
  },
];

export default function AlertsPage() {
  const [tab, setTab] = useState<AlertTab>('all');

  const query = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: 15 * 60_000,
  });

  const attention = useMemo(
    () => query.data?.attention ?? [],
    [query.data?.attention],
  );

  const filtered = useMemo(() => {
    if (tab === 'all') return attention;
    return attention.filter((item) => alertCategory(item.kind) === tab);
  }, [attention, tab]);

  const accessors = useMemo(
    () => ({
      client: (item: DashboardAlert) =>
        item.client
          ? `${item.client.lastName} ${item.client.firstName}`
          : '',
      vehicle: (item: DashboardAlert) => item.vehicle?.registration ?? '',
      kind: (item: DashboardAlert) => item.kind,
      category: (item: DashboardAlert) => alertCategory(item.kind),
      detail: (item: DashboardAlert) => item.detail,
      amount: (item: DashboardAlert) =>
        item.amount != null ? Number(item.amount) : null,
      severity: (item: DashboardAlert) => item.severity,
      date: (item: DashboardAlert) =>
        item.date ? new Date(item.date) : null,
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(filtered, accessors, 'severity');

  const counts = useMemo(() => {
    let internal = 0;
    let driver = 0;
    for (const item of attention) {
      if (alertCategory(item.kind) === 'driver') driver += 1;
      else internal += 1;
    }
    return { all: attention.length, internal, driver };
  }, [attention]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl text-navy">Alerts</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Internal management alerts vs driver behaviour — sorted and
            filterable.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-navy hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`border-b-2 px-3 py-2 text-sm ${
              tab === item.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-600 dark:text-slate-300'
            }`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {TABS.find((t) => t.id === tab)?.hint}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <tr>
              <SortTh column="category">Category</SortTh>
              <SortTh column="client">Client</SortTh>
              <SortTh column="vehicle">Vehicle</SortTh>
              <SortTh column="kind">Kind</SortTh>
              <SortTh column="detail">Detail</SortTh>
              <SortTh column="severity">Severity</SortTh>
              <SortTh column="amount">Amount</SortTh>
              <SortTh column="date">Date</SortTh>
              <th className="px-4 py-3 font-medium">Contract</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-slate-600 dark:text-slate-300"
                >
                  Loading alerts…
                </td>
              </tr>
            ) : null}
            {!query.isLoading && sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-slate-600 dark:text-slate-300"
                >
                  No alerts in this category.
                </td>
              </tr>
            ) : null}
            {sorted.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
              >
                <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-200">
                  {alertCategory(item.kind)}
                </td>
                <td className="px-4 py-3">
                  {item.client ? (
                    <Link
                      href={`/clients/${item.client.id}`}
                      className="text-navy hover:text-brand"
                    >
                      {item.client.firstName} {item.client.lastName}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                  {item.vehicle ? (
                    <Link
                      href={`/fleet/${item.vehicle.id}`}
                      className="hover:text-brand"
                    >
                      {item.vehicle.registration}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {item.kind}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {item.detail}
                </td>
                <td
                  className={`px-4 py-3 ${
                    item.severity === 'high' ? 'text-danger' : 'text-warning'
                  }`}
                >
                  {item.severity}
                </td>
                <td
                  className={`px-4 py-3 ${
                    item.severity === 'high' ? 'text-danger' : 'text-warning'
                  }`}
                >
                  {item.amount
                    ? `R ${Number(item.amount).toLocaleString('en-ZA')}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {item.date
                    ? new Date(item.date).toLocaleDateString('en-ZA')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.contractId ? (
                    <Link
                      href={`/contracts/${item.contractId}`}
                      className="text-brand hover:underline"
                    >
                      Open
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
