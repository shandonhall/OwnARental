'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function money(value: string | number) {
  return `R ${Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProfitabilityPage() {
  const query = useQuery({
    queryKey: ['profitability'],
    queryFn: () => api.getProfitability(),
  });

  const rows = Array.isArray(query.data) ? query.data : [];

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-3xl text-navy">Asset profitability</h1>
        <p className="mt-1 text-brand-grey">
          Compare purchase price and maintenance costs against rental income.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey">
            <tr>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Purchase</th>
              <th className="px-4 py-3 font-medium">Costs</th>
              <th className="px-4 py-3 font-medium">Income</th>
              <th className="px-4 py-3 font-medium">Profit</th>
              <th className="px-4 py-3 font-medium">ROI</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  Calculating profitability…
                </td>
              </tr>
            )}
            {query.isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-danger">
                  Could not load profitability.
                </td>
              </tr>
            )}
            {!query.isLoading && !query.isError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-brand-grey">
                  No vehicles to analyse yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const profit = Number(row.profit);
              return (
                <tr
                  key={row.vehicleId}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/fleet/${row.vehicleId}`}
                      className="text-navy hover:text-brand"
                    >
                      {row.year} {row.make} {row.model}
                    </Link>
                    <p className="font-mono text-xs text-brand-grey">
                      {row.registration}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {money(row.purchasePrice)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {money(row.totalCost)}
                  </td>
                  <td className="px-4 py-3 text-navy/90">
                    {money(row.rentalIncome)}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      profit >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {money(row.profit)}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      profit >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {row.roiPercent}%
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
