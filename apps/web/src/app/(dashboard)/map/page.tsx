'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, statusLabel } from '@/lib/api';
import { PrimaryButton, SecondaryButton } from '@/components/form';

const FleetMap = dynamic(
  () => import('@/components/fleet-map').then((mod) => mod.FleetMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-grey">
        Loading map…
      </div>
    ),
  },
);

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

function scoreClass(score: number | null) {
  if (score == null) return 'text-slate-600';
  if (score < 65) return 'text-danger';
  if (score < 75) return 'text-warning';
  return 'text-success';
}

export default function MapPage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ['telematics-status'],
    queryFn: () => api.getTelematicsStatus(),
    refetchInterval: 60_000,
  });

  const mapQuery = useQuery({
    queryKey: ['telematics-map'],
    queryFn: () => api.getMapAssets(),
    refetchInterval: 60_000,
  });

  const assets = Array.isArray(mapQuery.data) ? mapQuery.data : [];
  const located = assets.filter(
    (asset) => asset.lat != null && asset.lng != null,
  );
  const overLimit = assets.filter((asset) => asset.mileage.overLimit);
  const serviceDue = assets.filter((asset) => asset.serviceDueSoon);

  async function syncFleet() {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await api.syncFleet();
      setMessage(
        result.failed > 0
          ? `Synced ${result.synced}, ${result.failed} failed via ${result.provider}`
          : `Synced ${result.synced} vehicles via ${result.provider} provider`,
      );
      await queryClient.invalidateQueries({ queryKey: ['telematics-map'] });
      await queryClient.invalidateQueries({ queryKey: ['telematics-status'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const provider = status.data?.provider ?? '—';
  const intervalMins =
    status.data?.syncIntervalMs != null
      ? Math.round(status.data.syncIntervalMs / 60_000)
      : null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl text-navy">Live asset map</h1>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                provider === 'live'
                  ? 'bg-emerald-50 text-success'
                  : 'bg-slate-100 text-brand-grey'
              }`}
            >
              {provider} CarTrack
            </span>
            {status.data?.queueEnabled ? (
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-brand">
                BullMQ
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-brand-grey">
            Status-colored pins for the fleet. Use the table to match each
            vehicle to its renter and open their profile.
          </p>
          {status.data ? (
            <p className="mt-2 text-xs text-brand-grey">
              {status.data.message}
              {status.data.autoSyncEnabled && intervalMins != null
                ? ` · Auto-sync every ${intervalMins} min`
                : ' · Auto-sync off'}
              {status.data.lastFleetSyncAt
                ? ` · Last sync ${new Date(status.data.lastFleetSyncAt).toLocaleString()}`
                : ''}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <SecondaryButton
            type="button"
            onClick={() => {
              void mapQuery.refetch();
              void status.refetch();
            }}
            disabled={mapQuery.isFetching}
          >
            Refresh
          </SecondaryButton>
          <PrimaryButton type="button" onClick={syncFleet} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync telematics'}
          </PrimaryButton>
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {status.data?.lastFleetSyncError ? (
        <p className="text-sm text-danger">{status.data.lastFleetSyncError}</p>
      ) : null}
      {status.data?.lastFleetSync?.errors?.length ? (
        <ul className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          {status.data.lastFleetSync.errors.slice(0, 5).map((error) => (
            <li key={error.vehicleId}>
              {error.registration ?? error.vehicleId}: {error.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-grey">
            Located
          </p>
          <p className="mt-1 text-2xl text-navy">
            {located.length}/{assets.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-grey">
            Over mileage limit
          </p>
          <p className="mt-1 text-2xl text-warning">{overLimit.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-grey">
            Service due ≤14d
          </p>
          <p className="mt-1 text-2xl text-warning">{serviceDue.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-grey">
            Immobilized
          </p>
          <p className="mt-1 text-2xl text-danger">
            {assets.filter((asset) => asset.isImmobilized).length}
          </p>
        </div>
      </div>

      {mapQuery.isError ? (
        <p className="text-danger">Could not load map assets.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <FleetMap assets={assets} />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-brand-grey">
            <tr>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Renter</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Odometer</th>
              <th className="px-4 py-3 font-medium">Mileage use</th>
              <th className="px-4 py-3 font-medium">Next service</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Last sync</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.id}
                className="border-b border-slate-100 transition hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${asset.id}`}
                    className="text-navy hover:text-brand"
                  >
                    {asset.registration}
                  </Link>
                  <p className="text-xs text-brand-grey">
                    {asset.make} {asset.model}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {asset.client ? (
                    <Link
                      href={`/clients/${asset.client.id}`}
                      className="text-brand hover:underline"
                    >
                      {asset.client.firstName} {asset.client.lastName}
                    </Link>
                  ) : (
                    <span className="text-brand-grey">Yard stock</span>
                  )}
                </td>
                <td className={`px-4 py-3 ${statusClass(asset.status)}`}>
                  {statusLabel(asset.status)}
                  {asset.isImmobilized ? (
                    <span className="mt-0.5 block text-xs text-warning">
                      Immobilized
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {asset.currentOdometerKm.toLocaleString()} km
                </td>
                <td
                  className={`px-4 py-3 ${
                    asset.mileage.overLimit ? 'text-danger' : 'text-slate-600'
                  }`}
                >
                  {asset.mileage.usagePercent != null
                    ? `${asset.mileage.usagePercent}% of limit`
                    : 'No limit'}
                </td>
                <td
                  className={`px-4 py-3 ${
                    asset.serviceDueSoon ? 'text-warning' : 'text-slate-600'
                  }`}
                >
                  {asset.nextServiceDueDate
                    ? new Date(asset.nextServiceDueDate).toLocaleDateString()
                    : '—'}
                  {asset.daysUntilService != null ? (
                    <span className="mt-0.5 block text-xs text-brand-grey">
                      {asset.daysUntilService < 0
                        ? `${Math.abs(asset.daysUntilService)}d overdue`
                        : `${asset.daysUntilService}d`}
                    </span>
                  ) : null}
                </td>
                <td className={`px-4 py-3 ${scoreClass(asset.driverScore)}`}>
                  {asset.driverScore ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-brand-grey">
                  {asset.lastTelematicsSyncAt
                    ? new Date(asset.lastTelematicsSyncAt).toLocaleString()
                    : 'Never'}
                </td>
              </tr>
            ))}
            {assets.length === 0 && !mapQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-brand-grey">
                  No map assets yet — sync telematics to populate locations.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
