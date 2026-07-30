'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';

function ficaClass(status: string) {
  switch (status) {
    case 'COMPLETE':
      return 'text-success';
    case 'PARTIAL':
      return 'text-warning';
    case 'REJECTED':
      return 'text-danger';
    default:
      return 'text-slate-600';
  }
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['clients', search],
    queryFn: () => api.getClients(search || undefined),
  });

  const rows = query.data ?? [];

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
            Clients
          </h1>
          <p className="mt-1 text-brand-grey">
            Renter profiles, FICA status, and linked vehicles.
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
        >
          Add client
        </Link>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, ID number, or phone"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-teal-400/50 md:w-80"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">ID number</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">FICA</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  Loading clients…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-danger">
                  Could not load clients. Is the API running on port 3001?
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  No clients yet.{' '}
                  <Link
                    href="/clients/new"
                    className="text-brand hover:underline"
                  >
                    Add the first client
                  </Link>
                  .
                </td>
              </tr>
            )}
            {rows.map((client) => {
              const vehicle = client.contracts[0]?.vehicle;
              return (
                <tr
                  key={client.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-navy hover:text-brand"
                    >
                      {client.firstName} {client.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {client.idNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{client.phone}</td>
                  <td className={`px-4 py-3 ${ficaClass(client.ficaStatus)}`}>
                    {client.ficaStatus}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{client.city}</td>
                  <td className="px-4 py-3 text-slate-600">
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
