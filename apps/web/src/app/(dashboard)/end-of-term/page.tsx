'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Contract } from '@/lib/api';
import { useTableSort } from '@/lib/table-sort';

type StageKey =
  | 'WATCH'
  | 'FINAL_90'
  | 'CONTACTED'
  | 'CLOSING'
  | 'COMPLETED';

const STAGES: Array<{ key: StageKey; label: string; hint: string }> = [
  { key: 'WATCH', label: 'Watch', hint: '6 months out' },
  { key: 'FINAL_90', label: 'Final 90 days', hint: 'Not yet contacted' },
  { key: 'CONTACTED', label: 'Contacted', hint: 'Outreach logged' },
  { key: 'CLOSING', label: 'Closing', hint: '≤ 30 days' },
  { key: 'COMPLETED', label: 'Completed', hint: 'Paid up / ended' },
];

type ViewMode = 'list' | 'kanban';

type StagedRow = { contract: Contract; stage: StageKey };

function daysRemaining(endDate: string) {
  return Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function stageFor(contract: Contract): StageKey | null {
  if (contract.status === 'COMPLETED') return 'COMPLETED';
  if (!['ACTIVE', 'ARREARS'].includes(contract.status)) return null;

  const days = daysRemaining(contract.endDate);
  if (contract.endOfTermNotifiedAt) return 'CONTACTED';
  if (days <= 30) return 'CLOSING';
  if (days <= 90) return 'FINAL_90';
  if (days <= 180) return 'WATCH';
  return null;
}

export default function EndOfTermPage() {
  const [view, setView] = useState<ViewMode>('kanban');

  const query = useQuery({
    queryKey: ['contracts-eot'],
    queryFn: async () => {
      const [active, arrears, completed] = await Promise.all([
        api.getContracts({ status: 'ACTIVE' }),
        api.getContracts({ status: 'ARREARS' }),
        api.getContracts({ status: 'COMPLETED' }),
      ]);
      return [...active, ...arrears, ...completed];
    },
  });

  const staged = useMemo(() => {
    return (query.data ?? [])
      .map((contract) => ({ contract, stage: stageFor(contract) }))
      .filter((row): row is StagedRow => Boolean(row.stage));
  }, [query.data]);

  const accessors = useMemo(
    () => ({
      client: (row: StagedRow) =>
        `${row.contract.client.lastName} ${row.contract.client.firstName}`,
      vehicle: (row: StagedRow) => row.contract.vehicle.registration,
      stage: (row: StagedRow) =>
        STAGES.find((s) => s.key === row.stage)?.label ?? row.stage,
      daysLeft: (row: StagedRow) =>
        row.contract.status === 'COMPLETED'
          ? Number.POSITIVE_INFINITY
          : daysRemaining(row.contract.endDate),
      outstanding: (row: StagedRow) => Number(row.contract.outstandingBalance),
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(staged, accessors, 'daysLeft');

  const byStage = useMemo(() => {
    const map: Record<StageKey, Contract[]> = {
      WATCH: [],
      FINAL_90: [],
      CONTACTED: [],
      CLOSING: [],
      COMPLETED: [],
    };
    for (const row of sorted) {
      map[row.stage].push(row.contract);
    }
    return map;
  }, [sorted]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl text-navy">End of term</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Renewal pipeline — list by days remaining, or kanban by stage.
            Stages are inferred from end date and notification flags until Own A
            Rental defines a full lifecycle.
          </p>
        </div>
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {(
            [
              { id: 'list', label: 'List' },
              { id: 'kanban', label: 'Kanban' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`border-b-2 px-3 py-2 text-sm ${
                view === item.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-600 dark:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-slate-600 dark:text-slate-300">Loading pipeline…</p>
      ) : null}
      {query.isError ? (
        <p className="text-danger">Could not load contracts.</p>
      ) : null}

      {view === 'list' && !query.isLoading ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600 dark:text-slate-300 dark:border-slate-700">
              <tr>
                <SortTh column="client">Client</SortTh>
                <SortTh column="vehicle">Vehicle</SortTh>
                <SortTh column="stage">Stage</SortTh>
                <SortTh column="daysLeft">Days left</SortTh>
                <SortTh column="outstanding">Outstanding</SortTh>
                <th className="px-4 py-3 font-medium">Contract</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ contract, stage }) => (
                <tr
                  key={contract.id}
                  className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${contract.client.id}`}
                      className="text-navy hover:text-brand"
                    >
                      {contract.client.firstName} {contract.client.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                    <Link
                      href={`/fleet/${contract.vehicle.id}`}
                      className="hover:text-brand"
                    >
                      {contract.vehicle.registration}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {STAGES.find((s) => s.key === stage)?.label}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                    {contract.status === 'COMPLETED'
                      ? '—'
                      : daysRemaining(contract.endDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    R{' '}
                    {Number(contract.outstandingBalance).toLocaleString(
                      'en-ZA',
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="text-brand hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-slate-600 dark:text-slate-300">
                    No end-of-term candidates in the current window.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {view === 'kanban' && !query.isLoading ? (
        <div className="grid gap-3 xl:grid-cols-5">
          {STAGES.map((stage) => (
            <div
              key={stage.key}
              className="rounded-lg border border-slate-200 bg-surface dark:border-slate-700"
            >
              <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                <p className="text-sm font-medium text-navy">{stage.label}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {stage.hint} · {byStage[stage.key].length}
                </p>
              </div>
              <ul className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
                {byStage[stage.key].map((contract) => (
                  <li
                    key={contract.id}
                    className="rounded-md border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <Link
                      href={`/clients/${contract.client.id}`}
                      className="text-sm font-medium text-navy hover:text-brand"
                    >
                      {contract.client.firstName} {contract.client.lastName}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {contract.vehicle.registration}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {contract.status === 'COMPLETED'
                        ? 'Completed'
                        : `${daysRemaining(contract.endDate)} days left`}
                    </p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <Link
                        href={`/contracts/${contract.id}`}
                        className="text-brand hover:underline"
                      >
                        Contract
                      </Link>
                      <Link
                        href={`/fleet/${contract.vehicle.id}`}
                        className="text-brand hover:underline"
                      >
                        Vehicle
                      </Link>
                    </div>
                  </li>
                ))}
                {byStage[stage.key].length === 0 ? (
                  <li className="px-1 py-6 text-center text-xs text-slate-600 dark:text-slate-300">
                    Empty
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
