'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  roleLabel,
  statusLabel,
  taskCategoryHint,
  taskCategoryLabel,
  type DashboardAlert,
  type DashboardWin,
  type EndOfTermStage,
  type TaskCategory,
  type VehicleStatus,
} from '@/lib/api';
import {
  FinanceMonthChart,
  SimpleBars,
  StatusBars,
  StatusDonut,
  UtilizationRing,
} from '@/components/dashboard-charts';
import { formatMoneyCompact } from '@/lib/format-money';
import { useTableSort } from '@/lib/table-sort';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#1680ab',
  ARREARS: '#c01725',
  AVAILABLE: '#eab024',
  PAID_UP: '#16a34a',
  RETURNED: '#929191',
  WRITTEN_OFF: '#1a2832',
};

const HEALTH_COLOR: Record<string, string> = {
  healthy: '#16a34a',
  ending: '#eab024',
  needsAttention: '#c01725',
};

type OverviewView = 'operations' | 'marketing' | 'finances' | 'my';

type FinancePreset = 'lifetime' | 'month' | 'quarter' | 'year' | 'custom';

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Full calendar period (not month-to-date) so expected income covers the whole month. */
function financeRange(preset: FinancePreset): { from?: string; to?: string } {
  if (preset === 'lifetime') return {};
  const now = new Date();
  if (preset === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toInputDate(from), to: toInputDate(to) };
  }
  if (preset === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3;
    const from = new Date(now.getFullYear(), q, 1);
    const to = new Date(now.getFullYear(), q + 3, 0);
    return { from: toInputDate(from), to: toInputDate(to) };
  }
  if (preset === 'year') {
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31);
    return { from: toInputDate(from), to: toInputDate(to) };
  }
  return {};
}

const VIEWS: Array<{ id: OverviewView; label: string }> = [
  { id: 'operations', label: 'Operations' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'finances', label: 'Finances' },
  { id: 'my', label: 'My tasks' },
];

function money(value: string | null) {
  if (value == null) return null;
  return `R ${Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function shortDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });
}

function statusTextClass(status: string) {
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

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
      <div className="flex min-h-[2.75rem] items-start gap-2">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: accent ?? '#1680ab' }}
        />
        <p className="text-[11px] uppercase leading-snug tracking-[0.16em] text-slate-600 dark:text-slate-300">
          {label}
        </p>
      </div>
      <p
        className="mt-2 text-3xl font-semibold tracking-tight text-navy"
        style={{ fontFamily: 'var(--font-display), sans-serif' }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{hint}</p>
      ) : null}
    </div>
  );
}

function AlertRow({ item }: { item: DashboardAlert }) {
  const href = item.contractId
    ? `/contracts/${item.contractId}`
    : item.vehicle
      ? `/fleet/${item.vehicle.id}`
      : '/map';

  return (
    <li className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="min-w-0">
        {item.client ? (
          <p className="truncate text-sm text-navy">
            <Link
              href={`/clients/${item.client.id}`}
              className="hover:text-brand"
            >
              {item.client.firstName} {item.client.lastName}
            </Link>
          </p>
        ) : (
          <Link href={href} className="truncate text-sm text-navy hover:text-brand">
            {item.title}
          </Link>
        )}
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{item.detail}</p>
        {item.vehicle ? (
          <p className="mt-0.5 font-mono text-xs text-slate-600 dark:text-slate-300">
            {item.vehicle.registration}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right text-sm">
        {money(item.amount) ? (
          <p
            className={
              item.severity === 'high' ? 'text-danger' : 'text-warning'
            }
          >
            {money(item.amount)}
          </p>
        ) : (
          <p
            className={
              item.severity === 'high' ? 'text-danger' : 'text-warning'
            }
          >
            {item.kind === 'SERVICE_DUE'
              ? 'Service'
              : item.kind === 'RULE_BREACH'
                ? 'Breach'
                : 'Alert'}
          </p>
        )}
        {shortDate(item.date) ? (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
            {shortDate(item.date)}
          </p>
        ) : null}
        {item.contractId ? (
          <Link
            href={`/contracts/${item.contractId}`}
            className="mt-1 inline-block text-xs text-brand hover:underline"
          >
            Contract
          </Link>
        ) : (
          <Link
            href={href}
            className="mt-1 inline-block text-xs text-brand hover:underline"
          >
            Open
          </Link>
        )}
      </div>
    </li>
  );
}

function WinRow({ item }: { item: DashboardWin }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="min-w-0">
        <p className="truncate text-sm text-navy">
          <Link
            href={`/clients/${item.client.id}`}
            className="hover:text-brand"
          >
            {item.client.firstName} {item.client.lastName}
          </Link>
        </p>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{item.detail}</p>
      </div>
      <div className="shrink-0 text-right text-sm">
        {money(item.amount) ? (
          <p className="text-success">{money(item.amount)}</p>
        ) : (
          <p className="text-success">Done</p>
        )}
        <Link
          href={`/contracts/${item.contractId}`}
          className="mt-1 inline-block text-xs text-brand hover:underline"
        >
          Contract
        </Link>
      </div>
    </li>
  );
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-surface p-5 dark:border-slate-700 ${className}`}
    >
      {children}
    </div>
  );
}

