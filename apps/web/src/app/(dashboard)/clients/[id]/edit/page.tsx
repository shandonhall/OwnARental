'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DangerButton,
  Field,
  FormActions,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  TextSelect,
  TextTextarea,
  emptyToNull,
} from '@/components/form';
import { api, FicaStatus, isAdminRole } from '@/lib/api';

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['client', params.id],
    queryFn: () => api.getClient(params.id),
    enabled: Boolean(params.id),
  });
  const me = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => api.getMe(),
    retry: false,
  });
  const canAdmin = me.data ? isAdminRole(me.data.role) : false;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      await api.updateClient(params.id, {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        idNumber: String(form.get('idNumber') ?? ''),
        phone: String(form.get('phone') ?? ''),
        email: emptyToNull(String(form.get('email') ?? '')),
        altPhone: emptyToNull(String(form.get('altPhone') ?? '')),
        addressLine1: String(form.get('addressLine1') ?? ''),
        addressLine2: emptyToNull(String(form.get('addressLine2') ?? '')),
        city: String(form.get('city') ?? ''),
        province: emptyToNull(String(form.get('province') ?? '')),
        postalCode: emptyToNull(String(form.get('postalCode') ?? '')),
        ficaStatus: String(form.get('ficaStatus') ?? 'PENDING') as FicaStatus,
        idDocumentUrl: emptyToNull(String(form.get('idDocumentUrl') ?? '')),
        driversLicenseUrl: emptyToNull(
          String(form.get('driversLicenseUrl') ?? ''),
        ),
        payslipsUrl: emptyToNull(String(form.get('payslipsUrl') ?? '')),
        bankStatementsUrl: emptyToNull(
          String(form.get('bankStatementsUrl') ?? ''),
        ),
        proofOfResidenceUrl: emptyToNull(
          String(form.get('proofOfResidenceUrl') ?? ''),
        ),
        notes: emptyToNull(String(form.get('notes') ?? '')),
      });
      router.push(`/clients/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
      setSaving(false);
    }
  }

  async function onDeactivate() {
    if (!confirm('Deactivate this client profile?')) return;
    setSaving(true);
    try {
      await api.deleteClient(params.id);
      router.push('/clients');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate');
      setSaving(false);
    }
  }

  if (query.isLoading) {
    return <p className="text-slate-600 dark:text-slate-300">Loading client…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Client not found.</p>;
  }

  const client = query.data;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/clients/${client.id}`}
          className="text-sm text-brand hover:underline"
        >
          ← Back to profile
        </Link>
        <h1 className="mt-2 text-3xl text-navy">
          Edit {client.firstName} {client.lastName}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4 md:grid-cols-2">
          <Field label="First name">
            <TextInput name="firstName" required defaultValue={client.firstName} />
          </Field>
          <Field label="Last name">
            <TextInput name="lastName" required defaultValue={client.lastName} />
          </Field>
          <Field label="ID number">
            <TextInput name="idNumber" required defaultValue={client.idNumber} />
          </Field>
          <Field label="Phone">
            <TextInput name="phone" required defaultValue={client.phone} />
          </Field>
          <Field label="Alt phone">
            <TextInput name="altPhone" defaultValue={client.altPhone ?? ''} />
          </Field>
          <Field label="Email">
            <TextInput
              name="email"
              type="email"
              defaultValue={client.email ?? ''}
            />
          </Field>
          <Field label="Address line 1">
            <TextInput
              name="addressLine1"
              required
              defaultValue={client.addressLine1}
            />
          </Field>
          <Field label="Address line 2">
            <TextInput
              name="addressLine2"
              defaultValue={client.addressLine2 ?? ''}
            />
          </Field>
          <Field label="City">
            <TextInput name="city" required defaultValue={client.city} />
          </Field>
          <Field label="Province">
            <TextInput name="province" defaultValue={client.province ?? ''} />
          </Field>
          <Field label="Postal code">
            <TextInput
              name="postalCode"
              defaultValue={client.postalCode ?? ''}
            />
          </Field>
          <Field label="FICA status">
            <TextSelect name="ficaStatus" defaultValue={client.ficaStatus}>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="COMPLETE">Complete</option>
              <option value="REJECTED">Rejected</option>
            </TextSelect>
          </Field>
        </div>

        <div className="grid gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            FICA document URLs (Supabase Storage)
          </h2>
          <Field label="ID document URL">
            <TextInput
              name="idDocumentUrl"
              type="url"
              defaultValue={client.idDocumentUrl ?? ''}
            />
          </Field>
          <Field label="Driver's licence URL">
            <TextInput
              name="driversLicenseUrl"
              type="url"
              defaultValue={client.driversLicenseUrl ?? ''}
            />
          </Field>
          <Field label="Payslips URL">
            <TextInput
              name="payslipsUrl"
              type="url"
              defaultValue={client.payslipsUrl ?? ''}
            />
          </Field>
          <Field label="Bank statements URL">
            <TextInput
              name="bankStatementsUrl"
              type="url"
              defaultValue={client.bankStatementsUrl ?? ''}
            />
          </Field>
          <Field label="Proof of residence URL">
            <TextInput
              name="proofOfResidenceUrl"
              type="url"
              defaultValue={client.proofOfResidenceUrl ?? ''}
            />
          </Field>
          <Field label="Notes">
            <TextTextarea
              name="notes"
              rows={3}
              defaultValue={client.notes ?? ''}
            />
          </Field>
        </div>

        <FormActions error={error}>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => router.push(`/clients/${client.id}`)}
          >
            Cancel
          </SecondaryButton>
          {canAdmin ? (
            <DangerButton type="button" disabled={saving} onClick={onDeactivate}>
              Deactivate
            </DangerButton>
          ) : null}
        </FormActions>
      </form>
    </section>
  );
}
