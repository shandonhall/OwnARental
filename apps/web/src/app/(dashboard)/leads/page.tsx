'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  hasPermission,
  type CreateLeadInput,
  type Lead,
  type LeadCreativeType,
  type LeadQualificationStatus,
  type LeadSource,
  type LeadStage,
} from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/permission-gate';
import { useTableSort } from '@/lib/table-sort';
import {
  Field,
  FormActions,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  TextSelect,
  TextTextarea,
} from '@/components/form';

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

const QUALIFICATIONS: LeadQualificationStatus[] = [
  'UNASSESSED',
  'QUALIFIED',
  'UNQUALIFIED',
];

const CREATIVE_TYPES: LeadCreativeType[] = ['VIDEO', 'GRAPHIC', 'UNKNOWN'];

const ALL_SOURCES: LeadSource[] = [
  'META_LEAD_FORM',
  'WEBSITE',
  'MANUAL',
  'PHONE_IN',
  'FACEBOOK_MESSENGER',
  'OTHER',
];

const SALES_SOURCES: LeadSource[] = ['MANUAL', 'PHONE_IN'];

function stageLabel(stage: string) {
  return stage.replaceAll('_', ' ');
}

function shortDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
  });
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Loading leads…</p>}>
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<LeadStage | 'ALL'>(() => {
    const value = searchParams.get('stage');
    return STAGES.includes(value as LeadStage) ? (value as LeadStage) : 'ALL';
  });
  const [qualification, setQualification] = useState<
    LeadQualificationStatus | 'ALL'
  >(() => {
    const value = searchParams.get('qualification');
    return QUALIFICATIONS.includes(value as LeadQualificationStatus)
      ? (value as LeadQualificationStatus)
      : 'ALL';
  });
  const [creativeType, setCreativeType] = useState<LeadCreativeType | 'ALL'>(
    () => {
      const value = searchParams.get('creativeType');
      return CREATIVE_TYPES.includes(value as LeadCreativeType)
        ? (value as LeadCreativeType)
        : 'ALL';
    },
  );
  const [source, setSource] = useState<LeadSource | 'ALL'>(() => {
    const value = searchParams.get('source');
    return ALL_SOURCES.includes(value as LeadSource)
      ? (value as LeadSource)
      : 'ALL';
  });
  const [queue, setQueue] = useState<'ALL' | 'MINE' | 'UNASSIGNED'>(() => {
    if (searchParams.get('unassigned') === 'true') return 'UNASSIGNED';
    if (searchParams.get('mine') === 'true') return 'MINE';
    return 'ALL';
  });
  const [notAttemptedOnly, setNotAttemptedOnly] = useState(
    () => searchParams.get('notAttempted') === 'true',
  );
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [showCreate, setShowCreate] = useState(false);
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

  const listParams = useMemo(
    () => ({
      mine: queue === 'MINE' ? true : undefined,
      unassigned: queue === 'UNASSIGNED' ? true : undefined,
      stage: stage === 'ALL' ? undefined : stage,
      qualification: qualification === 'ALL' ? undefined : qualification,
      creativeType: creativeType === 'ALL' ? undefined : creativeType,
      source: source === 'ALL' ? undefined : source,
      search: search.trim() || undefined,
    }),
    [queue, stage, qualification, creativeType, source, search],
  );

  const query = useQuery({
    queryKey: ['leads', listParams],
    queryFn: () => api.getLeads(listParams),
  });

  const rows = useMemo(() => {
    const data = Array.isArray(query.data) ? query.data : [];
    if (!notAttemptedOnly) return data;
    return data.filter(
      (lead) =>
        lead.firstAttemptAt == null &&
        lead.stage !== 'CLOSED_WON' &&
        lead.stage !== 'CLOSED_LOST',
    );
  }, [query.data, notAttemptedOnly]);

  const accessors = useMemo(
    () => ({
      name: (lead: Lead) => `${lead.lastName} ${lead.firstName}`,
      cellphone: (lead: Lead) => lead.cellphone,
      stage: (lead: Lead) => lead.stage,
      qualification: (lead: Lead) => lead.qualificationStatus,
      creative: (lead: Lead) => lead.creativeType,
      source: (lead: Lead) => lead.source,
      assignee: (lead: Lead) => lead.assignedUser?.fullName ?? '',
      created: (lead: Lead) => lead.createdAt,
      attemptHrs: (lead: Lead) => lead.firstAttemptResponseHours ?? -1,
    }),
    [],
  );

  const { sorted, SortTh } = useTableSort(rows, accessors, 'created');

  const createSources = canAssign ? ALL_SOURCES : SALES_SOURCES;

  const create = useMutation({
    mutationFn: (body: CreateLeadInput) => api.createLead(body),
    onSuccess: async (lead) => {
      setShowCreate(false);
      setMessage('Lead created');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      router.push(`/leads/${lead.id}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Create failed');
    },
  });

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const licenceRaw = String(form.get('hasValidDriversLicence') ?? '');
    create.mutate({
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
      source: String(form.get('source') ?? 'MANUAL') as LeadSource,
      notes: emptyToNull(form.get('notes')),
      assignedUserId: canAssign
        ? emptyToNull(form.get('assignedUserId'))
        : undefined,
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl text-navy">Leads</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Sales queue — contact, qualify, and convert prospects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission={Permission.LEADS_REPORTS}>
            <Link
              href="/leads/insights"
              className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1a2832] transition hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
            >
              Insights
            </Link>
          </PermissionGate>
          {canWrite ? (
            <PrimaryButton type="button" onClick={() => setShowCreate(true)}>
              Create lead
            </PrimaryButton>
          ) : null}
        </div>
      </div>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['ALL', 'All'],
              ...(canAssign
                ? ([
                    ['MINE', 'Mine'],
                    ['UNASSIGNED', 'Unassigned'],
                  ] as const)
                : []),
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setQueue(value)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                queue === value
                  ? 'bg-brand/15 text-brand'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNotAttemptedOnly((prev) => !prev)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              notAttemptedOnly
                ? 'bg-navy/10 text-navy'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800'
            }`}
          >
            Not attempted
          </button>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, phone, email"
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:w-72 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Stage">
          <TextSelect
            value={stage}
            onChange={(event) =>
              setStage(event.target.value as LeadStage | 'ALL')
            }
          >
            <option value="ALL">All stages</option>
            {STAGES.map((value) => (
              <option key={value} value={value}>
                {stageLabel(value)}
              </option>
            ))}
          </TextSelect>
        </Field>
        <Field label="Qualification">
          <TextSelect
            value={qualification}
            onChange={(event) =>
              setQualification(
                event.target.value as LeadQualificationStatus | 'ALL',
              )
            }
          >
            <option value="ALL">All</option>
            {QUALIFICATIONS.map((value) => (
              <option key={value} value={value}>
                {stageLabel(value)}
              </option>
            ))}
          </TextSelect>
        </Field>
        <Field label="Creative">
          <TextSelect
            value={creativeType}
            onChange={(event) =>
              setCreativeType(event.target.value as LeadCreativeType | 'ALL')
            }
          >
            <option value="ALL">All</option>
            {CREATIVE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </TextSelect>
        </Field>
        <Field label="Source">
          <TextSelect
            value={source}
            onChange={(event) =>
              setSource(event.target.value as LeadSource | 'ALL')
            }
          >
            <option value="ALL">All</option>
            {ALL_SOURCES.map((value) => (
              <option key={value} value={value}>
                {stageLabel(value)}
              </option>
            ))}
          </TextSelect>
        </Field>
      </div>

      {showCreate && canWrite ? (
        <form
          onSubmit={onCreate}
          className="space-y-3 rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700"
        >
          <h2 className="text-sm uppercase tracking-wide text-slate-600">
            New lead
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <TextInput name="firstName" required />
            </Field>
            <Field label="Last name">
              <TextInput name="lastName" required />
            </Field>
            <Field label="Cellphone">
              <TextInput name="cellphone" required />
            </Field>
            <Field label="Email">
              <TextInput name="email" type="email" />
            </Field>
            <Field label="Area">
              <TextInput name="area" />
            </Field>
            <Field label="Salary band">
              <TextInput name="salaryBand" />
            </Field>
            <Field label="Rental type">
              <TextInput name="rentalType" />
            </Field>
            <Field label="Vehicle needed timing">
              <TextInput name="vehicleNeededTiming" />
            </Field>
            <Field label="Vehicle preference">
              <TextInput name="vehiclePreference" />
            </Field>
            <Field label="Valid drivers licence">
              <TextSelect name="hasValidDriversLicence" defaultValue="">
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </TextSelect>
            </Field>
            <Field label="Source">
              <TextSelect name="source" defaultValue="MANUAL" required>
                {createSources.map((value) => (
                  <option key={value} value={value}>
                    {stageLabel(value)}
                  </option>
                ))}
              </TextSelect>
            </Field>
            {canAssign ? (
              <Field label="Assign to user ID (optional)">
                <TextInput name="assignedUserId" placeholder="UUID" />
              </Field>
            ) : null}
            <Field label="Notes">
              <TextTextarea name="notes" rows={2} />
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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600 dark:border-slate-700">
            <tr>
              <SortTh column="name">Lead</SortTh>
              <SortTh column="cellphone">Phone</SortTh>
              <SortTh column="stage">Stage</SortTh>
              <SortTh column="qualification">Qualification</SortTh>
              <SortTh column="creative">Creative</SortTh>
              <SortTh column="source">Source</SortTh>
              <SortTh column="assignee">Assignee</SortTh>
              <SortTh column="created">Created</SortTh>
              <SortTh column="attemptHrs" align="right">
                1st attempt (h)
              </SortTh>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-slate-600">
                  Loading leads…
                </td>
              </tr>
            ) : null}
            {query.isError ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-danger">
                  Could not load leads.
                </td>
              </tr>
            ) : null}
            {!query.isLoading && sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-slate-600">
                  No leads match this filter.
                </td>
              </tr>
            ) : null}
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-navy hover:text-brand"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {lead.firstName} {lead.lastName}
                  </Link>
                  {lead.area ? (
                    <p className="text-xs text-slate-600">{lead.area}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{lead.cellphone}</td>
                <td className="px-4 py-3">{stageLabel(lead.stage)}</td>
                <td className="px-4 py-3">
                  {stageLabel(lead.qualificationStatus)}
                </td>
                <td className="px-4 py-3">{lead.creativeType}</td>
                <td className="px-4 py-3">{stageLabel(lead.source)}</td>
                <td className="px-4 py-3">
                  {lead.assignedUser?.fullName ?? '—'}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {shortDate(lead.createdAt)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {lead.firstAttemptResponseHours != null
                    ? lead.firstAttemptResponseHours.toFixed(1)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
