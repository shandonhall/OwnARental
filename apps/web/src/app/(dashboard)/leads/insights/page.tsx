'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type LeadCreativeReportBucket } from '@/lib/api';
import { useTableSort } from '@/lib/table-sort';
import { Field, TextInput } from '@/components/form';

function pct(value: number | null) {
  if (value == null) return '—';
  return `${Math.round(value * 1000) / 10}%`;
}

function hours(value: number | null) {
  if (value == null) return '—';
  return value.toFixed(1);
}

export default function LeadInsightsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useQuery({
    queryKey: ['lead-creative-report', from, to],
    queryFn: () =>
      api.getLeadCreativeReport({
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const rows = useMemo(
    () => (Array.isArray(query.data?.buckets) ? query.data.buckets : []),
    [query.data?.buckets],
  );

  const accessors = useMemo(
    () => ({
      creativeType: (row: LeadCreativeReportBucket) => row.creativeType,
      rawLeads: (row: LeadCreativeReportBucket) => row.rawLeads,
      unassessed: (row: LeadCreativeReportBucket) => row.unassessed,
      qualified: (row: LeadCreativeReportBucket) => row.qualified,
      unqualified: (row: LeadCreativeReportBucket) => row.unqualified,
      rate: (row: LeadCreativeReportBucket) =>
        row.assessedQualificationRate ?? -1,
      applicationSubmitted: (row: LeadCreativeReportBucket) =>
        row.applicationSubmitted,
      approved: (row: LeadCreativeReportBucket) => row.approved,
      closedWon: (row: LeadCreativeReportBucket) => row.closedWon,
      closedLost: (row: LeadCreativeReportBucket) => row.closedLost,
      attempt: (row: LeadCreativeReportBucket) =>
        row.medianFirstAttemptHours ?? -1,
      contact: (row: LeadCreativeReportBucket) =>
        row.medianFirstContactHours ?? -1,
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'creativeType');

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/leads" className="text-sm text-brand hover:underline">
            ← Leads
          </Link>
          <h1 className="mt-2 text-3xl text-navy">
            {query.data?.label ?? 'Lead & Funnel Performance'}
          </h1>
          <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-300">
            {query.data?.note ??
              'Internal quality and handling metrics only — no advertising spend / CPL.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
        <Field label="From">
          <TextInput
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="To">
          <TextInput
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Creative type roll-up (VIDEO / GRAPHIC / UNKNOWN). Spend and cost-per-lead
        are intentionally excluded.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600 dark:border-slate-700">
            <tr>
              <SortTh column="creativeType">Creative</SortTh>
              <SortTh column="rawLeads" align="right">
                Leads
              </SortTh>
              <SortTh column="unassessed" align="right">
                Unassessed
              </SortTh>
              <SortTh column="qualified" align="right">
                Qualified
              </SortTh>
              <SortTh column="unqualified" align="right">
                Unqualified
              </SortTh>
              <SortTh column="rate" align="right">
                Qual. rate
              </SortTh>
              <SortTh column="applicationSubmitted" align="right">
                Applications
              </SortTh>
              <SortTh column="approved" align="right">
                Approved
              </SortTh>
              <SortTh column="closedWon" align="right">
                Won
              </SortTh>
              <SortTh column="closedLost" align="right">
                Lost
              </SortTh>
              <SortTh column="attempt" align="right">
                Med. attempt (h)
              </SortTh>
              <SortTh column="contact" align="right">
                Med. contact (h)
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-slate-600">
                  Loading report…
                </td>
              </tr>
            ) : null}
            {query.isError ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-danger">
                  Could not load creative report.
                </td>
              </tr>
            ) : null}
            {!query.isLoading && sorted.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-slate-600">
                  No lead data for this period.
                </td>
              </tr>
            ) : null}
            {sorted.map((row) => (
              <tr
                key={row.creativeType}
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <td className="px-4 py-3 font-medium text-navy">
                  {row.creativeType}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.rawLeads}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.unassessed}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.qualified}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.unqualified}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {pct(row.assessedQualificationRate)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.applicationSubmitted}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.approved}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.closedWon}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.closedLost}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {hours(row.medianFirstAttemptHours)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {hours(row.medianFirstContactHours)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
