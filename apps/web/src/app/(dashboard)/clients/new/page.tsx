'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
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
import { api, FicaStatus } from '@/lib/api';

export default function NewClientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const client = await api.createClient({
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
      router.push(`/clients/${client.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-brand hover:underline">
          ← Back to clients
        </Link>
        <h1 className="mt-2 text-3xl text-navy">
          Add client
        </h1>
        <p className="mt-1 text-brand-grey">
          Capture renter details and FICA document Storage URLs.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
          <Field label="First name">
            <TextInput name="firstName" required />
          </Field>
          <Field label="Last name">
            <TextInput name="lastName" required />
          </Field>
          <Field label="ID number">
            <TextInput name="idNumber" required />
          </Field>
          <Field label="Phone">
            <TextInput name="phone" required />
          </Field>
          <Field label="Alt phone">
            <TextInput name="altPhone" />
          </Field>
          <Field label="Email">
            <TextInput name="email" type="email" />
          </Field>
          <Field label="Address line 1">
            <TextInput name="addressLine1" required className="md:col-span-2" />
          </Field>
          <Field label="Address line 2">
            <TextInput name="addressLine2" />
          </Field>
          <Field label="City">
            <TextInput name="city" required />
          </Field>
          <Field label="Province">
            <TextInput name="province" defaultValue="Gauteng" />
          </Field>
          <Field label="Postal code">
            <TextInput name="postalCode" />
          </Field>
          <Field label="FICA status">
            <TextSelect name="ficaStatus" defaultValue="PENDING">
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="COMPLETE">Complete</option>
              <option value="REJECTED">Rejected</option>
            </TextSelect>
          </Field>
        </div>

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm uppercase tracking-wide text-brand-grey">
            FICA document URLs (Supabase Storage)
          </h2>
          <Field label="ID document URL">
            <TextInput name="idDocumentUrl" type="url" />
          </Field>
          <Field label="Driver's licence URL">
            <TextInput name="driversLicenseUrl" type="url" />
          </Field>
          <Field label="Payslips URL">
            <TextInput name="payslipsUrl" type="url" />
          </Field>
          <Field label="Bank statements URL">
            <TextInput name="bankStatementsUrl" type="url" />
          </Field>
          <Field label="Proof of residence URL">
            <TextInput name="proofOfResidenceUrl" type="url" />
          </Field>
          <Field label="Notes">
            <TextTextarea name="notes" rows={3} />
          </Field>
        </div>

        <FormActions error={error}>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create client'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push('/clients')}>
            Cancel
          </SecondaryButton>
        </FormActions>
      </form>
    </section>
  );
}
