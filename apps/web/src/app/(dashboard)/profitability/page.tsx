'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney, moneyCellClass } from '@/lib/format-money';
import { useTableSort } from '@/lib/table-sort';

function money(value: string | number) {
  return formatMoney(value);
}

type FinancePreset = 'lifetime' | 'month' | 'quarter' | 'year' | 'custom';

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Full calendar period (not month-to-date) so expected income covers the whole month. */
function financeRange(preset: FinancePreset): { from?: string; to?: string } {
  if (preset === 'lifetime' || preset === 'custom') return {};
  const now = new Date();
  if (preset === 'month') {
    return {
      from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toInputDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (preset === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return {
      from: toInputDate(new Date(now.getFullYear(), q, 1)),
      to: toInputDate(new Date(now.getFullYear(), q + 3, 0)),
    };
  }
  return {
    from: toInputDate(new Date(now.getFullYear(), 0, 1)),
    to: toInputDate(new Date(now.getFullYear(), 11, 31)),
  };
}

export default function ProfitabilityPage() {
  const [preset, setPreset] = useState<FinancePreset>('lifetime');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = useMemo(() => {
    if (preset === 'custom') {
      return { from: from || undefined, to: to || undefined };
    }
    return financeRange(preset);
  }, [preset, from, to]);

  const query = useQuery({
    queryKey: ['profitability', params.from ?? '', params.to ?? ''],
    queryFn: () => api.getProfitability(params),
  });

  const rows = useMemo(
    () => (Array.isArray(query.data) ? query.data : []),
    [query.data],
  );

  const periodMode = rows[0]?.mode === 'period' || Boolean(params.from || params.to);

  const totals = useMemo(() => {
    const received = rows.reduce((sum, r) => sum + Number(r.rentalIncome), 0);
    const owed = rows.reduce(
      (sum, r) => sum + Number(r.outstandingIncome ?? 0),
      0,
    );
    const expected = rows.reduce(
      (sum, r) => sum + Number(r.expectedIncome ?? r.rentalIncome),
      0,
    );
    const costs = rows.reduce((sum, r) => sum + Number(r.totalCost), 0);
    const realised = rows.reduce((sum, r) => sum + Number(r.profit), 0);
    const forecast = expected - costs;
    return { received, owed, expected, costs, realised, forecast };
  }, [rows]);

  const accessors = useMemo(
    () => ({
      vehicle: (r: (typeof rows)[number]) =>
        `${r.year} ${r.make} ${r.model} ${r.registration}`,
      registration: (r: (typeof rows)[number]) => r.registration,
      status: (r: (typeof rows)[number]) => r.status,
      purchase: (r: (typeof rows)[number]) => Number(r.purchasePrice),
      costs: (r: (typeof rows)[number]) => Number(r.totalCost),
      income: (r: (typeof rows)[number]) => Number(r.rentalIncome),
      owed: (r: (typeof rows)[number]) => Number(r.outstandingIncome ?? 0),
      expected: (r: (typeof rows)[number]) =>
        Number(r.expectedIncome ?? r.rentalIncome),
      profit: (r: (typeof rows)[number]) => Number(r.profit),
      roi: (r: (typeof rows)[number]) =>
        r.roiPercent != null ? Number(r.roiPercent) : null,
      contracts: (r: (typeof rows)[number]) => r.contractCount,
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'owed', 'desc');

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl text-navy">Asset profitability</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {periodMode
              ? 'Period operating view — income and costs in range; purchase excluded from profit.'
              : 'Compare purchase price and maintenance costs against rental income.'}{' '}
            Still owed shows unpaid client payments. Click any column to sort.
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

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Period
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['lifetime', 'Lifetime'],
                ['month', 'This month'],
                ['quarter', 'This quarter'],
                ['year', 'This year'],
                ['custom', 'Custom'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreset(id)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  preset === id
                    ? 'bg-brand/15 text-brand'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {preset === 'custom' ? (
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-slate-600 dark:text-slate-300">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-navy dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-navy dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
        ) : null}
      </div>

      {!query.isLoading && totals.expected > 0 ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Expected income
              </p>
              <p className="mt-1 text-sm text-navy">
                {money(totals.expected)} scheduled · {money(totals.owed)} still
                owed
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {Math.round((totals.received / totals.expected) * 100)}% collected
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="flex h-full w-full">
              <div
                className="h-full bg-success"
                style={{
                  width: `${Math.min(
                    100,
                    (totals.received / totals.expected) * 100,
                  )}%`,
                }}
              />
              <div
                className="h-full bg-danger/80"
                style={{
                  width: `${Math.min(
                    100,
                    (totals.owed / totals.expected) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span>
              Realised profit{' '}
              <span className="text-navy">{money(totals.realised)}</span>
            </span>
            <span>
              Forecast profit (if settled){' '}
              <span className="text-navy">{money(totals.forecast)}</span>
            </span>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <tr>
              <SortTh column="vehicle">Vehicle</SortTh>
              <SortTh column="registration">Registration</SortTh>
              <SortTh column="status">Status</SortTh>
              <SortTh column="purchase" align="right">
                {periodMode ? 'Purchase (ref)' : 'Purchase'}
              </SortTh>
              <SortTh column="costs" align="right">
                Costs
              </SortTh>
              <SortTh column="income" align="right">
                Received
              </SortTh>
              <SortTh column="owed" align="right">
                Still owed
              </SortTh>
              <SortTh column="expected" align="right">
                Expected
              </SortTh>
              <SortTh column="profit" align="right">
                Profit
              </SortTh>
              <SortTh column="roi" align="right">
                ROI
              </SortTh>
              <SortTh column="contracts" align="right">
                Contracts
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                  Calculating profitability…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-danger">
                  Could not load profitability.
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                  No vehicles to analyse yet.
                </td>
              </tr>
            )}
            {sorted.map((row) => {
              const profit = Number(row.profit);
              const owed = Number(row.outstandingIncome ?? 0);
              return (
                <tr
                  key={row.vehicleId}
                  className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/fleet/${row.vehicleId}`}
                      className="text-navy hover:text-brand"
                    >
                      {row.year} {row.make} {row.model}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {row.registration}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.status}</td>
                  <td className={`${moneyCellClass} text-slate-700 dark:text-slate-200`}>
                    {money(row.purchasePrice)}
                  </td>
                  <td className={`${moneyCellClass} text-slate-700 dark:text-slate-200`}>
                    {money(row.totalCost)}
                  </td>
                  <td className={`${moneyCellClass} text-success`}>
                    {money(row.rentalIncome)}
                  </td>
                  <td
                    className={`${moneyCellClass} ${
                      owed > 0 ? 'text-danger' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {money(owed)}
                  </td>
                  <td className={`${moneyCellClass} text-navy/90`}>
                    {money(row.expectedIncome ?? row.rentalIncome)}
                  </td>
                  <td
                    className={`${moneyCellClass} ${
                      profit >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {money(row.profit)}
                  </td>
                  <td
                    className={`${moneyCellClass} ${
                      profit >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {row.roiPercent != null ? `${row.roiPercent}%` : '—'}
                  </td>
                  <td className={`${moneyCellClass} text-slate-700 dark:text-slate-200`}>
                    {row.contractCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
