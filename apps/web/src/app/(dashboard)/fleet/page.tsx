'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, statusLabel, type VehicleStatus } from '@/lib/api';
import { useTableSort } from '@/lib/table-sort';

const STATUS_FILTERS: Array<{ value: '' | VehicleStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARREARS', label: 'Arrears' },
  { value: 'PAID_UP', label: 'Paid up' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'WRITTEN_OFF', label: 'Written off' },
];

function statusClass(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return 'text-brand';
    case 'ACTIVE':
    case 'PAID_UP':
      return 'text-success';
    case 'ARREARS':
      return 'text-danger';
    case 'RETURNED':
    case 'WRITTEN_OFF':
      return 'text-slate-600 dark:text-slate-300';
    default:
      return 'text-slate-600 dark:text-slate-300';
  }
}

export default function FleetPage() {
  const [status, setStatus] = useState<'' | VehicleStatus>('');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['fleet', status, search],
    queryFn: () =>
      api.getFleet({
        status: status || undefined,
        search: search || undefined,
      }),
    refetchInterval: 15 * 60_000,
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const accessors = useMemo(
    () => ({
      vehicle: (v: (typeof rows)[number]) =>
        `${v.year} ${v.make} ${v.model}`,
      registration: (v: (typeof rows)[number]) => v.registration,
      status: (v: (typeof rows)[number]) => v.status,
      plan: (v: (typeof rows)[number]) => v.contracts?.[0]?.planType ?? '',
      client: (v: (typeof rows)[number]) => {
        const c = v.contracts?.[0]?.client;
        return c ? `${c.lastName} ${c.firstName}` : '';
      },
      city: (v: (typeof rows)[number]) => v.contracts?.[0]?.client?.city ?? '',
      odometer: (v: (typeof rows)[number]) => v.currentOdometerKm ?? 0,
      score: (v: (typeof rows)[number]) => v.driverScore ?? -1,
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'vehicle');

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl text-navy"
            style={{
              fontFamily:
                'var(--font-display), ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Master Fleet
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Stock list with sortable columns — including client city for area
            targeting. Auto-refreshes every 15 minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-navy hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
          <Link
            href="/fleet/new"
            className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
          >
            Add vehicle
          </Link>
        </div>
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
                  : 'bg-slate-50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search make, reg, or VIN"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-teal-400/50 md:w-72 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600 dark:text-slate-300 dark:border-slate-700">
            <tr>
              <SortTh column="vehicle">Vehicle</SortTh>
              <SortTh column="registration">Registration</SortTh>
              <SortTh column="status">Status</SortTh>
              <SortTh column="plan">Plan</SortTh>
              <SortTh column="client">Client</SortTh>
              <SortTh column="city">City</SortTh>
              <SortTh column="odometer">Odometer</SortTh>
              <SortTh column="score">Score</SortTh>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                  Loading fleet…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-danger">
                  Could not load fleet. Is the API running on port 3001?
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                  {status || search
                    ? 'No vehicles match this filter.'
                    : (
                      <>
                        No vehicles yet.{' '}
                        <Link
                          href="/fleet/new"
                          className="text-brand hover:underline"
                        >
                          Add the first vehicle
                        </Link>
                        .
                      </>
                    )}
                </td>
              </tr>
            )}
            {sorted.map((vehicle) => {
              const contract = vehicle.contracts?.[0];
              return (
                <tr
                  key={vehicle.id}
                  className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/fleet/${vehicle.id}`}
                      className="text-navy hover:text-brand"
                    >
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-navy/90">
                    {vehicle.registration}
                  </td>
                  <td className={`px-4 py-3 ${statusClass(vehicle.status)}`}>
                    {statusLabel(vehicle.status)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {contract?.planType?.replace('_', ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {contract?.client ? (
                      <Link
                        href={`/clients/${contract.client.id}`}
                        className="hover:text-brand"
                      >
                        {contract.client.firstName} {contract.client.lastName}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {contract?.client?.city ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {(vehicle.currentOdometerKm ?? 0).toLocaleString()} km
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {vehicle.driverScore ?? '—'}
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
