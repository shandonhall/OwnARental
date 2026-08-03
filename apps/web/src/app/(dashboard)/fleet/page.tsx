'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, statusLabel, VehicleStatus } from '@/lib/api';

const STATUS_FILTERS: Array<{ value: VehicleStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'AVAILABLE', label: 'New / Available' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARREARS', label: 'Arrears' },
  { value: 'PAID_UP', label: 'Paid Up' },
];

function statusClass(status: string) {
  switch (status) {
    case 'ACTIVE':
    case 'PAID_UP':
      return 'text-success';
    case 'ARREARS':
      return 'text-danger';
    case 'AVAILABLE':
      return 'text-brand';
    default:
      return 'text-warning';
  }
}

type SortKey =
  | 'vehicle'
  | 'registration'
  | 'status'
  | 'plan'
  | 'client'
  | 'city'
  | 'odometer'
  | 'score';

export default function FleetPage() {
  const [status, setStatus] = useState<VehicleStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const query = useQuery({
    queryKey: ['vehicles', status, search],
    queryFn: () =>
      api.getVehicles({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
      }),
  });

  const rows = useMemo(() => {
    const list = Array.isArray(query.data) ? [...query.data] : [];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const ac = a.contracts?.[0];
      const bc = b.contracts?.[0];
      const av =
        sortKey === 'vehicle'
          ? `${a.make} ${a.model}`
          : sortKey === 'registration'
            ? a.registration
            : sortKey === 'status'
              ? a.status
              : sortKey === 'plan'
                ? ac?.planType ?? ''
                : sortKey === 'client'
                  ? `${ac?.client?.lastName ?? ''} ${ac?.client?.firstName ?? ''}`
                  : sortKey === 'city'
                    ? ac?.client?.city ?? ''
                    : sortKey === 'odometer'
                      ? a.currentOdometerKm
                      : a.driverScore ?? -1;
      const bv =
        sortKey === 'vehicle'
          ? `${b.make} ${b.model}`
          : sortKey === 'registration'
            ? b.registration
            : sortKey === 'status'
              ? b.status
              : sortKey === 'plan'
                ? bc?.planType ?? ''
                : sortKey === 'client'
                  ? `${bc?.client?.lastName ?? ''} ${bc?.client?.firstName ?? ''}`
                  : sortKey === 'city'
                    ? bc?.client?.city ?? ''
                    : sortKey === 'odometer'
                      ? b.currentOdometerKm
                      : b.driverScore ?? -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return list;
  }, [query.data, sortDir, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function label(key: SortKey, text: string) {
    if (sortKey !== key) return text;
    return `${text} ${sortDir === 'asc' ? '↑' : '↓'}`;
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl text-navy"
            style={{
              fontFamily: 'var(--font-display), ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Master Fleet
          </h1>
          <p className="mt-1 text-brand-grey">
            Stock list with sortable columns — including client city for area
            targeting.
          </p>
        </div>
        <Link
          href="/fleet/new"
          className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
        >
          Add vehicle
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
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
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
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-teal-400/50 md:w-72 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('vehicle')}>
                  {label('vehicle', 'Vehicle')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('registration')}>
                  {label('registration', 'Registration')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('status')}>
                  {label('status', 'Status')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('plan')}>
                  {label('plan', 'Plan')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('client')}>
                  {label('client', 'Client')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('city')}>
                  {label('city', 'City')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('odometer')}>
                  {label('odometer', 'Odometer')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleSort('score')}>
                  {label('score', 'Score')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-brand-grey">
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
            {!query.isLoading && !query.isError && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-brand-grey">
                  No vehicles yet.{' '}
                  <Link href="/fleet/new" className="text-brand hover:underline">
                    Add the first vehicle
                  </Link>
                  .
                </td>
              </tr>
            )}
            {rows.map((vehicle) => {
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
