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

export default function FleetPage() {
  const [status, setStatus] = useState<VehicleStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['vehicles', status, search],
    queryFn: () =>
      api.getVehicles({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
      }),
  });

  const rows = useMemo(() => {
    return Array.isArray(query.data) ? query.data : [];
  }, [query.data]);

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
            Filter by status (New, Arrears, Paid Up) and search registration or
            VIN. Plan/progress columns unlock in Phase 2 with contracts.
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
          placeholder="Search make, reg, or VIN"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-teal-400/50 md:w-72"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey">
            <tr>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Registration</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Odometer</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  Loading fleet…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-danger">
                  Could not load fleet. Is the API running on port 3001?
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
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
                  className="border-b border-slate-100 hover:bg-slate-50"
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
                  <td className="px-4 py-3 text-slate-600">
                    {contract?.planType?.replace('_', ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
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
                  <td className="px-4 py-3 text-slate-600">
                    {(vehicle.currentOdometerKm ?? 0).toLocaleString()} km
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
