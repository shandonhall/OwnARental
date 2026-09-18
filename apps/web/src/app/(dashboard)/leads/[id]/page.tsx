'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  Field,
  FormActions,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  TextSelect,
  TextTextarea,
  emptyToNull,
} from '@/components/form';
import {
  api,
  roleLabel,
  type LeadContactChannel,
  type LeadDisqualificationReason,
  type LeadLossReason,
  type LeadQualificationStatus,
  type LeadStage,
} from '@/lib/api';

const STAGES: LeadStage[] = [
  'NEW',
  'CONTACTED',
  'QUALIFYING',
  'DOCUMENTS_REQUESTED',
  'APPLICATION_SUBMITTED',
  'APPROVED',
  'VEHICLE_SELECTED',
  'CLOSED_WON',
  'CLOSED_LOST',
];

function stamp(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const leadQuery = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.getLead(id),
  });
  const staffQuery = useQuery({
    queryKey: ['leads-staff'],
    queryFn: () => api.getLeadsStaff(),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['lead', id] });
    await queryClient.invalidateQueries({ queryKey: ['leads-board'] });
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const save = useMutation({
    mutationFn: (form: FormData) => {
      const licence = String(form.get('hasValidDriversLicence') ?? '');
      return api.updateLead(id, {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        cellphone: String(form.get('cellphone') ?? ''),
        email: emptyToNull(String(form.get('email') ?? '')),
        area: emptyToNull(String(form.get('area') ?? '')),
        salaryBand: emptyToNull(String(form.get('salaryBand') ?? '')),
        rentalType: emptyToNull(String(form.get('rentalType') ?? '')),
        vehicleNeededTiming: emptyToNull(
          String(form.get('vehicleNeededTiming') ?? ''),
        ),
        vehiclePreference: emptyToNull(
          String(form.get('vehiclePreference') ?? ''),
        ),
        hasValidDriversLicence: licence === '' ? null : licence === 'true',
        notes: emptyToNull(String(form.get('notes') ?? '')),
      });
    },
    onSuccess: async () => {
      setMessage('Details saved');
      await invalidate();
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Save failed'),
  });

  const stage = useMutation({
    mutationFn: (form: FormData) =>
      api.updateLeadStage(id, {
        stage: String(form.get('stage')) as LeadStage,
        reason: emptyToNull(String(form.get('reason') ?? '')),
        lossReason: emptyToNull(String(form.get('lossReason') ?? '')) as
          | LeadLossReason
          | null,
        lossNotes: emptyToNull(String(form.get('lossNotes') ?? '')),
      }),
    onSuccess: async () => {
      setMessage('Stage updated');
      await invalidate();
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Stage update failed'),
  });

  const assign = useMutation({
    mutationFn: (form: FormData) =>
      api.assignLead(id, {
        userId: emptyToNull(String(form.get('userId') ?? '')),
      }),
    onSuccess: async () => {
      setMessage('Assignment updated');
      await invalidate();
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Assign failed'),
  });

  const qualify = useMutation({
    mutationFn: (form: FormData) =>
      api.qualifyLead(id, {
        qualificationStatus: String(
          form.get('qualificationStatus'),
        ) as LeadQualificationStatus,
        disqualificationReason: emptyToNull(
          String(form.get('disqualificationReason') ?? ''),
        ) as LeadDisqualificationReason | null,
        disqualificationNotes: emptyToNull(
          String(form.get('disqualificationNotes') ?? ''),
        ),
      }),
    onSuccess: async () => {
      setMessage('Qualification updated');
      await invalidate();
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Qualify failed'),
  });

  const contact = useMutation({
    mutationFn: (form: FormData) =>
      api.logLeadContact(id, {
        outcome: String(form.get('outcome')) as 'attempted' | 'reached',
        channel: String(form.get('channel')) as LeadContactChannel,
      }),
    onSuccess: async () => {
      setMessage('Contact logged');
      await invalidate();
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Contact log failed'),
  });

  const convert = useMutation({
    mutationFn: (form: FormData) =>
      api.convertLead(id, {
        idNumber: String(form.get('idNumber') ?? ''),
        addressLine1: String(form.get('addressLine1') ?? ''),
        addressLine2: emptyToNull(String(form.get('addressLine2') ?? '')),
        city: String(form.get('city') ?? ''),
        province: emptyToNull(String(form.get('province') ?? '')),
        postalCode: emptyToNull(String(form.get('postalCode') ?? '')),
        markWon: form.get('markWon') === 'true',
      }),
    onSuccess: async (result) => {
      setMessage(
        result.client
          ? `Converted — linked to ${result.client.firstName} ${result.client.lastName}`
          : 'Converted to client',
      );
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) =>
      setMessage(
        error instanceof Error ? error.message : 'Convert to client failed',
      ),
  });

  const lead = leadQuery.data;
  const busy =
    save.isPending ||
    stage.isPending ||
    assign.isPending ||
    qualify.isPending ||
    contact.isPending ||
    convert.isPending;

  function onForm(
    mutation: { mutate: (form: FormData) => void },
  ) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      mutation.mutate(new FormData(event.currentTarget));
    };
  }

  return (
    <section className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-brand hover:underline">
          ← Back to leads
        </Link>
        <h1 className="mt-2 text-3xl text-navy">
          {lead ? lead.fullName : 'Lead'}
          {lead &&
          (lead.sourceDetail?.toUpperCase() === 'DEMO' ||
            lead.notes?.trim().toUpperCase().startsWith('[DEMO]')) ? (
            <span className="ml-3 align-middle rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
              Demo
            </span>
          ) : null}
        </h1>
        {lead ? (
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {lead.cellphone}
            {lead.email ? ` · ${lead.email}` : ''} ·{' '}
            {lead.source.replaceAll('_', ' ')}
            {lead.sourceDetail ? ` · ${lead.sourceDetail}` : ''} ·{' '}
            {lead.stage.replaceAll('_', ' ')}
          </p>
        ) : null}
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {leadQuery.isLoading ? (
        <p className="text-slate-600 dark:text-slate-300">Loading lead…</p>
      ) : null}
      {leadQuery.isError ? (
        <p className="text-danger">Could not load this lead.</p>
      ) : null}

      {lead ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
              <h2 className="text-sm font-medium text-navy">Pipeline</h2>
              <p className="mt-2 text-lg text-navy">
                {lead.stage.replaceAll('_', ' ')}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {lead.qualificationStatus.replaceAll('_', ' ')}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
              <h2 className="text-sm font-medium text-navy">Owner</h2>
              <p className="mt-2 text-lg text-navy">
                {lead.assignedUser?.fullName ?? 'Unassigned'}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {lead.assignedUser
                  ? roleLabel(lead.assignedUser.role)
                  : 'Assign so sales can follow up'}
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
              <h2 className="text-sm font-medium text-navy">Last contact</h2>
              <p className="mt-2 text-lg text-navy">
                {stamp(lead.lastContactAt)}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                First reached {stamp(lead.firstContactAt)}
              </p>
            </article>
          </div>

          {lead.client ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div>
                <p className="text-sm font-medium text-navy">
                  Linked client · {lead.client.firstName}{' '}
                  {lead.client.lastName}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  This lead has been converted into the clients book.
                </p>
              </div>
              <Link
                href={`/clients/${lead.client.id}`}
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#13729a]"
              >
                Open client
              </Link>
            </div>
          ) : (
            <form
              onSubmit={onForm(convert)}
              className="space-y-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700"
            >
              <div>
                <h2 className="text-sm font-medium text-navy">
                  Convert to client
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Creates a client from this lead (or links an existing ID
                  number). Name and phone come from the lead.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="ID number">
                  <TextInput name="idNumber" required maxLength={20} />
                </Field>
                <Field label="City">
                  <TextInput name="city" required defaultValue={lead.area ?? ''} />
                </Field>
                <Field label="Address line 1">
                  <TextInput name="addressLine1" required />
                </Field>
                <Field label="Address line 2">
                  <TextInput name="addressLine2" />
                </Field>
                <Field label="Province">
                  <TextInput name="province" />
                </Field>
                <Field label="Postal code">
                  <TextInput name="postalCode" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  name="markWon"
                  value="true"
                  defaultChecked
                  className="rounded border-slate-300"
                />
                Mark lead as won when converting
              </label>
              <FormActions>
                <PrimaryButton type="submit" disabled={busy}>
                  {convert.isPending ? 'Converting…' : 'Convert to client'}
                </PrimaryButton>
              </FormActions>
            </form>
          )}

          <form
            onSubmit={onForm(assign)}
            className="grid gap-3 rounded-lg border border-slate-200 bg-surface p-4 md:grid-cols-[1fr_auto] md:items-end dark:border-slate-700"
          >
            <Field label="Assign to">
              <TextSelect
                name="userId"
                defaultValue={lead.assignedUser?.id ?? ''}
                key={lead.assignedUser?.id ?? 'none'}
              >
                <option value="">Unassigned</option>
                {(staffQuery.data ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} · {roleLabel(user.role)}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <PrimaryButton type="submit" disabled={busy}>
              Save owner
            </PrimaryButton>
          </form>

          <form
            onSubmit={onForm(contact)}
            className="grid gap-3 rounded-lg border border-slate-200 bg-surface p-4 md:grid-cols-3 md:items-end dark:border-slate-700"
          >
            <Field label="Contact channel">
              <TextSelect name="channel" defaultValue="PHONE">
                <option value="PHONE">Phone</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="OTHER">Other</option>
              </TextSelect>
            </Field>
            <Field label="Outcome">
              <TextSelect name="outcome" defaultValue="reached">
                <option value="attempted">Attempted</option>
                <option value="reached">Reached</option>
              </TextSelect>
            </Field>
            <PrimaryButton type="submit" disabled={busy}>
              Log contact
            </PrimaryButton>
          </form>

          <form
            onSubmit={onForm(stage)}
            className="grid gap-3 rounded-lg border border-slate-200 bg-surface p-4 md:grid-cols-2 dark:border-slate-700"
          >
            <Field label="Stage">
              <TextSelect name="stage" defaultValue={lead.stage} key={lead.stage}>
                {STAGES.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Reason / note">
              <TextInput name="reason" />
            </Field>
            <Field label="Loss reason (if lost)">
              <TextSelect
                name="lossReason"
                defaultValue={lead.lossReason ?? ''}
              >
                <option value="">None</option>
                <option value="APPLICATION_DECLINED">Application declined</option>
                <option value="CUSTOMER_WITHDREW">Customer withdrew</option>
                <option value="NO_SUITABLE_VEHICLE">No suitable vehicle</option>
                <option value="UNREACHABLE">Unreachable</option>
                <option value="DUPLICATE">Duplicate</option>
                <option value="OTHER">Other</option>
              </TextSelect>
            </Field>
            <Field label="Loss notes">
              <TextInput name="lossNotes" defaultValue={lead.lossNotes ?? ''} />
            </Field>
            <div className="md:col-span-2">
              <PrimaryButton type="submit" disabled={busy}>
                Update stage
              </PrimaryButton>
            </div>
          </form>

          <form
            onSubmit={onForm(qualify)}
            className="grid gap-3 rounded-lg border border-slate-200 bg-surface p-4 md:grid-cols-2 dark:border-slate-700"
          >
            <Field label="Qualification">
              <TextSelect
                name="qualificationStatus"
                defaultValue={lead.qualificationStatus}
                key={lead.qualificationStatus}
              >
                <option value="UNASSESSED">Unassessed</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="UNQUALIFIED">Unqualified</option>
              </TextSelect>
            </Field>
            <Field label="Disqualify reason">
              <TextSelect
                name="disqualificationReason"
                defaultValue={lead.disqualificationReason ?? ''}
              >
                <option value="">None</option>
                <option value="UBER_BOLT">Uber / Bolt</option>
                <option value="AFFORDABILITY">Affordability</option>
                <option value="INVALID_OR_NO_DRIVERS_LICENCE">
                  Invalid / no licence
                </option>
                <option value="UNREACHABLE">Unreachable</option>
                <option value="NOT_INTERESTED">Not interested</option>
                <option value="OUTSIDE_REQUIREMENTS">Outside requirements</option>
                <option value="NO_SUITABLE_VEHICLE">No suitable vehicle</option>
                <option value="DUPLICATE">Duplicate</option>
                <option value="OTHER">Other</option>
              </TextSelect>
            </Field>
            <div className="md:col-span-2">
              <Field label="Disqualify notes">
                <TextInput
                  name="disqualificationNotes"
                  defaultValue={lead.disqualificationNotes ?? ''}
                />
              </Field>
            </div>
            <PrimaryButton type="submit" disabled={busy}>
              Save qualification
            </PrimaryButton>
          </form>

          <form
            onSubmit={onForm(save)}
            className="space-y-4 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700"
          >
            <h2 className="text-sm font-medium text-navy">Enquiry details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name">
                <TextInput name="firstName" defaultValue={lead.firstName} required />
              </Field>
              <Field label="Last name">
                <TextInput name="lastName" defaultValue={lead.lastName} required />
              </Field>
              <Field label="Cellphone">
                <TextInput name="cellphone" defaultValue={lead.cellphone} required />
              </Field>
              <Field label="Email">
                <TextInput name="email" defaultValue={lead.email ?? ''} />
              </Field>
              <Field label="Area">
                <TextInput name="area" defaultValue={lead.area ?? ''} />
              </Field>
              <Field label="Salary band">
                <TextInput name="salaryBand" defaultValue={lead.salaryBand ?? ''} />
              </Field>
              <Field label="Rental type">
                <TextInput name="rentalType" defaultValue={lead.rentalType ?? ''} />
              </Field>
              <Field label="When they need a vehicle">
                <TextInput
                  name="vehicleNeededTiming"
                  defaultValue={lead.vehicleNeededTiming ?? ''}
                />
              </Field>
              <Field label="Vehicle preference">
                <TextInput
                  name="vehiclePreference"
                  defaultValue={lead.vehiclePreference ?? ''}
                />
              </Field>
              <Field label="Valid driver’s licence">
                <TextSelect
                  name="hasValidDriversLicence"
                  defaultValue={
                    lead.hasValidDriversLicence == null
                      ? ''
                      : String(lead.hasValidDriversLicence)
                  }
                >
                  <option value="">Unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </TextSelect>
              </Field>
              <div className="md:col-span-2">
                <Field label="Notes">
                  <TextTextarea name="notes" rows={4} defaultValue={lead.notes ?? ''} />
                </Field>
              </div>
            </div>
            <FormActions>
              <PrimaryButton type="submit" disabled={busy}>
                Save details
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => leadQuery.refetch()}>
                Reset
              </SecondaryButton>
            </FormActions>
          </form>

          {lead.campaignName || lead.formName || lead.externalLeadId ? (
            <article className="rounded-lg border border-slate-200 bg-surface p-4 text-sm dark:border-slate-700">
              <h2 className="font-medium text-navy">Campaign</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                {lead.campaignName ?? 'Campaign not named'}
                {lead.adName ? ` · ${lead.adName}` : ''}
              </p>
              {lead.formName ? (
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Form {lead.formName}
                </p>
              ) : null}
              {lead.externalLeadId ? (
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {lead.externalLeadId}
                </p>
              ) : null}
            </article>
          ) : null}

          <article className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
            <h2 className="text-sm font-medium text-navy">Stage history</h2>
            <ul className="mt-3 space-y-2">
              {lead.stageHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="text-sm text-slate-700 dark:text-slate-200"
                >
                  <span className="font-medium">
                    {(entry.fromStage ?? '—').replaceAll('_', ' ')} →{' '}
                    {entry.toStage.replaceAll('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {' '}
                    · {stamp(entry.changedAt)}
                    {entry.actor ? ` · ${entry.actor.fullName}` : ''}
                  </span>
                  {entry.reason ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {entry.reason}
                    </p>
                  ) : null}
                </li>
              ))}
              {lead.stageHistory.length === 0 ? (
                <li className="text-sm text-slate-600">No history yet.</li>
              ) : null}
            </ul>
          </article>
        </>
      ) : null}
    </section>
  );
}