export default function HomeDashboardPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<OverviewView>('operations');
  const [selectedHealth, setSelectedHealth] = useState<string | null>(null);
  const [hoveredHealth, setHoveredHealth] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});
  const [financePreset, setFinancePreset] = useState<FinancePreset>('lifetime');
  const [financeFrom, setFinanceFrom] = useState('');
  const [financeTo, setFinanceTo] = useState('');
  const [trendMonths, setTrendMonths] = useState<6 | 12>(6);
  const [trendMetric, setTrendMetric] = useState<
    'received' | 'costs' | 'profit' | 'expected' | 'forecastProfit'
  >('received');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oar-my-tasks');
      if (raw) setDoneTasks(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  async function toggleTask(
    task: {
      id: string;
      contractId: string | null;
      advancePipelineTo?: string | null;
    },
  ) {
    const becomingDone = !doneTasks[task.id];
    setDoneTasks((prev) => {
      const next = { ...prev, [task.id]: becomingDone };
      localStorage.setItem('oar-my-tasks', JSON.stringify(next));
      return next;
    });

    if (
      becomingDone &&
      task.contractId &&
      task.advancePipelineTo &&
      ['CONTACTED', 'BALLOON_PENDING', 'HANDOVER', 'RETURNED'].includes(
        task.advancePipelineTo,
      )
    ) {
      try {
        await api.updateEndOfTermStage(
          task.contractId,
          task.advancePipelineTo as EndOfTermStage,
        );
        await queryClient.invalidateQueries({ queryKey: ['end-of-term-board'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      } catch {
        /* stage advance is best-effort for pitch UX */
      }
    }
  }

  const query = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: 15 * 60_000,
  });

  const profitParams = useMemo(() => {
    if (financePreset === 'custom') {
      return {
        from: financeFrom || undefined,
        to: financeTo || undefined,
      };
    }
    return financeRange(financePreset);
  }, [financePreset, financeFrom, financeTo]);

  const profitQuery = useQuery({
    queryKey: ['profitability', profitParams.from ?? '', profitParams.to ?? ''],
    queryFn: () => api.getProfitability(profitParams),
    enabled: view === 'finances',
  });

  const trendQuery = useQuery({
    queryKey: ['profitability-trend', trendMonths],
    queryFn: () => api.getProfitabilityTrend(trendMonths),
    enabled: view === 'finances',
  });

  const trendSeries = useMemo(
    () =>
      (trendQuery.data?.series ?? []).map((row) => ({
        key: row.key,
        label: row.label,
        year: row.year,
        month: row.month,
        received: Number(row.received),
        costs: Number(row.costs),
        expected: Number(row.expected),
        owed: Number(row.owed),
        profit: Number(row.profit),
        forecastProfit: Number(row.forecastProfit),
      })),
    [trendQuery.data],
  );

  const data = query.data;
  const fleet = data?.fleet;
  const kpi = data?.kpi;
  const attention = data?.attention ?? [];
  const wins = data?.wins ?? [];
  const analytics = data?.analytics;
  const myTasks = data?.myTasks ?? [];
  const tasksByCategory = data?.tasksByCategory;
  const taskViewer = data?.viewer;
  const pendingFines =
    analytics?.pendingFineCount ?? data?.summary.pendingFineCount ?? 0;

  const taskSections = useMemo(() => {
    const order: TaskCategory[] = [
      'collections',
      'driver',
      'end_of_term',
      'fleet',
    ];
    return order
      .map((category) => ({
        category,
        tasks: tasksByCategory?.[category] ?? myTasks.filter((t) => t.category === category),
      }))
      .filter((section) => section.tasks.length > 0);
  }, [tasksByCategory, myTasks]);

  const slices =
    fleet?.byStatus.map((row) => ({
      key: row.status,
      label: statusLabel(row.status as VehicleStatus),
      value: row.count,
      color: STATUS_COLOR[row.status] ?? '#94a3b8',
    })) ?? [];

  const healthSlices = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        key: 'healthy',
        label: 'On track',
        value: analytics.contractHealth.healthy,
        color: HEALTH_COLOR.healthy,
      },
      {
        key: 'ending',
        label: 'Ending soon',
        value: analytics.contractHealth.ending,
        color: HEALTH_COLOR.ending,
      },
      {
        key: 'needsAttention',
        label: 'Needs attention',
        value: analytics.contractHealth.needsAttention,
        color: HEALTH_COLOR.needsAttention,
      },
    ].filter((s) => s.value > 0);
  }, [analytics]);

  const healthTotal = healthSlices.reduce((sum, s) => sum + s.value, 0);

  const accordionItems = useMemo(() => {
    if (selectedHealth === 'needsAttention') {
      return attention;
    }
    if (selectedHealth === 'ending') {
      return attention.filter(() => false);
    }
    return [];
  }, [selectedHealth, attention]);

  const filteredRoster = useMemo(() => {
    if (!fleet) return [];
    if (selectedStatus) {
      return fleet.vehicles.filter((v) => v.status === selectedStatus);
    }
    return fleet.vehicles;
  }, [fleet, selectedStatus]);

  const rosterAccessors = useMemo(
    () => ({
      vehicle: (v: (typeof filteredRoster)[number]) =>
        `${v.year} ${v.make} ${v.model} ${v.registration}`,
      status: (v: (typeof filteredRoster)[number]) => v.status,
      client: (v: (typeof filteredRoster)[number]) =>
        v.client ? `${v.client.lastName} ${v.client.firstName}` : '',
      odometer: (v: (typeof filteredRoster)[number]) => v.currentOdometerKm,
      score: (v: (typeof filteredRoster)[number]) => v.driverScore ?? -1,
    }),
    [],
  );

  const { sorted: sortedRoster, SortTh: RosterSortTh } = useTableSort(
    filteredRoster,
    rosterAccessors,
    'vehicle',
  );

  const endingContracts = analytics?.endingClients ?? [];

  const financeTotals = useMemo(() => {
    const rows = profitQuery.data ?? [];
    const profit = rows.reduce((sum, row) => sum + Number(row.profit), 0);
    const income = rows.reduce((sum, row) => sum + Number(row.rentalIncome), 0);
    const owed = rows.reduce(
      (sum, row) => sum + Number(row.outstandingIncome ?? 0),
      0,
    );
    const expected = rows.reduce(
      (sum, row) => sum + Number(row.expectedIncome ?? row.rentalIncome),
      0,
    );
    const costs = rows.reduce((sum, row) => sum + Number(row.totalCost), 0);
    const forecastProfit = rows.reduce((sum, row) => {
      if (row.forecastProfit != null) return sum + Number(row.forecastProfit);
      const expected = Number(row.expectedIncome ?? row.rentalIncome);
      return sum + (expected - Number(row.totalCost));
    }, 0);
    const collectionUpside = forecastProfit - profit;
    return {
      profit,
      forecastProfit,
      collectionUpside,
      income,
      owed,
      expected,
      costs,
      count: rows.length,
    };
  }, [profitQuery.data]);

  function selectHealth(key: string) {
    setSelectedStatus(null);
    setSelectedHealth((prev) => (prev === key ? null : key));
  }

  function selectStatus(key: string) {
    setSelectedHealth(null);
    setSelectedStatus((prev) => (prev === key ? null : key));
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-navy"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            Overview
          </h1>
          <p className="mt-1 max-w-xl text-slate-600 dark:text-slate-300">
            Glance at issues, contract health, and where the business needs
            attention — then dig deeper in each space. Auto-refreshes every 15
            minutes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.generatedAt ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Updated{' '}
              {new Date(data.generatedAt).toLocaleTimeString('en-ZA', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-navy hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`border-b-2 px-3 py-2 text-sm transition ${
              view === item.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-navy'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <p className="text-slate-600 dark:text-slate-300">Loading overview…</p>
      ) : null}

      {query.isError ? (
        <p className="text-danger">
          Could not load the dashboard overview. Is the API running on port
          3001?
        </p>
      ) : null}

      {!query.isLoading && !query.isError && fleet && view === 'operations' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard
              label="Active fleet"
              value={kpi?.activeFleet ?? fleet.active + fleet.arrears}
              hint={`${fleet.onContract} on contract · ${fleet.available} available`}
              accent="#1680ab"
            />
            <KpiCard
              label="Payment alerts"
              value={kpi?.paymentAlerts ?? 0}
              hint="Missed, late, or arrears"
              accent="#c01725"
            />
            <KpiCard
              label="Service due"
              value={kpi?.serviceDue ?? 0}
              hint="Within 14 days"
              accent="#eab024"
            />
            <KpiCard
              label="Nearing completion"
              value={kpi?.contractsNearingCompletion ?? 0}
              hint="Final 90 days"
              accent="#1a2832"
            />
            <KpiCard
              label="Fines"
              value={pendingFines}
              hint="Outstanding fines/tolls"
              accent="#c01725"
            />
            <KpiCard
              label="Utilization"
              value={`${kpi?.utilizationPercent ?? fleet.utilizationPercent}%`}
              hint={
                fleet.averageDriverScore != null
                  ? `Avg score ${fleet.averageDriverScore}`
                  : 'Fleet on the road'
              }
              accent="#16a34a"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    Contract health
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Click a slice to open who needs attention
                  </p>
                </div>
                <Link
                  href="/contracts"
                  className="text-xs text-brand hover:underline"
                >
                  Open contracts
                </Link>
              </div>
              <div className="grid items-center gap-6 md:grid-cols-[180px_1fr]">
                <StatusDonut
                  slices={healthSlices}
                  centerValue={String(healthTotal || fleet.onContract)}
                  centerLabel="Clients"
                  selectedKey={selectedHealth}
                  hoveredKey={hoveredHealth}
                  onSelect={selectHealth}
                  onHover={setHoveredHealth}
                />
                <StatusBars
                  slices={healthSlices}
                  selectedKey={selectedHealth}
                  hoveredKey={hoveredHealth}
                  onSelect={selectHealth}
                  onHover={setHoveredHealth}
                />
              </div>

              {(selectedHealth === 'needsAttention' ||
                selectedHealth === 'ending') && (
                <div className="mt-5 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-sm font-medium text-navy">
                      {selectedHealth === 'needsAttention'
                        ? 'Needs attention'
                        : 'Ending soon'}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand"
                      onClick={() => setSelectedHealth(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto px-4">
                    {selectedHealth === 'ending' ? (
                      endingContracts.length === 0 ? (
                        <p className="py-6 text-sm text-slate-600 dark:text-slate-300">
                          No ending-soon clients in the current window.
                        </p>
                      ) : (
                        <ul>
                          {endingContracts.map((item) => (
                            <li
                              key={item.contractId}
                              className="flex justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"
                            >
                              <div>
                                <Link
                                  href={`/clients/${item.clientId}`}
                                  className="text-sm text-navy hover:text-brand"
                                >
                                  {item.firstName} {item.lastName}
                                </Link>
                                <p className="font-mono text-xs text-slate-600 dark:text-slate-300">
                                  {item.registration} · {item.daysRemaining}d
                                  left
                                </p>
                              </div>
                              <Link
                                href={`/contracts/${item.contractId}`}
                                className="text-xs text-brand hover:underline"
                              >
                                Contract
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : accordionItems.length === 0 ? (
                      <p className="py-6 text-sm text-slate-600 dark:text-slate-300">
                        Nothing in this slice right now.
                      </p>
                    ) : (
                      <ul>
                        {accordionItems.map((item) => (
                          <AlertRow key={item.id} item={item} />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </Panel>

            <Panel>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    End of term
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Pipeline glance from contract end dates
                  </p>
                </div>
                <Link
                  href="/pipeline"
                  className="text-xs text-brand hover:underline"
                >
                  Open pipeline
                </Link>
              </div>
              <SimpleBars
                color="#eab024"
                rows={[
                  {
                    label: 'Watch (6 mo)',
                    value: analytics?.endOfTerm.watch ?? 0,
                  },
                  {
                    label: 'Final 90 days',
                    value: analytics?.endOfTerm.finalNinety ?? 0,
                  },
                  {
                    label: 'Contacted',
                    value: analytics?.endOfTerm.contacted ?? 0,
                  },
                  {
                    label: 'Closing (30d)',
                    value: analytics?.endOfTerm.closing ?? 0,
                  },
                  {
                    label: 'Completed',
                    value: analytics?.endOfTerm.completed ?? 0,
                  },
                ]}
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Panel>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    Fleet status
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Click a status to filter the roster
                  </p>
                </div>
                <Link
                  href="/fleet"
                  className="text-xs text-brand hover:underline"
                >
                  Open fleet
                </Link>
              </div>
              <div className="grid items-center gap-6 md:grid-cols-[160px_1fr]">
                <StatusDonut
                  slices={slices}
                  centerValue={String(fleet.total)}
                  centerLabel="Cars"
                  selectedKey={selectedStatus}
                  hoveredKey={hoveredStatus}
                  onSelect={selectStatus}
                  onHover={setHoveredStatus}
                />
                <StatusBars
                  slices={slices}
                  selectedKey={selectedStatus}
                  hoveredKey={hoveredStatus}
                  onSelect={selectStatus}
                  onHover={setHoveredStatus}
                />
              </div>
            </Panel>

            <Panel>
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                Wins
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Early payments and paid-up contracts
              </p>
              {wins.length === 0 ? (
                <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
                  No early payments or paid-up wins in the recent window.
                </p>
              ) : (
                <ul className="mt-2">
                  {wins.map((item) => (
                    <WinRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Fleet roster
                  {selectedStatus
                    ? ` · ${statusLabel(selectedStatus)}`
                    : ''}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Every vehicle, with the renter when on contract
                </p>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Utilization {fleet.utilizationPercent}%
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <tr className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
                    <RosterSortTh column="vehicle" className="px-5 py-3 font-medium">
                      Vehicle
                    </RosterSortTh>
                    <RosterSortTh column="status" className="px-5 py-3 font-medium">
                      Status
                    </RosterSortTh>
                    <RosterSortTh column="client" className="px-5 py-3 font-medium">
                      Client
                    </RosterSortTh>
                    <RosterSortTh
                      column="odometer"
                      className="px-5 py-3 font-medium"
                    >
                      Odometer
                    </RosterSortTh>
                    <RosterSortTh column="score" className="px-5 py-3 font-medium">
                      Score
                    </RosterSortTh>
                  </tr>
                </thead>
                <tbody>
                  {sortedRoster.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/fleet/${vehicle.id}`}
                          className="text-navy hover:text-brand"
                        >
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </Link>
                        <p className="font-mono text-xs text-slate-600 dark:text-slate-300">
                          {vehicle.registration}
                          {vehicle.isImmobilized ? ' · Immobilized' : ''}
                        </p>
                      </td>
                      <td
                        className={`px-5 py-3 ${statusTextClass(vehicle.status)}`}
                      >
                        {statusLabel(vehicle.status)}
                      </td>
                      <td className="px-5 py-3">
                        {vehicle.client ? (
                          <Link
                            href={`/clients/${vehicle.client.id}`}
                            className="text-brand hover:underline"
                          >
                            {vehicle.client.firstName} {vehicle.client.lastName}
                          </Link>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300">Yard stock</span>
                        )}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {vehicle.currentOdometerKm.toLocaleString()} km
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {vehicle.driverScore ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {sortedRoster.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-slate-600 dark:text-slate-300"
                      >
                        No vehicles in this filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <Panel>
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Utilization
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Active + arrears vs total fleet
            </p>
            <div className="mt-4">
              <UtilizationRing
                percent={fleet.utilizationPercent}
                label={`${fleet.active + fleet.arrears} of ${fleet.total} vehicles earning`}
              />
            </div>
          </Panel>
        </>
      ) : null}

      {!query.isLoading && !query.isError && view === 'marketing' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Clients by area
            </h2>
            <p className="mt-1 mb-5 text-sm text-slate-600 dark:text-slate-300">
              Where renters live — useful for ad targeting
            </p>
            <SimpleBars
              rows={(analytics?.geography ?? []).map((row) => ({
                label: row.area,
                value: row.count,
              }))}
            />
          </Panel>
          <Panel>
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              Contract lifecycle
            </h2>
            <p className="mt-1 mb-5 text-sm text-slate-600 dark:text-slate-300">
              Draft → active → arrears → completed
            </p>
            <SimpleBars
              color="#1680ab"
              rows={(analytics?.contractHealth.byStatus ?? []).map((row) => ({
                label: row.status,
                value: row.count,
              }))}
            />
            <Link
              href="/clients"
              className="mt-6 inline-block text-sm text-brand hover:underline"
            >
              Browse clients
            </Link>
          </Panel>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && view === 'finances' ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700 sm:flex-row sm:flex-wrap sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Period
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ['lifetime', 'Lifetime'],
                    ['month', 'This month'],
                    ['quarter', 'This quarter'],
                    ['year', 'This year'],
                    ['custom', 'Custom'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFinancePreset(id)}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      financePreset === id
                        ? 'bg-brand/15 text-brand'
                        : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {financePreset === 'custom' ? (
              <div className="flex flex-wrap gap-3">
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  From
                  <input
                    type="date"
                    value={financeFrom}
                    onChange={(e) => setFinanceFrom(e.target.value)}
                    className="mt-1 block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-navy dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  To
                  <input
                    type="date"
                    value={financeTo}
                    onChange={(e) => setFinanceTo(e.target.value)}
                    className="mt-1 block rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-navy dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label={financePreset === 'lifetime' ? 'Received' : 'Period received'}
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.income).toLocaleString('en-ZA')}`
              }
              hint={
                financePreset === 'lifetime'
                  ? 'Paid rental / deposit / balloon'
                  : 'Paid against dues in the full period'
              }
              accent="#16a34a"
            />
            <KpiCard
              label="Still owed"
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.owed).toLocaleString('en-ZA')}`
              }
              hint="Unpaid dues for the full selected period"
              accent="#dc2626"
            />
            <KpiCard
              label={financePreset === 'lifetime' ? 'Costs' : 'Period costs'}
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.costs).toLocaleString('en-ZA')}`
              }
              hint={
                financePreset === 'lifetime'
                  ? 'Purchase + fees + fines'
                  : 'Fees / fines / maintenance in range (ex-purchase)'
              }
              accent="#eab024"
            />
            <KpiCard
              label="Realised profit"
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.profit).toLocaleString('en-ZA')}`
              }
              hint={`${financeTotals.count} vehicles · on money received`}
              accent="#1680ab"
            />
            <KpiCard
              label="Forecast profit"
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.forecastProfit).toLocaleString('en-ZA')}`
              }
              hint="If all expected payments settle"
              accent="#7c3aed"
            />
          </div>

          {!profitQuery.isLoading && financeTotals.expected > 0 ? (
            <Panel>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Expected income
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Received vs still owed —{' '}
                    <span className="text-navy">
                      R {Math.round(financeTotals.expected).toLocaleString('en-ZA')}{' '}
                      expected
                    </span>
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {Math.round(
                    (financeTotals.income / financeTotals.expected) * 100,
                  )}
                  % collected
                </p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="flex h-full"
                  style={{ width: '100%' }}
                >
                  <div
                    className="h-full bg-success"
                    style={{
                      width: `${Math.min(
                        100,
                        (financeTotals.income / financeTotals.expected) * 100,
                      )}%`,
                    }}
                  />
                  <div
                    className="h-full bg-danger/80"
                    style={{
                      width: `${Math.min(
                        100,
                        (financeTotals.owed / financeTotals.expected) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />
                  Received R{' '}
                  {Math.round(financeTotals.income).toLocaleString('en-ZA')}
                </span>
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger" />
                  Owed R {Math.round(financeTotals.owed).toLocaleString('en-ZA')}
                </span>
                {financeTotals.collectionUpside > 0 ? (
                  <span>
                    Collection upside R{' '}
                    {Math.round(financeTotals.collectionUpside).toLocaleString(
                      'en-ZA',
                    )}{' '}
                    → forecast profit R{' '}
                    {Math.round(financeTotals.forecastProfit).toLocaleString(
                      'en-ZA',
                    )}
                  </span>
                ) : null}
              </div>
            </Panel>
          ) : null}

          <Panel>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Month on month
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Compare operating performance across recent months. Hover a
                  bar for the exact amount.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([6, 12] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTrendMonths(n)}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      trendMonths === n
                        ? 'bg-brand/15 text-brand'
                        : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {n} mo
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  ['received', 'Received'],
                  ['expected', 'Expected'],
                  ['costs', 'Costs'],
                  ['profit', 'Realised profit'],
                  ['forecastProfit', 'Forecast profit'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTrendMetric(id)}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    trendMetric === id
                      ? 'bg-brand/15 text-brand'
                      : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {trendQuery.isLoading ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Loading monthly trend…
              </p>
            ) : trendQuery.isError ? (
              <p className="text-sm text-danger">Could not load monthly trend.</p>
            ) : (
              <FinanceMonthChart
                series={trendSeries}
                metric={trendMetric}
                formatValue={(n) => formatMoneyCompact(n)}
              />
            )}
          </Panel>

          <Panel>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {financePreset === 'lifetime'
                ? 'Lifetime view includes vehicle purchase in costs, and expected income is the full contract schedule (all months + deposit + balloon). A negative forecast means deal pricing does not recover purchase capital after fees.'
                : 'Full calendar period (e.g. all of August, not month-to-date). Expected includes scheduled monthly rent even when ledger lines are not raised yet.'}
            </p>
            <Link
              href="/profitability"
              className="mt-4 inline-block text-sm text-brand hover:underline"
            >
              Open profitability table
            </Link>
          </Panel>
        </div>
      ) : null}

      {!query.isLoading && !query.isError && view === 'my' ? (
        <div className="space-y-4">
          <Panel>
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              {taskViewer?.canSeeAllTasks ? 'Team tasks' : 'My tasks'}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {taskViewer?.canSeeAllTasks
                ? 'Admin view — all queues with assignees. Completing an end-of-term task advances that client in the pipeline.'
                : `Showing work assigned to ${taskViewer?.fullName ?? 'you'} (${roleLabel(taskViewer?.role ?? 'FLEET_MANAGER')}). Completing an end-of-term task advances that client in the pipeline.`}
            </p>
          </Panel>

          {taskSections.length === 0 ? (
            <Panel>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Nothing queued for your role right now.
              </p>
            </Panel>
          ) : (
            taskSections.map((section) => (
              <Panel key={section.category}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                      {taskCategoryLabel(section.category)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {taskCategoryHint(section.category)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {section.tasks.length} task
                    {section.tasks.length === 1 ? '' : 's'}
                  </p>
                </div>
                <ul className="space-y-2">
                  {section.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(doneTasks[task.id])}
                        onChange={() => void toggleTask(task)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            doneTasks[task.id]
                              ? 'text-slate-600 dark:text-slate-300 line-through'
                              : 'text-navy'
                          }`}
                        >
                          {task.label}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {task.clientId ? (
                            <Link
                              href={`/clients/${task.clientId}`}
                              className="text-brand hover:underline"
                            >
                              Client
                            </Link>
                          ) : null}
                          {task.contractId ? (
                            <Link
                              href={`/contracts/${task.contractId}`}
                              className="text-brand hover:underline"
                            >
                              Contract
                            </Link>
                          ) : null}
                          <span
                            className={
                              task.severity === 'high'
                                ? 'text-danger'
                                : 'text-warning'
                            }
                          >
                            {task.severity}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            {taskViewer?.canSeeAllTasks ? 'Assigned to ' : 'Owner · '}
                            {task.assignee.fullName}
                            {task.assignee.unassigned
                              ? ` (${roleLabel(task.assigneeRole)})`
                              : ` · ${roleLabel(task.assignee.role)}`}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
