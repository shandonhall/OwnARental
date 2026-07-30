'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, statusLabel } from '@/lib/api';
import { DangerButton, PrimaryButton, SecondaryButton } from '@/components/form';

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['vehicle', params.id],
    queryFn: () => api.getVehicle(params.id),
    enabled: Boolean(params.id),
  });

  const telematics = useQuery({
    queryKey: ['vehicle-telematics', params.id],
    queryFn: () => api.getVehicleTelematics(params.id),
    enabled: Boolean(params.id),
  });

  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });

  async function syncNow() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.syncVehicle(params.id);
      setMessage(
        `Synced via ${result.provider}. Next service in ~${result.prediction?.estimatedDaysUntilService ?? '—'} days.`,
      );
      await queryClient.invalidateQueries({ queryKey: ['vehicle', params.id] });
      await queryClient.invalidateQueries({
        queryKey: ['vehicle-telematics', params.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['telematics-map'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleImmobilize(immobilize: boolean) {
    const label = immobilize ? 'immobilize' : 'mobilize';
    if (
      !confirm(
        `Confirm ${label} for this vehicle? This requires Super Admin and is logged.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.setImmobilized(params.id, immobilize);
      setMessage(immobilize ? 'Vehicle immobilized.' : 'Vehicle mobilized.');
      await queryClient.invalidateQueries({ queryKey: ['vehicle', params.id] });
      await queryClient.invalidateQueries({
        queryKey: ['vehicle-telematics', params.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['telematics-map'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return <p className="text-brand-grey">Loading vehicle…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Vehicle not found.</p>;
  }

  const vehicle = query.data;
  const contract = vehicle.contracts[0];
  const detail = telematics.data;
  const isSuperAdmin = me.data?.role === 'SUPER_ADMIN';
  const immobilized =
    detail?.vehicle.isImmobilized ?? vehicle.isImmobilized ?? false;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/fleet" className="text-sm text-brand hover:underline">
            ← Back to fleet
          </Link>
          <h1 className="mt-2 text-3xl text-navy">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-1 font-mono text-brand-grey">{vehicle.registration}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={syncNow} disabled={busy}>
            {busy ? 'Working…' : 'Sync CarTrack'}
          </SecondaryButton>
          <Link
            href={`/fleet/${vehicle.id}/edit`}
            className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
          >
            Edit vehicle
          </Link>
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-brand-grey">
            Identity
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">VIN</dt>
              <dd className="font-mono">{vehicle.vin}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Status</dt>
              <dd>{statusLabel(vehicle.status)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Purchase price</dt>
              <dd>R {Number(vehicle.purchasePrice).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">CarTrack device</dt>
              <dd className="font-mono">
                {detail?.vehicle.carTrackDeviceId ??
                  vehicle.carTrackDeviceId ??
                  '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Immobilized</dt>
              <dd className={immobilized ? 'text-danger' : 'text-success'}>
                {immobilized ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-brand-grey">
            Telematics & maintenance
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Odometer</dt>
              <dd>
                {(
                  detail?.vehicle.currentOdometerKm ?? vehicle.currentOdometerKm
                ).toLocaleString()}{' '}
                km
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Driver score</dt>
              <dd>
                {detail?.vehicle.driverScore ?? vehicle.driverScore ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Avg daily km</dt>
              <dd>
                {detail?.vehicle.averageDailyKm
                  ? Number(detail.vehicle.averageDailyKm).toFixed(1)
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Mileage vs limit</dt>
              <dd
                className={
                  detail?.mileage.overLimit ? 'text-danger' : undefined
                }
              >
                {detail?.mileage.usagePercent != null
                  ? `${detail.mileage.usagePercent}% projected`
                  : 'No limit set'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Next service</dt>
              <dd>
                {detail?.prediction
                  ? `${new Date(
                      detail.prediction.nextServiceDueDate,
                    ).toLocaleDateString()} (${detail.prediction.remainingKm.toLocaleString()} km)`
                  : vehicle.nextServiceDueDate
                    ? new Date(vehicle.nextServiceDueDate).toLocaleDateString()
                    : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 p-4">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-orange-200">
            Super Admin — immobilization
          </h2>
          <p className="mb-3 text-sm text-slate-300">
            Requires confirmed action. All triggers are written to the
            telematics event log.
          </p>
          {immobilized ? (
            <PrimaryButton
              type="button"
              disabled={busy}
              onClick={() => toggleImmobilize(false)}
            >
              Mobilize vehicle
            </PrimaryButton>
          ) : (
            <DangerButton
              type="button"
              disabled={busy}
              onClick={() => toggleImmobilize(true)}
            >
              Immobilize vehicle
            </DangerButton>
          )}
        </div>
      ) : null}

      {contract ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-brand-grey">
            Active assignment
          </h2>
          <p className="text-sm">
            {contract.planType.replace('_', ' ')} · {contract.status} · R{' '}
            {Number(contract.monthlyRate).toLocaleString()}/mo
          </p>
          {contract.client && (
            <Link
              href={`/clients/${contract.client.id}`}
              className="mt-2 inline-block text-sm text-brand hover:underline"
            >
              {contract.client.firstName} {contract.client.lastName}
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-brand-grey">
          No active contract linked.
        </div>
      )}

      {detail?.vehicle.telematicsEvents &&
      detail.vehicle.telematicsEvents.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-brand-grey">
            Recent telematics events
          </h2>
          <ul className="space-y-2 text-sm">
            {detail.vehicle.telematicsEvents.slice(0, 8).map((event) => (
              <li
                key={event.id}
                className="flex justify-between gap-4 border-b border-slate-100 pb-2"
              >
                <span className="text-slate-200">
                  {event.type.replaceAll('_', ' ')}
                  {event.message ? ` · ${event.message}` : ''}
                </span>
                <span className="shrink-0 text-slate-500">
                  {new Date(event.recordedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
