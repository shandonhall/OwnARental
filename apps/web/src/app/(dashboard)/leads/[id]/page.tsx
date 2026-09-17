'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  hasPermission,
  type LeadContactChannel,
  type LeadDisqualificationReason,
  type LeadLossReason,
  type LeadStage,
  type UpdateLeadInput,
} from '@/lib/api';
import { Permission } from '@/lib/permissions';
import {
  Field,
  FormActions,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  TextSelect,
  TextTextarea,
} from '@/components/form';

const CHANNELS: LeadContactChannel[] = [
  'PHONE',
  'WHATSAPP',
  'EMAIL',
  'SMS',
  'OTHER',
];

const DISQUALIFY_REASONS: LeadDisqualificationReason[] = [
  'UBER_BOLT',
  'AFFORDABILITY',
  'INVALID_OR_NO_DRIVERS_LICENCE',
  'UNREACHABLE',
  'NOT_INTERESTED',
  'OUTSIDE_REQUIREMENTS',
  'NO_SUITABLE_VEHICLE',
  'DUPLICATE',
  'OTHER',
];

const LOSS_REASONS: LeadLossReason[] = [
  'APPLICATION_DECLINED',
  'CUSTOMER_WITHDREW',
  'NO_SUITABLE_VEHICLE',
  'UNREACHABLE',
  'DUPLICATE',
  'OTHER',
];

const ADVANCE_STAGES: LeadStage[] = [
  'CONTACTED',
  'QUALIFYING',
  'DOCUMENTS_REQUESTED',
  'APPLICATION_SUBMITTED',
  'APPROVED',
  'VEHICLE_SELECTED',
];

function label(value: string) {
  return value.replaceAll('_', ' ');
}

