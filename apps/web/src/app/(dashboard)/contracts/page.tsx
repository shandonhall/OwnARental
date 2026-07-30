'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ContractStatus } from '@/lib/api';

const STATUS_FILTERS: Array<{ value: ContractStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARREARS', label: 'Arrears' },
  { value: 'COMPLETED', label: 'Completed' },
];

function money(value: string | number) {
  return `R ${Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ContractsPage() {
  const [status, setStatus] = useState<ContractStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['contracts', status, search],
    queryFn: () =>
      api.getContracts({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
      }),
  });

  const rows = Array.isArray(query.data) ? query.data : [];

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl text-navy">Contracts</h1>
          <p className="mt-1 text-brand-grey">
            Rent-to-own terms, outstanding balances, and term progress.
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
        >
          New contract
        </Link>
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
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search client or registration"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-teal-400/50 md:w-72"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  Loading contracts…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-danger">
                  Could not load contracts.
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  No contracts yet.{' '}
                  <Link
                    href="/contracts/new"
                    className="text-brand hover:underline"
                  >
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            )}
            {rows.map((contract) => (
              <tr
                key={contract.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="text-navy hover:text-brand"
                  >
                    {contract.client.firstName} {contract.client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {contract.vehicle.registration}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {contract.planType.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 text-slate-600">{contract.status}</td>
                <td className="px-4 py-3">
                  <div className="min-w-28">
                    <div className="mb-1 flex justify-between text-xs text-brand-grey">
                      <span>{contract.termProgress.percent}%</span>
                      <span>
                        {contract.termProgress.daysRemaining}d left
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${contract.termProgress.percent}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-navy/90">
                  {money(contract.outstandingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
