'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  api,
  statusLabel,
  type DashboardAlert,
  type DashboardWin,
  type VehicleStatus,
} from '@/lib/api';
import {
  SimpleBars,
  StatusBars,
  StatusDonut,
  UtilizationRing,
} from '@/components/dashboard-charts';

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
    <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: accent ?? '#1680ab' }}
        />
        <p className="text-[11px] uppercase tracking-[0.16em] text-brand-grey">
          {label}
        </p>
      </div>
      <p
        className="mt-2 text-3xl font-semibold tracking-tight text-navy"
        style={{ fontFamily: 'var(--font-display), sans-serif' }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-brand-grey">{hint}</p> : null}
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
        <p className="mt-0.5 text-sm text-brand-grey">{item.detail}</p>
        {item.vehicle ? (
          <p className="mt-0.5 font-mono text-xs text-brand-grey">
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
          <p className="mt-0.5 text-xs text-brand-grey">
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
        <p className="mt-0.5 text-sm text-brand-grey">{item.detail}</p>
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
  const [view, setView] = useState<OverviewView>('operations');
  const [selectedHealth, setSelectedHealth] = useState<string | null>(null);
  const [hoveredHealth, setHoveredHealth] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oar-my-tasks');
      if (raw) setDoneTasks(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleTask(id: string) {
    setDoneTasks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('oar-my-tasks', JSON.stringify(next));
      return next;
    });
  }

  const query = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: 60_000,
  });

  const profitQuery = useQuery({
    queryKey: ['profitability'],
    queryFn: () => api.getProfitability(),
    enabled: view === 'finances',
  });

  const data = query.data;
  const fleet = data?.fleet;
  const kpi = data?.kpi;
  const attention = data?.attention ?? [];
  const wins = data?.wins ?? [];
  const analytics = data?.analytics;
  const myTasks = data?.myTasks ?? [];
  const pendingFines =
    analytics?.pendingFineCount ?? data?.summary.pendingFineCount ?? 0;

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
    if (selectedStatus === 'ARREARS') {
      return attention.filter(
        (item) => item.kind === 'ARREARS' || item.kind === 'MISSED_PAYMENT',
      );
    }
    if (selectedStatus) {
      return attention.filter(
        (item) => item.vehicle && fleet?.vehicles.some(
          (v) => v.id === item.vehicle?.id && v.status === selectedStatus,
        ),
      );
    }
    return [];
  }, [selectedHealth, selectedStatus, attention, fleet?.vehicles]);

  const filteredRoster = useMemo(() => {
    if (!fleet) return [];
    if (selectedStatus) {
      return fleet.vehicles.filter((v) => v.status === selectedStatus);
    }
    return fleet.vehicles;
  }, [fleet, selectedStatus]);

  const endingContracts = analytics?.endingClients ?? [];

  const financeTotals = useMemo(() => {
    const rows = profitQuery.data ?? [];
    const profit = rows.reduce((sum, row) => sum + Number(row.profit), 0);
    const income = rows.reduce((sum, row) => sum + Number(row.rentalIncome), 0);
    const costs = rows.reduce((sum, row) => sum + Number(row.totalCost), 0);
    return { profit, income, costs, count: rows.length };
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
          <p className="mt-1 max-w-xl text-brand-grey">
            Glance at issues, contract health, and where the business needs
            attention — then dig deeper in each space.
          </p>
        </div>
        {data?.generatedAt ? (
          <p className="text-xs text-brand-grey">
            Updated{' '}
            {new Date(data.generatedAt).toLocaleTimeString('en-ZA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        ) : null}
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
                : 'border-transparent text-brand-grey hover:text-navy'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <p className="text-brand-grey">Loading overview…</p>
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
                  <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                    Contract health
                  </h2>
                  <p className="mt-1 text-sm text-brand-grey">
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
                selectedHealth === 'ending' ||
                selectedStatus) && (
                <div className="mt-5 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-sm font-medium text-navy">
                      {selectedHealth === 'needsAttention'
                        ? 'Needs attention'
                        : selectedHealth === 'ending'
                          ? 'Ending soon'
                          : `${statusLabel(selectedStatus ?? '')} detail`}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-brand-grey hover:text-brand"
                      onClick={() => {
                        setSelectedHealth(null);
                        setSelectedStatus(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto px-4">
                    {selectedHealth === 'ending' ? (
                      endingContracts.length === 0 ? (
                        <p className="py-6 text-sm text-brand-grey">
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
                                <p className="font-mono text-xs text-brand-grey">
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
                      <p className="py-6 text-sm text-brand-grey">
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
                  <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                    End of term
                  </h2>
                  <p className="mt-1 text-sm text-brand-grey">
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
                  <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                    Fleet status
                  </h2>
                  <p className="mt-1 text-sm text-brand-grey">
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
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                Wins
              </h2>
              <p className="mt-1 text-sm text-brand-grey">
                Early payments and paid-up contracts
              </p>
              {wins.length === 0 ? (
                <p className="mt-6 text-sm text-brand-grey">
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
                <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                  Fleet roster
                  {selectedStatus
                    ? ` · ${statusLabel(selectedStatus)}`
                    : ''}
                </h2>
                <p className="mt-1 text-sm text-brand-grey">
                  Every vehicle, with the renter when on contract
                </p>
              </div>
              <div className="text-sm text-brand-grey">
                Utilization {fleet.utilizationPercent}%
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-brand-grey">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3 font-medium">Vehicle</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Odometer</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((vehicle) => (
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
                        <p className="font-mono text-xs text-brand-grey">
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
                          <span className="text-brand-grey">Yard stock</span>
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
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-brand-grey"
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
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
              Utilization
            </h2>
            <p className="mt-1 text-sm text-brand-grey">
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
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
              Clients by area
            </h2>
            <p className="mt-1 mb-5 text-sm text-brand-grey">
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
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
              Contract lifecycle
            </h2>
            <p className="mt-1 mb-5 text-sm text-brand-grey">
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
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              label="Fleet income"
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.income).toLocaleString('en-ZA')}`
              }
              hint="Lifetime rental income"
              accent="#16a34a"
            />
            <KpiCard
              label="Costs"
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.costs).toLocaleString('en-ZA')}`
              }
              hint="Purchase + fees + fines"
              accent="#eab024"
            />
            <KpiCard
              label="Profit"
              value={
                profitQuery.isLoading
                  ? '…'
                  : `R ${Math.round(financeTotals.profit).toLocaleString('en-ZA')}`
              }
              hint={`${financeTotals.count} vehicles`}
              accent="#1680ab"
            />
          </div>
          <Panel>
            <p className="text-sm text-brand-grey">
              Lifetime profitability by vehicle. Month / quarter / year
              comparisons land once Own A Rental confirms period definitions
              against their books.
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
        <Panel>
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
            Today&apos;s tasks
          </h2>
          <p className="mt-1 mb-4 text-sm text-brand-grey">
            Overdue recoveries and outstanding fines — check off as you go
          </p>
          {myTasks.length === 0 ? (
            <p className="text-sm text-brand-grey">Nothing queued right now.</p>
          ) : (
            <ul className="space-y-2">
              {myTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(doneTasks[task.id])}
                    onChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        doneTasks[task.id]
                          ? 'text-brand-grey line-through'
                          : 'text-navy'
                      }`}
                    >
                      {task.label}
                    </p>
                    <div className="mt-1 flex gap-3 text-xs">
                      <Link
                        href={`/clients/${task.clientId}`}
                        className="text-brand hover:underline"
                      >
                        Client
                      </Link>
                      <Link
                        href={`/contracts/${task.contractId}`}
                        className="text-brand hover:underline"
                      >
                        Contract
                      </Link>
                      <span
                        className={
                          task.severity === 'high'
                            ? 'text-danger'
                            : 'text-warning'
                        }
                      >
                        {task.severity}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : null}
    </section>
  );
}
