'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  hasPermission,
  type LicenceRenewal,
  type LicenceUrgency,
} from '@/lib/api';
import { formatMoney } from '@/lib/format-money';
import { Permission } from '@/lib/permissions';
import { useTableSort } from '@/lib/table-sort';
import {
  Field,
  FormActions,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  TextSelect,
} from '@/components/form';

function urgencyLabel(urgency: LicenceUrgency) {
  if (urgency === 'EXPIRED') return 'Expired';
  if (urgency === 'ACTION_30') return '≤30 days';
  if (urgency === 'WARN_60') return '≤60 days';
  return 'Valid';
}

function urgencyClass(urgency: LicenceUrgency) {
  if (urgency === 'EXPIRED' || urgency === 'ACTION_30') return 'text-danger';
  if (urgency === 'WARN_60') return 'text-warning';
  return 'text-success';
}

function daysLabel(row: LicenceRenewal) {
  if (row.urgency === 'EXPIRED') return `Expired ${Math.abs(row.daysRemaining)}d`;
  if (row.daysRemaining === 0) return 'Today';
  return `${row.daysRemaining}d`;
}

function parseUrgencyParam(value: string | null): LicenceUrgency | 'ALL' {
  if (
    value === 'OK' ||
    value === 'WARN_60' ||
    value === 'ACTION_30' ||
    value === 'EXPIRED' ||
    value === 'ALL'
  ) {
    return value;
  }
  return 'ALL';
}

export default function LicencesPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading licences…</p>}>
      <LicencesPageContent />
    </Suspense>
  );
}

function LicencesPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [urgency, setUrgency] = useState<LicenceUrgency | 'ALL'>(() =>
    parseUrgencyParam(searchParams.get('urgency')),
  );
  const [pipeline, setPipeline] = useState<'OPEN' | 'TERMINAL' | 'ALL'>('OPEN');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });
  const canWrite = me.data
    ? hasPermission(me.data.role, Permission.LICENCES_WRITE)
    : false;

  const query = useQuery({
    queryKey: ['licences', urgency, pipeline, search],
    queryFn: () =>
      api.getLicences({
        urgency,
        pipeline,
        search: search || undefined,
      }),
  });

  const fleet = useQuery({
    queryKey: ['fleet-for-licence-create'],
    queryFn: () => api.getFleet(),
    enabled: showCreate && canWrite,
  });

  const rows = useMemo(
    () => (Array.isArray(query.data) ? query.data : []),
    [query.data],
  );

  const accessors = useMemo(
    () => ({
      registration: (r: LicenceRenewal) => r.vehicle.registration,
      vehicle: (r: LicenceRenewal) =>
        `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`,
      client: (r: LicenceRenewal) =>
        r.client ? `${r.client.lastName} ${r.client.firstName}` : '',
      expiry: (r: LicenceRenewal) => r.expiryDate,
      days: (r: LicenceRenewal) => r.daysRemaining,
      urgency: (r: LicenceRenewal) => r.urgency,
      status: (r: LicenceRenewal) => r.status,
      cost: (r: LicenceRenewal) => Number(r.renewalCost ?? 0),
      owner: (r: LicenceRenewal) => r.responsibleUser?.fullName ?? '',
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'expiry');
  const selected = sorted.find((row) => row.id === selectedId) ?? null;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['licences'] });
    await queryClient.invalidateQueries({ queryKey: ['fleet'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
  };

  const create = useMutation({
    mutationFn: (body: {
      vehicleId: string;
      expiryDate: string;
      renewalCost?: number | null;
      notes?: string | null;
    }) => api.createLicence(body),
    onSuccess: async () => {
      setShowCreate(false);
      setMessage('Licence cycle created');
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Create failed');
    },
  });

  const patch = useMutation({
    mutationFn: (input: {
      id: string;
      data: Parameters<typeof api.updateLicence>[1];
    }) => api.updateLicence(input.id, input.data),
    onSuccess: async (result) => {
      setMessage(
        result.nextCycle
          ? `Completed. Next cycle opens ${result.nextCycle.expiryDate}.`
          : 'Licence updated',
      );
      setError(null);
      await invalidate();
      if (result.renewal) setSelectedId(result.renewal.id);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Update failed');
    },
  });

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const costRaw = String(form.get('renewalCost') ?? '').trim();
    create.mutate({
      vehicleId: String(form.get('vehicleId')),
      expiryDate: String(form.get('expiryDate')),
      renewalCost: costRaw === '' ? null : Number(costRaw),
      notes: String(form.get('notes') ?? '') || null,
    });
  }

  async function onAction(
    mark: NonNullable<Parameters<typeof api.updateLicence>[1]['mark']>,
    extra?: Parameters<typeof api.updateLicence>[1],
  ) {
    if (!selected) return;
    patch.mutate({ id: selected.id, data: { mark, ...extra } });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl text-navy">Licences</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Vehicle licence disc renewals — 60 / 30 day horizons.
          </p>
        </div>
        {canWrite ? (
          <PrimaryButton type="button" onClick={() => setShowCreate(true)}>
            Create renewal
          </PrimaryButton>
        ) : null}
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['ALL', 'All'],
              ['EXPIRED', 'Expired'],
              ['ACTION_30', 'Due ≤30'],
              ['WARN_60', 'Due ≤60'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setUrgency(value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                urgency === value
                  ? 'bg-brand/15 text-brand'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
          {(
            [
              ['OPEN', 'Open'],
              ['TERMINAL', 'Completed / cancelled'],
              ['ALL', 'Any status'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPipeline(value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                pipeline === value
                  ? 'bg-navy/10 text-navy'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search registration, vehicle, client"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:w-72 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {showCreate && canWrite ? (
        <form
          onSubmit={onCreate}
          className="space-y-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700"
        >
          <h2 className="text-sm uppercase tracking-wide text-slate-600">
            New licence cycle
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vehicle">
              <TextSelect name="vehicleId" required defaultValue="">
                <option value="" disabled>
                  Select vehicle
                </option>
                {(fleet.data ?? []).map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration} — {vehicle.year} {vehicle.make}{' '}
                    {vehicle.model}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Expiry date">
              <TextInput name="expiryDate" type="date" required />
            </Field>
            <Field label="Renewal cost (optional)">
              <TextInput name="renewalCost" type="number" step="0.01" />
            </Field>
            <Field label="Notes">
              <TextInput name="notes" />
            </Field>
          </div>
          <FormActions>
            <SecondaryButton type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Create'}
            </PrimaryButton>
          </FormActions>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600 dark:border-slate-700">
              <tr>
                <SortTh column="registration">Registration</SortTh>
                <SortTh column="vehicle">Vehicle</SortTh>
                <SortTh column="client">Client</SortTh>
                <SortTh column="expiry">Expiry</SortTh>
                <SortTh column="days">Days</SortTh>
                <SortTh column="urgency">Urgency</SortTh>
                <SortTh column="status">Status</SortTh>
                <SortTh column="cost" align="right">
                  Cost
                </SortTh>
                <SortTh column="owner">Responsible</SortTh>
                <th className="px-4 py-3 font-medium">Notified</th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-slate-600">
                    Loading licences…
                  </td>
                </tr>
              ) : null}
              {query.isError ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-danger">
                    Could not load licences.
                  </td>
                </tr>
              ) : null}
              {!query.isLoading && sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-slate-600">
                    No licence cycles match this filter.
                  </td>
                </tr>
              ) : null}
              {sorted.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 ${
                    selectedId === row.id ? 'bg-brand/5' : ''
                  }`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/fleet/${row.vehicle.id}`}
                      className="text-brand hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.vehicle.registration}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {row.vehicle.year} {row.vehicle.make} {row.vehicle.model}
                  </td>
                  <td className="px-4 py-3">
                    {row.client
                      ? `${row.client.firstName} ${row.client.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.expiryDate}</td>
                  <td className={`px-4 py-3 tabular-nums ${urgencyClass(row.urgency)}`}>
                    {daysLabel(row)}
                  </td>
                  <td className={`px-4 py-3 ${urgencyClass(row.urgency)}`}>
                    {urgencyLabel(row.urgency)}
                  </td>
                  <td className="px-4 py-3">{row.status.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(row.renewalCost)}
                  </td>
                  <td className="px-4 py-3">
                    {row.responsibleUser?.fullName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.clientNotifiedAt
                      ? new Date(row.clientNotifiedAt).toLocaleDateString('en-ZA')
                      : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <h2 className="text-sm uppercase tracking-wide text-slate-600">
            Workflow
          </h2>
          {!selected ? (
            <p className="mt-3 text-sm text-slate-600">
              Select a row to run actions.
            </p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <p className="font-medium text-navy">
                {selected.vehicle.registration}
              </p>
              <p>
                {selected.status.replaceAll('_', ' ')} ·{' '}
                <span className={urgencyClass(selected.urgency)}>
                  {urgencyLabel(selected.urgency)}
                </span>
              </p>
              {canWrite &&
              !['COMPLETED', 'CANCELLED'].includes(selected.status) ? (
                <div className="flex flex-col gap-2">
                  <SecondaryButton
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => onAction('client_notified')}
                  >
                    Mark client notified
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => onAction('start')}
                  >
                    Start renewal
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => onAction('renewed')}
                  >
                    Mark renewed
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => onAction('received')}
                  >
                    Mark disc received
                  </SecondaryButton>
                  <form
                    className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const renewedExpiryDate = String(
                        form.get('renewedExpiryDate') ?? '',
                      );
                      const mark = String(form.get('completeVia')) as
                        | 'sent'
                        | 'collected';
                      onAction(mark, { renewedExpiryDate });
                    }}
                  >
                    <Field label="Renewed disc expiry">
                      <TextInput name="renewedExpiryDate" type="date" required />
                    </Field>
                    <Field label="Complete via">
                      <TextSelect name="completeVia" defaultValue="collected">
                        <option value="collected">Collected</option>
                        <option value="sent">Sent</option>
                      </TextSelect>
                    </Field>
                    <PrimaryButton type="submit" disabled={patch.isPending}>
                      Complete cycle
                    </PrimaryButton>
                  </form>
                  <form
                    className="space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const costRaw = String(form.get('renewalCost') ?? '').trim();
                      patch.mutate({
                        id: selected.id,
                        data: {
                          renewalCost: costRaw === '' ? null : Number(costRaw),
                          notes: String(form.get('notes') ?? '') || null,
                        },
                      });
                    }}
                  >
                    <Field label="Renewal cost">
                      <TextInput
                        name="renewalCost"
                        type="number"
                        step="0.01"
                        defaultValue={selected.renewalCost ?? ''}
                      />
                    </Field>
                    <Field label="Notes">
                      <TextInput
                        name="notes"
                        defaultValue={selected.notes ?? ''}
                      />
                    </Field>
                    <SecondaryButton type="submit" disabled={patch.isPending}>
                      Save cost / notes
                    </SecondaryButton>
                  </form>
                  <button
                    type="button"
                    className="text-left text-sm text-danger hover:underline"
                    disabled={patch.isPending}
                    onClick={() => {
                      if (confirm('Cancel this open licence cycle?')) {
                        onAction('cancel');
                      }
                    }}
                  >
                    Cancel cycle
                  </button>
                </div>
              ) : (
                <p className="text-slate-600">
                  {canWrite
                    ? 'Terminal cycle — history only.'
                    : 'Read-only for your role.'}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
