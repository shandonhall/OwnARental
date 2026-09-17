'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api, hasPermission } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { useTableSort } from '@/lib/table-sort';

function ficaClass(status: string) {
  switch (status) {
    case 'COMPLETE':
      return 'text-success';
    case 'PARTIAL':
      return 'text-warning';
    case 'REJECTED':
      return 'text-danger';
    default:
      return 'text-slate-600 dark:text-slate-300';
  }
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });
  const canWrite = me.data
    ? hasPermission(me.data.role, Permission.CLIENTS_WRITE)
    : false;

  const query = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.getClients(search || undefined),
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const accessors = useMemo(
    () => ({
      name: (c: (typeof rows)[number]) => `${c.lastName} ${c.firstName}`,
      idNumber: (c: (typeof rows)[number]) => c.idNumber,
      phone: (c: (typeof rows)[number]) => c.phone,
      fica: (c: (typeof rows)[number]) => c.ficaStatus,
      city: (c: (typeof rows)[number]) => c.city,
      province: (c: (typeof rows)[number]) => c.province ?? '',
      vehicle: (c: (typeof rows)[number]) =>
        c.contracts[0]?.vehicle?.registration ?? '',
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'name');

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
            Clients
          </h1>
          <p className="mt-1 text-brand-grey">
            Renter profiles, FICA status, and linked vehicles — click any
            column to sort.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/clients/new"
            className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
          >
            Add client
          </Link>
        ) : null}
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, ID number, or phone"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-teal-400/50 md:w-80 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey dark:border-slate-700">
            <tr>
              <SortTh column="name">Client</SortTh>
              <SortTh column="idNumber">ID number</SortTh>
              <SortTh column="phone">Phone</SortTh>
              <SortTh column="fica">FICA</SortTh>
              <SortTh column="city">City</SortTh>
              <SortTh column="province">Province</SortTh>
              <SortTh column="vehicle">Vehicle</SortTh>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-brand-grey">
                  Loading clients…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-danger">
                  Could not load clients. Is the API running on port 3001?
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-brand-grey">
                  No clients yet.{' '}
                  {canWrite ? (
                    <Link
                      href="/clients/new"
                      className="text-brand hover:underline"
                    >
                      Add the first client
                    </Link>
                  ) : (
                    'Ask an administrator if you need write access.'
                  )}
                  {canWrite ? '.' : ''}
                </td>
              </tr>
            )}
            {sorted.map((client) => {
              const vehicle = client.contracts[0]?.vehicle;
              return (
                <tr
                  key={client.id}
                  className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-navy hover:text-brand"
                    >
                      {client.firstName} {client.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                    {client.idNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {client.phone}
                  </td>
                  <td className={`px-4 py-3 ${ficaClass(client.ficaStatus)}`}>
                    {client.ficaStatus}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {client.city}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {client.province ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {vehicle
                      ? `${vehicle.make} ${vehicle.model} · ${vehicle.registration}`
                      : '—'}
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
