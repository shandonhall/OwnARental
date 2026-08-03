'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, statusLabel } from '@/lib/api';
import { PrimaryButton, SecondaryButton } from '@/components/form';
import { useTableSort } from '@/lib/table-sort';

const FleetMap = dynamic(
  () => import('@/components/fleet-map').then((mod) => mod.FleetMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center rounded-lg border border-slate-200 bg-surface text-slate-600 dark:text-slate-300 dark:border-slate-700">
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
  if (score == null) return 'text-slate-600 dark:text-slate-300';
  if (score < 65) return 'text-danger';
  if (score < 75) return 'text-warning';
  return 'text-success';
}

export default function MapPage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Sticky selection from map/table click — survives mouse leave. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Transient hover preview (table row or map pin). */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /** Fly/zoom only when a table row is clicked. */
  const [zoomToId, setZoomToId] = useState<string | null>(null);
  const [resetViewKey, setResetViewKey] = useState(0);
  const focusId = hoveredId ?? selectedId;
  const selectedIdRef = useRef(selectedId);
  const zoomToIdRef = useRef(zoomToId);
  selectedIdRef.current = selectedId;
  zoomToIdRef.current = zoomToId;

  const status = useQuery({
    queryKey: ['telematics-status'],
    queryFn: () => api.getTelematicsStatus(),
    refetchInterval: 15 * 60_000,
  });

  const mapQuery = useQuery({
    queryKey: ['telematics-map'],
    queryFn: () => api.getMapAssets(),
    refetchInterval: 15 * 60_000,
  });

  const assets = useMemo(
    () => (Array.isArray(mapQuery.data) ? mapQuery.data : []),
    [mapQuery.data],
  );
  const located = assets.filter(
    (asset) => asset.lat != null && asset.lng != null,
  );
  const overLimit = assets.filter((asset) => asset.mileage.overLimit);
  const serviceDue = assets.filter((asset) => asset.serviceDueSoon);

  const accessors = useMemo(
    () => ({
      registration: (a: (typeof assets)[number]) => a.registration,
      renter: (a: (typeof assets)[number]) =>
        a.client
          ? `${a.client.lastName} ${a.client.firstName}`
          : '',
      status: (a: (typeof assets)[number]) => a.status,
      odometer: (a: (typeof assets)[number]) => a.currentOdometerKm,
      mileage: (a: (typeof assets)[number]) => a.mileage.usagePercent ?? -1,
      service: (a: (typeof assets)[number]) =>
        a.daysUntilService ??
        (a.nextServiceDueDate
          ? new Date(a.nextServiceDueDate).getTime()
          : null),
      score: (a: (typeof assets)[number]) => a.driverScore ?? -1,
      lastSync: (a: (typeof assets)[number]) =>
        a.lastTelematicsSyncAt
          ? new Date(a.lastTelematicsSyncAt).getTime()
          : 0,
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(
    assets,
    accessors,
    'registration',
  );

  useEffect(() => {
    if (!selectedId) return;
    const row = document.querySelector<HTMLElement>(
      `[data-vehicle-id="${selectedId}"]`,
    );
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  function clearSelection() {
    const hadFocus =
      selectedIdRef.current != null || zoomToIdRef.current != null;
    setSelectedId(null);
    setHoveredId(null);
    setZoomToId(null);
    if (hadFocus) setResetViewKey((key) => key + 1);
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const el = event.target as Element | null;
      if (!el) return;
      // Keep selection when interacting with a row, pin, or popup.
      if (el.closest('[data-vehicle-id]')) return;
      if (el.closest('.leaflet-marker-icon')) return;
      if (el.closest('.leaflet-popup')) return;
      clearSelection();
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function selectFromMap(id: string) {
    setSelectedId(id);
    setHoveredId(null);
  }

  function selectFromTable(id: string) {
    setSelectedId(id);
    setHoveredId(null);
    setZoomToId(id);
  }

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
                  : 'bg-slate-100 text-slate-600 dark:text-slate-300'
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
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Hover or click a pin to highlight its row. Click a table row to
            zoom the map to that vehicle. Use Reset view to show all pins.
          </p>
          {status.data ? (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
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
              setZoomToId(null);
              setResetViewKey((key) => key + 1);
            }}
          >
            Reset view
          </SecondaryButton>
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
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Located
          </p>
          <p className="mt-1 text-2xl text-navy">
            {located.length}/{assets.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Over mileage limit
          </p>
          <p className="mt-1 text-2xl text-warning">{overLimit.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Service due ≤14d
          </p>
          <p className="mt-1 text-2xl text-warning">{serviceDue.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
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
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <FleetMap
            assets={assets}
            selectedId={focusId}
            zoomToId={zoomToId}
            resetViewKey={resetViewKey}
            onSelect={selectFromMap}
            onHover={setHoveredId}
          />
        </div>
      )}

      <div
        className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700"
        onMouseLeave={() => setHoveredId(null)}
      >
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600 dark:text-slate-300 dark:border-slate-700">
            <tr>
              <SortTh column="registration">Vehicle</SortTh>
              <SortTh column="renter">Renter</SortTh>
              <SortTh column="status">Status</SortTh>
              <SortTh column="odometer">Odometer</SortTh>
              <SortTh column="mileage">Mileage use</SortTh>
              <SortTh column="service">Next service</SortTh>
              <SortTh column="score">Score</SortTh>
              <SortTh column="lastSync">Last sync</SortTh>
            </tr>
          </thead>
          <tbody>
            {sorted.map((asset) => {
              const isSelected = selectedId === asset.id;
              const isFocused = focusId === asset.id;
              return (
              <tr
                key={asset.id}
                data-vehicle-id={asset.id}
                className={`border-b border-slate-100 transition dark:border-slate-800 ${
                  isSelected
                    ? 'bg-brand/15 ring-1 ring-inset ring-brand/40'
                    : isFocused
                      ? 'bg-brand/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                }`}
                onMouseEnter={() => setHoveredId(asset.id)}
                onClick={() => selectFromTable(asset.id)}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${asset.id}`}
                    className="text-navy hover:text-brand"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {asset.registration}
                  </Link>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {asset.make} {asset.model}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {asset.client ? (
                    <Link
                      href={`/clients/${asset.client.id}`}
                      className="text-brand hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {asset.client.firstName} {asset.client.lastName}
                    </Link>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">Yard stock</span>
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
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {asset.currentOdometerKm.toLocaleString()} km
                </td>
                <td
                  className={`px-4 py-3 ${
                    asset.mileage.overLimit ? 'text-danger' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {asset.mileage.usagePercent != null
                    ? `${asset.mileage.usagePercent}% of limit`
                    : 'No limit'}
                </td>
                <td
                  className={`px-4 py-3 ${
                    asset.serviceDueSoon
                      ? 'text-warning'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {asset.nextServiceDueDate
                    ? new Date(asset.nextServiceDueDate).toLocaleDateString()
                    : '—'}
                  {asset.daysUntilService != null ? (
                    <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">
                      {asset.daysUntilService < 0
                        ? `${Math.abs(asset.daysUntilService)}d overdue`
                        : `${asset.daysUntilService}d`}
                    </span>
                  ) : null}
                </td>
                <td className={`px-4 py-3 ${scoreClass(asset.driverScore)}`}>
                  {asset.driverScore ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                  {asset.lastTelematicsSyncAt
                    ? new Date(asset.lastTelematicsSyncAt).toLocaleString()
                    : 'Never'}
                </td>
              </tr>
              );
            })}
            {assets.length === 0 && !mapQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-slate-600 dark:text-slate-300">
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
