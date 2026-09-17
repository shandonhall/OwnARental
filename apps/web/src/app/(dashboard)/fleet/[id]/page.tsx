'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, hasPermission, statusLabel } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { DangerButton, PrimaryButton, SecondaryButton } from '@/components/form';

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-100">
        <div
          className={`h-full ${
            value < 65
              ? 'bg-danger'
              : value < 75
                ? 'bg-warning'
                : 'bg-success'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

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
    refetchInterval: 60_000,
  });

  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });

  const licenceHistory = useQuery({
    queryKey: ['vehicle-licences', params.id],
    queryFn: () => api.getVehicleLicences(params.id),
    enabled: Boolean(params.id),
  });

  async function syncNow() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.syncVehicle(params.id);
      const breachNote =
        result.ruleBreaches && result.ruleBreaches.length > 0
          ? ` · ${result.ruleBreaches.length} rule breach(es)`
          : '';
      setMessage(
        `Synced via ${result.provider}. Next service in ~${result.prediction?.estimatedDaysUntilService ?? '—'} days${breachNote}.`,
      );
      await queryClient.invalidateQueries({ queryKey: ['vehicle', params.id] });
      await queryClient.invalidateQueries({
        queryKey: ['vehicle-telematics', params.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['telematics-map'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
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
    return <p className="text-slate-600 dark:text-slate-300">Loading vehicle…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Vehicle not found.</p>;
  }

  const vehicle = query.data;
  const contract = vehicle.contracts[0];
  const detail = telematics.data;
  const canSync = me.data
    ? hasPermission(me.data.role, Permission.TELEMATICS_SYNC)
    : false;
  const canImmobilize = me.data
    ? hasPermission(me.data.role, Permission.TELEMATICS_IMMOBILIZE)
    : false;
  const canEditFleet = me.data
    ? hasPermission(me.data.role, Permission.FLEET_WRITE)
    : false;
  const canLicenceWrite = me.data
    ? hasPermission(me.data.role, Permission.LICENCES_WRITE)
    : false;
  const canLicenceRead = me.data
    ? hasPermission(me.data.role, Permission.LICENCES_READ)
    : false;
  const immobilized =
    detail?.vehicle.isImmobilized ?? vehicle.isImmobilized ?? false;
  const breakdown = detail?.scoreBreakdown;
  const breaches = detail?.recentBreaches ?? [];
  const serviceSoon =
    detail?.prediction?.estimatedDaysUntilService != null &&
    detail.prediction.estimatedDaysUntilService <= 14;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/fleet" className="text-sm text-brand hover:underline">
            ← Back to fleet
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl text-navy">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            {detail?.provider ? (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                  detail.provider === 'live'
                    ? 'bg-emerald-50 text-success'
                    : 'bg-slate-100 text-slate-600 dark:text-slate-300'
                }`}
              >
                {detail.provider} CarTrack
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-slate-600 dark:text-slate-300">{vehicle.registration}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSync ? (
            <SecondaryButton type="button" onClick={syncNow} disabled={busy}>
              {busy ? 'Working…' : 'Sync CarTrack'}
            </SecondaryButton>
          ) : null}
          {canEditFleet ? (
            <Link
              href={`/fleet/${vehicle.id}/edit`}
              className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
            >
              Edit vehicle
            </Link>
          ) : null}
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {telematics.isError ? (
        <p className="text-sm text-danger">
          Could not load telematics detail
          {telematics.error instanceof Error
            ? `: ${telematics.error.message}`
            : '.'}
        </p>
      ) : null}

      {serviceSoon ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Service due in ~{detail?.prediction?.estimatedDaysUntilService} days (
          {detail?.prediction?.remainingKm.toLocaleString()} km remaining).
        </div>
      ) : null}

      {canLicenceRead ? (
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Licence
            </h2>
            <Link href="/licences" className="text-sm text-brand hover:underline">
              Open queue
            </Link>
          </div>
          {vehicle.currentLicence ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Expiry</dt>
                <dd className="tabular-nums">{vehicle.currentLicence.expiryDate}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Days left</dt>
                <dd className="tabular-nums">
                  {vehicle.currentLicence.daysRemaining}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Urgency</dt>
                <dd>{vehicle.currentLicence.urgency}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Status</dt>
                <dd>{vehicle.currentLicence.status.replaceAll('_', ' ')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Responsible</dt>
                <dd>
                  {vehicle.currentLicence.responsibleUser?.fullName ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Client notified</dt>
                <dd>
                  {vehicle.currentLicence.clientNotifiedAt
                    ? new Date(
                        vehicle.currentLicence.clientNotifiedAt,
                      ).toLocaleDateString('en-ZA')
                    : 'No'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Renewal cost</dt>
                <dd>
                  {vehicle.currentLicence.renewalCost != null
                    ? `R ${Number(vehicle.currentLicence.renewalCost).toLocaleString()}`
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Renewed expiry</dt>
                <dd className="tabular-nums">
                  {vehicle.currentLicence.renewedExpiryDate ?? '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-600">
              Licence information not captured
              {canLicenceWrite ? (
                <>
                  .{' '}
                  <Link href="/licences" className="text-brand hover:underline">
                    Create a renewal cycle
                  </Link>
                </>
              ) : (
                '.'
              )}
            </p>
          )}
          {licenceHistory.data && licenceHistory.data.history.length > 0 ? (
            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
              <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-600">
                Licence history
              </h3>
              <ul className="space-y-1 text-sm">
                {licenceHistory.data.history.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="tabular-nums text-slate-600">
                      {row.expiryDate}
                    </span>
                    <span>{row.status.replaceAll('_', ' ')}</span>
                    <Link
                      href="/licences"
                      className="text-brand hover:underline"
                    >
                      Queue
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Identity
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">VIN</dt>
              <dd className="font-mono">{vehicle.vin}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Status</dt>
              <dd>{statusLabel(vehicle.status)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Purchase price</dt>
              <dd>R {Number(vehicle.purchasePrice).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">CarTrack device</dt>
              <dd className="font-mono">
                {detail?.vehicle.carTrackDeviceId ??
                  vehicle.carTrackDeviceId ??
                  '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Immobilized</dt>
              <dd className={immobilized ? 'text-danger' : 'text-success'}>
                {immobilized ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Last sync</dt>
              <dd>
                {detail?.vehicle.lastTelematicsSyncAt
                  ? new Date(
                      detail.vehicle.lastTelematicsSyncAt,
                    ).toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Telematics & maintenance
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Odometer</dt>
              <dd>
                {(
                  detail?.vehicle.currentOdometerKm ?? vehicle.currentOdometerKm
                ).toLocaleString()}{' '}
                km
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Driver score</dt>
              <dd>
                {detail?.vehicle.driverScore ?? vehicle.driverScore ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Avg daily km</dt>
              <dd>
                {detail?.vehicle.averageDailyKm
                  ? Number(detail.vehicle.averageDailyKm).toFixed(1)
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Mileage vs limit</dt>
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
              <dt className="text-slate-600 dark:text-slate-300">Next service</dt>
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

      {breakdown ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Driver score breakdown
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Overall" value={breakdown.overall} />
            <ScoreBar label="Speeding" value={breakdown.speeding} />
            <ScoreBar label="Harsh braking" value={breakdown.harshBraking} />
            <ScoreBar
              label="Harsh acceleration"
              value={breakdown.harshAcceleration}
            />
            <ScoreBar label="Idling" value={breakdown.idling} />
          </div>
        </div>
      ) : null}

      {breaches.length > 0 ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-orange-800">
            Recent rule breaches
          </h2>
          <ul className="space-y-2 text-sm text-orange-950">
            {breaches.map((breach) => (
              <li
                key={breach.id}
                className="flex justify-between gap-4 border-b border-orange-100 pb-2 last:border-0"
              >
                <span>
                  <span className="font-medium uppercase">{breach.code}</span>
                  {' · '}
                  {breach.message}
                </span>
                <span className="shrink-0 text-xs text-orange-700">
                  {new Date(breach.occurredAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canImmobilize ? (
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
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <h2 className="mb-2 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Active assignment
          </h2>
          <p className="text-sm">
            {contract.planType.replace('_', ' ')} · {contract.status}
            {contract.financeRestricted || contract.monthlyRate == null
              ? ' · rate restricted'
              : ` · R ${Number(contract.monthlyRate).toLocaleString()}/mo`}
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
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 p-4 text-sm text-slate-600 dark:text-slate-300">
          No active contract linked.
        </div>
      )}

      {detail?.vehicle.telematicsEvents &&
      detail.vehicle.telematicsEvents.length > 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Recent telematics events
          </h2>
          <ul className="space-y-2 text-sm">
            {detail.vehicle.telematicsEvents.slice(0, 12).map((event) => (
              <li
                key={event.id}
                className="flex justify-between gap-4 border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40 pb-2"
              >
                <span
                  className={
                    event.type === 'RULE_BREACH'
                      ? 'text-warning'
                      : 'text-slate-700'
                  }
                >
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
