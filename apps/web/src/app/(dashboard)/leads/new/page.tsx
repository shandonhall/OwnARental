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
import { api, type LeadSource } from '@/lib/api';

export default function NewLeadPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const licence = String(form.get('hasValidDriversLicence') ?? '');
      const lead = await api.createLead({
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
        hasValidDriversLicence:
          licence === '' ? null : licence === 'true',
        source: String(form.get('source') ?? 'MANUAL') as LeadSource,
        sourceDetail: emptyToNull(String(form.get('sourceDetail') ?? '')),
        notes: emptyToNull(String(form.get('notes') ?? '')),
      });
      router.push(`/leads/${lead.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-brand hover:underline">
          ← Back to leads
        </Link>
        <h1 className="mt-2 text-3xl text-navy">Add lead</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Capture a walk-in, phone-in, or website enquiry onto the sales board.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-surface p-4 md:grid-cols-2 dark:border-slate-700">
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
            <TextInput name="salaryBand" placeholder="e.g. R15k–R20k" />
          </Field>
          <Field label="Rental type">
            <TextInput name="rentalType" placeholder="Monthly / rent-to-own" />
          </Field>
          <Field label="When they need a vehicle">
            <TextInput name="vehicleNeededTiming" />
          </Field>
          <Field label="Vehicle preference">
            <TextInput name="vehiclePreference" />
          </Field>
          <Field label="Valid driver’s licence">
            <TextSelect name="hasValidDriversLicence" defaultValue="">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </TextSelect>
          </Field>
          <Field label="Source">
            <TextSelect name="source" defaultValue="MANUAL">
              <option value="MANUAL">Manual</option>
              <option value="PHONE_IN">Phone-in</option>
              <option value="WEBSITE">Website</option>
              <option value="META_LEAD_FORM">Meta lead form</option>
              <option value="FACEBOOK_MESSENGER">Facebook Messenger</option>
              <option value="OTHER">Other</option>
            </TextSelect>
          </Field>
          <Field label="Source detail">
            <TextInput name="sourceDetail" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Notes">
              <TextTextarea name="notes" rows={4} />
            </Field>
          </div>
        </div>

        <FormActions error={error}>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save lead'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push('/leads')}>
            Cancel
          </SecondaryButton>
        </FormActions>
      </form>
    </section>
  );
}