function formatWhen(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });
  const canWrite = me.data
    ? hasPermission(me.data.role, Permission.LEADS_WRITE)
    : false;
  const canAssign = me.data
    ? hasPermission(me.data.role, Permission.LEADS_ASSIGN)
    : false;

  const leadQuery = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.getLead(id),
    enabled: Boolean(id),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['lead-assignments', id],
    queryFn: () => api.getLeadAssignments(id),
    enabled: Boolean(id),
  });

  const stagesQuery = useQuery({
    queryKey: ['lead-stages', id],
    queryFn: () => api.getLeadStages(id),
    enabled: Boolean(id),
  });

  const clientsQuery = useQuery({
    queryKey: ['clients-for-lead-convert'],
    queryFn: () => api.getClients(),
    enabled: canWrite && Boolean(leadQuery.data) && !leadQuery.data?.clientId,
  });

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignmentsQuery.data ?? []) {
      map.set(row.user.id, row.user.fullName);
    }
    if (leadQuery.data?.assignedUser) {
      map.set(
        leadQuery.data.assignedUser.id,
        leadQuery.data.assignedUser.fullName,
      );
    }
    return [...map.entries()].map(([userId, fullName]) => ({
      userId,
      fullName,
    }));
  }, [assignmentsQuery.data, leadQuery.data?.assignedUser]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['lead', id] });
    await queryClient.invalidateQueries({ queryKey: ['lead-assignments', id] });
    await queryClient.invalidateQueries({ queryKey: ['lead-stages', id] });
    await queryClient.invalidateQueries({ queryKey: ['leads'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
  };

  const patch = useMutation({
    mutationFn: (data: UpdateLeadInput) => api.updateLead(id, data),
    onSuccess: async () => {
      setMessage('Lead updated');
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Update failed');
    },
  });

  const assign = useMutation({
    mutationFn: (data: { userId: string; reason?: string | null }) =>
      api.assignLead(id, data),
    onSuccess: async () => {
      setMessage('Lead assigned');
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Assign failed');
    },
  });

  const convert = useMutation({
    mutationFn: (data: Parameters<typeof api.convertLeadClient>[1]) =>
      api.convertLeadClient(id, data),
    onSuccess: async () => {
      setMessage('Lead linked to client');
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Convert failed');
    },
  });

  const lead = leadQuery.data;
  const terminal =
    lead?.stage === 'CLOSED_WON' || lead?.stage === 'CLOSED_LOST';

  function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead || !canWrite) return;
    const form = new FormData(event.currentTarget);
    const licenceRaw = String(form.get('hasValidDriversLicence') ?? '');
    patch.mutate({
      firstName: String(form.get('firstName') ?? '').trim(),
      lastName: String(form.get('lastName') ?? '').trim(),
      cellphone: String(form.get('cellphone') ?? '').trim(),
      email: emptyToNull(form.get('email')),
      area: emptyToNull(form.get('area')),
      salaryBand: emptyToNull(form.get('salaryBand')),
      rentalType: emptyToNull(form.get('rentalType')),
      vehicleNeededTiming: emptyToNull(form.get('vehicleNeededTiming')),
      vehiclePreference: emptyToNull(form.get('vehiclePreference')),
      hasValidDriversLicence:
        licenceRaw === '' ? null : licenceRaw === 'true',
      notes: emptyToNull(form.get('notes')),
    });
  }

  if (leadQuery.isLoading) {
    return <p className="text-slate-600">Loading lead…</p>;
  }

  if (leadQuery.isError || !lead) {
    return (
      <section className="space-y-3">
        <p className="text-danger">Could not load this lead.</p>
        <Link href="/leads" className="text-sm text-brand hover:underline">
          Back to leads
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/leads"
            className="text-sm text-brand hover:underline"
          >
            ← Leads
          </Link>
          <h1 className="mt-2 text-3xl text-navy">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {label(lead.stage)} · {label(lead.qualificationStatus)} ·{' '}
            {lead.creativeType} · {label(lead.source)}
          </p>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <p>Assignee: {lead.assignedUser?.fullName ?? 'Unassigned'}</p>
          <p className="font-mono text-xs">{lead.cellphone}</p>
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="1st attempt"
          value={
            lead.firstAttemptResponseHours != null
              ? `${lead.firstAttemptResponseHours.toFixed(1)} h`
              : '—'
          }
          hint={formatWhen(lead.firstAttemptAt)}
        />
        <Metric
          label="1st contact"
          value={
            lead.firstContactResponseHours != null
              ? `${lead.firstContactResponseHours.toFixed(1)} h`
              : '—'
          }
          hint={formatWhen(lead.firstContactAt)}
        />
        <Metric
          label="Response basis"
          value={lead.responseBasis}
          hint={formatWhen(lead.sourceCreatedAt ?? lead.createdAt)}
        />
        <Metric
          label="Last contact"
          value={formatWhen(lead.lastContactAt)}
          hint={lead.firstContactChannel ?? lead.firstAttemptChannel ?? '—'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <form
            onSubmit={onSaveProfile}
            className="space-y-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700"
          >
            <h2 className="text-sm uppercase tracking-wide text-slate-600">
              Prospect
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <TextInput
                  name="firstName"
                  defaultValue={lead.firstName}
                  required
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Last name">
                <TextInput
                  name="lastName"
                  defaultValue={lead.lastName}
                  required
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Cellphone">
                <TextInput
                  name="cellphone"
                  defaultValue={lead.cellphone}
                  required
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Email">
                <TextInput
                  name="email"
                  type="email"
                  defaultValue={lead.email ?? ''}
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Area">
                <TextInput
                  name="area"
                  defaultValue={lead.area ?? ''}
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Salary band">
                <TextInput
                  name="salaryBand"
                  defaultValue={lead.salaryBand ?? ''}
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Rental type">
                <TextInput
                  name="rentalType"
                  defaultValue={lead.rentalType ?? ''}
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Vehicle needed timing">
                <TextInput
                  name="vehicleNeededTiming"
                  defaultValue={lead.vehicleNeededTiming ?? ''}
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Vehicle preference">
                <TextInput
                  name="vehiclePreference"
                  defaultValue={lead.vehiclePreference ?? ''}
                  disabled={!canWrite}
                />
              </Field>
              <Field label="Valid drivers licence">
                <TextSelect
                  name="hasValidDriversLicence"
                  defaultValue={
                    lead.hasValidDriversLicence == null
                      ? ''
                      : String(lead.hasValidDriversLicence)
                  }
                  disabled={!canWrite}
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </TextSelect>
              </Field>
              <Field label="Notes">
                <TextTextarea
                  name="notes"
                  rows={3}
                  defaultValue={lead.notes ?? ''}
                  disabled={!canWrite}
                />
              </Field>
            </div>
            {canWrite ? (
              <FormActions>
                <PrimaryButton type="submit" disabled={patch.isPending}>
                  {patch.isPending ? 'Saving…' : 'Save prospect'}
                </PrimaryButton>
              </FormActions>
            ) : null}
          </form>

          <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
            <h2 className="text-sm uppercase tracking-wide text-slate-600">
              Attribution
            </h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Attr label="Campaign" value={lead.campaignName ?? lead.campaignId} />
              <Attr label="Ad set" value={lead.adSetName ?? lead.adSetId} />
              <Attr label="Ad" value={lead.adName ?? lead.adId} />
              <Attr label="Form" value={lead.formName ?? lead.formId} />
              <Attr label="Creative label" value={lead.creativeLabel} />
              <Attr label="Platform" value={lead.platform} />
              <Attr label="External ID" value={lead.externalLeadId} />
              <Attr
                label="UTM"
                value={[lead.utmSource, lead.utmMedium, lead.utmCampaign]
                  .filter(Boolean)
                  .join(' / ') || null}
              />
            </dl>
          </div>

          {lead.possibleDuplicates.length > 0 ? (
            <div className="rounded-lg border border-warning/40 bg-surface p-4 dark:border-slate-700">
              <h2 className="text-sm uppercase tracking-wide text-slate-600">
                Possible duplicates
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {lead.possibleDuplicates.map((dup) => (
                  <li key={dup.id}>
                    <Link
                      href={`/leads/${dup.id}`}
                      className="text-brand hover:underline"
                    >
                      {dup.firstName} {dup.lastName}
                    </Link>
                    <span className="text-slate-600">
                      {' '}
                      · {dup.cellphone} · {label(dup.stage)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
              <h2 className="text-sm uppercase tracking-wide text-slate-600">
                Stage history
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(stagesQuery.data ?? []).length === 0 ? (
                  <li className="text-slate-600">No stage changes yet.</li>
                ) : null}
                {(stagesQuery.data ?? []).map((entry) => (
                  <li key={entry.id} className="border-b border-slate-100 pb-2 dark:border-slate-800">
                    <p className="text-navy">
                      {entry.fromStage ? label(entry.fromStage) : '—'} →{' '}
                      {label(entry.toStage)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatWhen(entry.changedAt)}
                      {entry.actorUser
                        ? ` · ${entry.actorUser.fullName}`
                        : ''}
                      {entry.reason ? ` · ${entry.reason}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
              <h2 className="text-sm uppercase tracking-wide text-slate-600">
                Assignments
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(assignmentsQuery.data ?? []).length === 0 ? (
                  <li className="text-slate-600">No assignments yet.</li>
                ) : null}
                {(assignmentsQuery.data ?? []).map((entry) => (
                  <li key={entry.id} className="border-b border-slate-100 pb-2 dark:border-slate-800">
                    <p className="text-navy">{entry.user.fullName}</p>
                    <p className="text-xs text-slate-600">
                      {formatWhen(entry.assignedAt)}
                      {entry.unassignedAt
                        ? ` → ${formatWhen(entry.unassignedAt)}`
                        : ' · current'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
            <h2 className="text-sm uppercase tracking-wide text-slate-600">
              Workflow
            </h2>
            {!canWrite || terminal ? (
              <p className="mt-3 text-sm text-slate-600">
                {terminal
                  ? 'Terminal lead — history only.'
                  : 'Read-only for your role.'}
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-sm">
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    patch.mutate({
                      mark: 'attempt',
                      channel: String(
                        form.get('channel'),
                      ) as LeadContactChannel,
                    });
                  }}
                >
                  <Field label="Attempt channel">
                    <TextSelect name="channel" defaultValue="PHONE" required>
                      {CHANNELS.map((channel) => (
                        <option key={channel} value={channel}>
                          {label(channel)}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <SecondaryButton type="submit" disabled={patch.isPending}>
                    Log attempt
                  </SecondaryButton>
                </form>

                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    patch.mutate({
                      mark: 'contacted',
                      channel: String(
                        form.get('channel'),
                      ) as LeadContactChannel,
                    });
                  }}
                >
                  <Field label="Contact channel">
                    <TextSelect name="channel" defaultValue="PHONE" required>
                      {CHANNELS.map((channel) => (
                        <option key={channel} value={channel}>
                          {label(channel)}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <SecondaryButton type="submit" disabled={patch.isPending}>
                    Mark contacted
                  </SecondaryButton>
                </form>

                <SecondaryButton
                  type="button"
                  disabled={patch.isPending}
                  onClick={() => patch.mutate({ mark: 'qualify' })}
                >
                  Qualify
                </SecondaryButton>

                <form
                  className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    patch.mutate({
                      mark: 'unqualify',
                      disqualificationReason: String(
                        form.get('disqualificationReason'),
                      ) as LeadDisqualificationReason,
                      disqualificationNotes: emptyToNull(
                        form.get('disqualificationNotes'),
                      ),
                    });
                  }}
                >
                  <Field label="Unqualify reason">
                    <TextSelect
                      name="disqualificationReason"
                      defaultValue="OTHER"
                      required
                    >
                      {DISQUALIFY_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {label(reason)}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <Field label="Notes">
                    <TextInput name="disqualificationNotes" />
                  </Field>
                  <SecondaryButton type="submit" disabled={patch.isPending}>
                    Unqualify
                  </SecondaryButton>
                </form>

                <SecondaryButton
                  type="button"
                  disabled={patch.isPending}
                  onClick={() => patch.mutate({ mark: 'request_documents' })}
                >
                  Request documents
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  disabled={patch.isPending}
                  onClick={() => patch.mutate({ mark: 'documents_received' })}
                >
                  Documents received
                </SecondaryButton>

                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    patch.mutate({
                      mark: 'advance',
                      advanceTo: String(form.get('advanceTo')) as LeadStage,
                    });
                  }}
                >
                  <Field label="Advance to">
                    <TextSelect
                      name="advanceTo"
                      defaultValue="APPLICATION_SUBMITTED"
                      required
                    >
                      {ADVANCE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {label(stage)}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <SecondaryButton type="submit" disabled={patch.isPending}>
                    Advance stage
                  </SecondaryButton>
                </form>

                <SecondaryButton
                  type="button"
                  disabled={patch.isPending}
                  onClick={() => {
                    if (confirm('Close this lead as won?')) {
                      patch.mutate({ mark: 'close_won' });
                    }
                  }}
                >
                  Close won
                </SecondaryButton>

                <form
                  className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    patch.mutate({
                      mark: 'close_lost',
                      lossReason: String(
                        form.get('lossReason'),
                      ) as LeadLossReason,
                      lossNotes: emptyToNull(form.get('lossNotes')),
                    });
                  }}
                >
                  <Field label="Close lost reason">
                    <TextSelect name="lossReason" defaultValue="OTHER" required>
                      {LOSS_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {label(reason)}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <Field label="Notes">
                    <TextInput name="lossNotes" />
                  </Field>
                  <SecondaryButton type="submit" disabled={patch.isPending}>
                    Close lost
                  </SecondaryButton>
                </form>
              </div>
            )}
          </div>

          {canAssign ? (
            <form
              className="space-y-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const selected = emptyToNull(form.get('assigneePick'));
                const typed = emptyToNull(form.get('userId'));
                const userId = selected ?? typed;
                if (!userId) {
                  setError('Choose or enter an assignee user ID');
                  return;
                }
                assign.mutate({
                  userId,
                  reason: emptyToNull(form.get('reason')),
                });
              }}
            >
              <h2 className="text-sm uppercase tracking-wide text-slate-600">
                Assign
              </h2>
              {assigneeOptions.length > 0 ? (
                <Field label="Known assignees">
                  <TextSelect name="assigneePick" defaultValue="">
                    <option value="">Select…</option>
                    {assigneeOptions.map((option) => (
                      <option key={option.userId} value={option.userId}>
                        {option.fullName}
                      </option>
                    ))}
                  </TextSelect>
                </Field>
              ) : null}
              <Field label="Or user ID">
                <TextInput name="userId" placeholder="UUID" />
              </Field>
              <Field label="Reason">
                <TextInput name="reason" />
              </Field>
              <PrimaryButton type="submit" disabled={assign.isPending}>
                {assign.isPending ? 'Assigning…' : 'Assign lead'}
              </PrimaryButton>
            </form>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
            <h2 className="text-sm uppercase tracking-wide text-slate-600">
              Client
            </h2>
            {lead.client ? (
              <p className="mt-3 text-sm">
                Linked to{' '}
                <Link
                  href={`/clients/${lead.client.id}`}
                  className="text-brand hover:underline"
                >
                  {lead.client.firstName} {lead.client.lastName}
                </Link>
              </p>
            ) : canWrite ? (
              <div className="mt-3 space-y-4">
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const clientId = String(form.get('clientId') ?? '');
                    if (!clientId) return;
                    convert.mutate({ clientId });
                  }}
                >
                  <Field label="Link existing client">
                    <TextSelect name="clientId" defaultValue="" required>
                      <option value="" disabled>
                        Select client
                      </option>
                      {(clientsQuery.data ?? []).map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.firstName} {client.lastName} · {client.phone}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <SecondaryButton type="submit" disabled={convert.isPending}>
                    Link client
                  </SecondaryButton>
                </form>
                <form
                  className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    convert.mutate({
                      create: {
                        firstName: String(form.get('firstName') ?? '').trim(),
                        lastName: String(form.get('lastName') ?? '').trim(),
                        idNumber: String(form.get('idNumber') ?? '').trim(),
                        email: emptyToNull(form.get('email')),
                        phone: String(form.get('phone') ?? '').trim(),
                        altPhone: emptyToNull(form.get('altPhone')),
                        addressLine1: String(
                          form.get('addressLine1') ?? '',
                        ).trim(),
                        addressLine2: emptyToNull(form.get('addressLine2')),
                        city: String(form.get('city') ?? '').trim(),
                        province: emptyToNull(form.get('province')),
                        postalCode: emptyToNull(form.get('postalCode')),
                        notes: emptyToNull(form.get('notes')),
                      },
                    });
                  }}
                >
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Or create client
                  </p>
                  <Field label="First name">
                    <TextInput
                      name="firstName"
                      defaultValue={lead.firstName}
                      required
                    />
                  </Field>
                  <Field label="Last name">
                    <TextInput
                      name="lastName"
                      defaultValue={lead.lastName}
                      required
                    />
                  </Field>
                  <Field label="ID number">
                    <TextInput name="idNumber" required />
                  </Field>
                  <Field label="Phone">
                    <TextInput
                      name="phone"
                      defaultValue={lead.cellphone}
                      required
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      name="email"
                      type="email"
                      defaultValue={lead.email ?? ''}
                    />
                  </Field>
                  <Field label="Address line 1">
                    <TextInput name="addressLine1" required />
                  </Field>
                  <Field label="City">
                    <TextInput name="city" required />
                  </Field>
                  <Field label="Province">
                    <TextInput name="province" />
                  </Field>
                  <Field label="Postal code">
                    <TextInput name="postalCode" />
                  </Field>
                  <PrimaryButton type="submit" disabled={convert.isPending}>
                    {convert.isPending ? 'Creating…' : 'Create & link'}
                  </PrimaryButton>
                </form>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">Not linked yet.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({
  label: title,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
        {title}
      </p>
      <p className="mt-2 text-xl font-semibold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

function Attr({ label: title, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-600">{title}</dt>
      <dd className="text-navy">{value || '—'}</dd>
    </div>
  );
}
