'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type DashboardAlert } from '@/lib/api';

export default function AlertsPage() {
  const query = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.getDashboardOverview(),
  });

  const attention = query.data?.attention ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl text-navy">Alerts</h1>
        <p className="mt-1 text-brand-grey">
          Missed payments, arrears, late payments, and pending fines — with
          client and vehicle links.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Detail</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Contract</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  Loading alerts…
                </td>
              </tr>
            ) : null}
            {!query.isLoading && attention.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  No alerts right now.
                </td>
              </tr>
            ) : null}
            {attention.map((item: DashboardAlert) => (
              <tr
                key={item.id}
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/clients/${item.client.id}`}
                    className="text-navy hover:text-brand"
                  >
                    {item.client.firstName} {item.client.lastName}
                  </Link>
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
                  {item.amount
                    ? `R ${Number(item.amount).toLocaleString('en-ZA')}`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/contracts/${item.contractId}`}
                    className="text-brand hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
