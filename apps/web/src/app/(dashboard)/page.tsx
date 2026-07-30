'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  api,
  statusLabel,
  type DashboardAlert,
  type DashboardWin,
  type VehicleStatus,
} from '@/lib/api';
import {
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
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-30 blur-2xl"
        style={{ background: accent ?? '#1680ab' }}
      />
      <p className="text-[11px] uppercase tracking-[0.16em] text-brand-grey">
        {label}
      </p>
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
    <li>
      <Link
        href={href}
        className="group flex items-start justify-between gap-4 border-b border-slate-100 py-3 transition last:border-0 hover:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="truncate text-sm text-navy group-hover:text-brand">
            {item.title}
          </p>
          <p className="mt-0.5 text-sm text-brand-grey">{item.detail}</p>
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
        </div>
      </Link>
    </li>
  );
}

function WinRow({ item }: { item: DashboardWin }) {
  return (
    <li>
      <Link
        href={`/contracts/${item.contractId}`}
        className="group flex items-start justify-between gap-4 border-b border-slate-100 py-3 transition last:border-0 hover:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="truncate text-sm text-navy group-hover:text-brand">
            {item.title}
          </p>
          <p className="mt-0.5 text-sm text-brand-grey">{item.detail}</p>
        </div>
        <div className="shrink-0 text-right text-sm">
          {money(item.amount) ? (
            <p className="text-success">{money(item.amount)}</p>
          ) : (
            <p className="text-success">Done</p>
          )}
          {shortDate(item.date) ? (
            <p className="mt-0.5 text-xs text-brand-grey">
              {shortDate(item.date)}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export default function HomeDashboardPage() {
  const query = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: 60_000,
  });

  const data = query.data;
  const fleet = data?.fleet;
  const kpi = data?.kpi;
  const attention = data?.attention ?? [];
  const wins = data?.wins ?? [];

  const slices =
    fleet?.byStatus.map((row) => ({
      key: row.status,
      label: statusLabel(row.status as VehicleStatus),
      value: row.count,
      color: STATUS_COLOR[row.status] ?? '#94a3b8',
    })) ?? [];

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-navy"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            Today
          </h1>
          <p className="mt-1 max-w-xl text-brand-grey">
            Fleet pulse, status mix, and the clients who need a call — or a
            thank you.
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

      {query.isLoading ? (
        <p className="text-brand-grey">Loading overview…</p>
      ) : null}

      {query.isError ? (
        <p className="text-danger">
          Could not load the dashboard overview. Is the API running on port
          3001?
        </p>
      ) : null}

      {!query.isLoading && !query.isError && fleet ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                    Status composition
                  </h2>
                  <p className="mt-1 text-sm text-brand-grey">
                    How the fleet is split right now
                  </p>
                </div>
                <Link
                  href="/fleet"
                  className="text-xs text-brand hover:underline"
                >
                  Open fleet
                </Link>
              </div>
              <div className="grid items-center gap-6 md:grid-cols-[180px_1fr]">
                <StatusDonut
                  slices={slices}
                  centerValue={String(fleet.total)}
                  centerLabel="Cars"
                />
                <StatusBars slices={slices} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                Utilization
              </h2>
              <p className="mt-1 text-sm text-brand-grey">
                Active + arrears vs total fleet
              </p>
              <div className="mt-6">
                <UtilizationRing
                  percent={fleet.utilizationPercent}
                  label={`${fleet.active + fleet.arrears} of ${fleet.total} vehicles earning`}
                />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <dt className="text-brand-grey">Active</dt>
                  <dd className="mt-0.5 text-success">{fleet.active}</dd>
                </div>
                <div>
                  <dt className="text-brand-grey">Paid up</dt>
                  <dd className="mt-0.5 text-success">{fleet.paidUp}</dd>
                </div>
                <div>
                  <dt className="text-brand-grey">Immobilized</dt>
                  <dd className="mt-0.5 text-warning">{fleet.immobilized}</dd>
                </div>
                <div>
                  <dt className="text-brand-grey">Signals</dt>
                  <dd className="mt-0.5 text-navy/90">
                    {attention.length} alert
                    {attention.length === 1 ? '' : 's'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                  Fleet roster
                </h2>
                <p className="mt-1 text-sm text-brand-grey">
                  Every vehicle, with the renter when on contract
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-brand-grey">
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Vehicle</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Odometer</th>
                    <th className="px-5 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.vehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
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
                      <td className="px-5 py-3 tabular-nums text-slate-600">
                        {vehicle.currentOdometerKm.toLocaleString()} km
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-600">
                        {vehicle.driverScore ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {fleet.vehicles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-brand-grey"
                      >
                        No vehicles in the fleet yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-5">
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-4">
                <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                  Needs attention
                </h2>
                <span className="text-xs text-brand-grey">
                  {attention.length || 'Clear'}
                </span>
              </div>
              {attention.length === 0 ? (
                <p className="py-8 text-sm text-brand-grey">
                  No missed payments or warnings right now.
                </p>
              ) : (
                <ul>
                  {attention.map((item) => (
                    <AlertRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-5">
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-4">
                <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-grey">
                  Wins
                </h2>
                <span className="text-xs text-brand-grey">
                  {wins.length || 'None'}
                </span>
              </div>
              {wins.length === 0 ? (
                <p className="py-8 text-sm text-brand-grey">
                  No early payments or paid-up wins in the recent window.
                </p>
              ) : (
                <ul>
                  {wins.map((item) => (
                    <WinRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
