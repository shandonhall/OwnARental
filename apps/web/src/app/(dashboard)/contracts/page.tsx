'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, ContractStatus, hasPermission } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { formatMoney, moneyCellClass } from '@/lib/format-money';
import { useTableSort } from '@/lib/table-sort';

const STATUS_FILTERS: Array<{ value: ContractStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARREARS', label: 'Arrears' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ContractsPage() {
  const [status, setStatus] = useState<ContractStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });
  const canWrite = me.data
    ? hasPermission(me.data.role, Permission.CONTRACTS_WRITE)
    : false;
  const canSeeFinance = me.data
    ? hasPermission(me.data.role, Permission.CONTRACTS_FINANCE_READ)
    : false;

  const query = useQuery({
    queryKey: ['contracts', status, search],
    queryFn: () =>
      api.getContracts({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
      }),
  });

  const rows = useMemo(
    () => (Array.isArray(query.data) ? query.data : []),
    [query.data],
  );

  const accessors = useMemo(
    () => ({
      agreement: (c: (typeof rows)[number]) => c.agreementNumber ?? '',
      client: (c: (typeof rows)[number]) =>
        `${c.client.lastName} ${c.client.firstName}`,
      vehicle: (c: (typeof rows)[number]) => c.vehicle.registration,
      plan: (c: (typeof rows)[number]) => c.planType,
      status: (c: (typeof rows)[number]) => c.status,
      monthly: (c: (typeof rows)[number]) => Number(c.monthlyRate),
      progress: (c: (typeof rows)[number]) => c.termProgress.percent,
      daysLeft: (c: (typeof rows)[number]) => c.termProgress.daysRemaining,
      monthOwed: (c: (typeof rows)[number]) => Number(c.monthOwed ?? 0),
      outstandingEx: (c: (typeof rows)[number]) =>
        Number(c.outstandingExBalloon ?? c.outstandingBalance),
      balloon: (c: (typeof rows)[number]) => Number(c.balloonOutstanding ?? 0),
      outstanding: (c: (typeof rows)[number]) => Number(c.outstandingBalance),
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'monthOwed', 'desc');

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl text-navy">Contracts</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Rent-to-own terms, monthly amounts due, and outstanding balances
            with / without balloon.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/contracts/new"
            className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
          >
            New contract
          </Link>
        ) : null}
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(item.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                status === item.value
                  ? 'bg-brand/15 text-brand'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search agreement #, client, or registration"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy outline-none placeholder:text-slate-500 focus:border-teal-400/50 md:w-72 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-400"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600 dark:text-slate-300 dark:border-slate-700">
            <tr>
              <SortTh column="agreement">Agreement #</SortTh>
              <SortTh column="client">Client</SortTh>
              <SortTh column="vehicle">Vehicle</SortTh>
              <SortTh column="plan">Plan</SortTh>
              <SortTh column="status">Status</SortTh>
              <SortTh column="monthly" align="right">
                All-In monthly
              </SortTh>
              <SortTh column="progress">Progress</SortTh>
              <SortTh column="daysLeft" align="right">
                Days left
              </SortTh>
              <SortTh column="monthOwed" align="right">
                Month owed
              </SortTh>
              <SortTh column="outstandingEx" align="right">
                Outstanding (ex balloon)
              </SortTh>
              <SortTh column="balloon" align="right">
                Balloon
              </SortTh>
              <SortTh column="outstanding" align="right">
                Outstanding (incl.)
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                  Loading contracts…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-danger">
                  Could not load contracts.
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && sorted.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                  No contracts yet.
                  {canWrite ? (
                    <>
                      {' '}
                      <Link
                        href="/contracts/new"
                        className="text-brand hover:underline"
                      >
                        Create one
                      </Link>
                      .
                    </>
                  ) : null}
                </td>
              </tr>
            )}
            {sorted.map((contract) => {
              const monthOwed = Number(contract.monthOwed ?? 0);
              const balloonOwed = Number(contract.balloonOutstanding ?? 0);
              const hasBalloon = Boolean(
                contract.hasBalloon ?? Number(contract.balloonAmount ?? 0) > 0,
              );
              return (
                <tr
                  key={contract.id}
                  className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {contract.agreementNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="text-navy hover:text-brand"
                    >
                      {contract.client.firstName} {contract.client.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {contract.vehicle.registration}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {contract.planType.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {contract.status}
                  </td>
                  <td className={`${moneyCellClass} text-navy`}>
                    {canSeeFinance || !contract.financeRestricted
                      ? formatMoney(contract.monthlyRate)
                      : 'Restricted'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-28">
                      <div className="mb-1 flex justify-between text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        <span>{contract.termProgress.percent.toFixed(1)}%</span>
                        <span>
                          {contract.termProgress.daysRemaining.toLocaleString(
                            'en-ZA',
                          )}
                          d
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${contract.termProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td
                    className={`${moneyCellClass} text-slate-700 dark:text-slate-200`}
                  >
                    {contract.termProgress.daysRemaining.toLocaleString('en-ZA')}
                  </td>
                  <td
                    className={`${moneyCellClass} ${
                      monthOwed > 0
                        ? 'text-danger'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {monthOwed > 0 ? formatMoney(monthOwed) : '—'}
                  </td>
                  <td className={`${moneyCellClass} text-navy`}>
                    {formatMoney(
                      contract.outstandingExBalloon ??
                        contract.outstandingBalance,
                    )}
                  </td>
                  <td
                    className={`${moneyCellClass} ${
                      balloonOwed > 0
                        ? 'text-warning'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {hasBalloon
                      ? balloonOwed > 0
                        ? formatMoney(balloonOwed)
                        : contract.balloonPaid
                          ? 'Paid'
                          : formatMoney(0)
                      : '—'}
                  </td>
                  <td className={`${moneyCellClass} text-navy`}>
                    <span>{formatMoney(contract.outstandingBalance)}</span>
                    {hasBalloon ? (
                      <span className="ml-1 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        (incl.)
                      </span>
                    ) : null}
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
