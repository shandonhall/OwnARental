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
import { api, VehicleStatus } from '@/lib/api';

export default function NewVehiclePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const mileage = emptyToNull(String(form.get('monthlyMileageLimit') ?? ''));
    const warrantyKm = emptyToNull(String(form.get('warrantyKmLimit') ?? ''));
    const serviceKm = emptyToNull(String(form.get('nextServiceDueKm') ?? ''));

    try {
      const vehicle = await api.createVehicle({
        make: String(form.get('make') ?? ''),
        model: String(form.get('model') ?? ''),
        year: Number(form.get('year')),
        color: emptyToNull(String(form.get('color') ?? '')),
        vin: String(form.get('vin') ?? ''),
        registration: String(form.get('registration') ?? ''),
        purchasePrice: Number(form.get('purchasePrice')),
        purchaseDate: emptyToNull(String(form.get('purchaseDate') ?? '')),
        status: String(form.get('status') ?? 'AVAILABLE') as VehicleStatus,
        monthlyMileageLimit: mileage ? Number(mileage) : null,
        carTrackDeviceId: emptyToNull(String(form.get('carTrackDeviceId') ?? '')),
        warrantyProvider: emptyToNull(String(form.get('warrantyProvider') ?? '')),
        warrantyStartDate: emptyToNull(
          String(form.get('warrantyStartDate') ?? ''),
        ),
        warrantyExpiryDate: emptyToNull(
          String(form.get('warrantyExpiryDate') ?? ''),
        ),
        warrantyKmLimit: warrantyKm ? Number(warrantyKm) : null,
        warrantyNotes: emptyToNull(String(form.get('warrantyNotes') ?? '')),
        nextServiceDueKm: serviceKm ? Number(serviceKm) : null,
        nextServiceDueDate: emptyToNull(
          String(form.get('nextServiceDueDate') ?? ''),
        ),
        notes: emptyToNull(String(form.get('notes') ?? '')),
      });
      router.push(`/fleet/${vehicle.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/fleet" className="text-sm text-brand hover:underline">
          ← Back to fleet
        </Link>
        <h1 className="mt-2 text-3xl text-navy">
          Add vehicle
        </h1>
        <p className="mt-1 text-brand-grey">
          Register a fleet asset with warranty and CarTrack fields.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
          <Field label="Make">
            <TextInput name="make" required />
          </Field>
          <Field label="Model">
            <TextInput name="model" required />
          </Field>
          <Field label="Year">
            <TextInput
              name="year"
              type="number"
              required
              defaultValue={new Date().getFullYear()}
            />
          </Field>
          <Field label="Colour">
            <TextInput name="color" />
          </Field>
          <Field label="VIN">
            <TextInput name="vin" required />
          </Field>
          <Field label="Registration">
            <TextInput name="registration" required />
          </Field>
          <Field label="Purchase price (ZAR)">
            <TextInput name="purchasePrice" type="number" step="0.01" required />
          </Field>
          <Field label="Purchase date">
            <TextInput name="purchaseDate" type="date" />
          </Field>
          <Field label="Status">
            <TextSelect name="status" defaultValue="AVAILABLE">
              <option value="AVAILABLE">New / Available</option>
              <option value="ACTIVE">Active</option>
              <option value="ARREARS">Arrears</option>
              <option value="PAID_UP">Paid Up</option>
              <option value="RETURNED">Returned</option>
              <option value="WRITTEN_OFF">Written Off</option>
            </TextSelect>
          </Field>
          <Field label="Monthly mileage limit (km)">
            <TextInput name="monthlyMileageLimit" type="number" />
          </Field>
          <Field label="CarTrack device ID">
            <TextInput name="carTrackDeviceId" />
          </Field>
        </div>

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm uppercase tracking-wide text-brand-grey">
            Warranty & service
          </h2>
          <Field label="Warranty provider">
            <TextInput name="warrantyProvider" />
          </Field>
          <Field label="Warranty km limit">
            <TextInput name="warrantyKmLimit" type="number" />
          </Field>
          <Field label="Warranty start">
            <TextInput name="warrantyStartDate" type="date" />
          </Field>
          <Field label="Warranty expiry">
            <TextInput name="warrantyExpiryDate" type="date" />
          </Field>
          <Field label="Next service due (km)">
            <TextInput name="nextServiceDueKm" type="number" />
          </Field>
          <Field label="Next service due (date)">
            <TextInput name="nextServiceDueDate" type="date" />
          </Field>
          <Field label="Warranty notes">
            <TextTextarea name="warrantyNotes" rows={2} />
          </Field>
          <Field label="Notes">
            <TextTextarea name="notes" rows={2} />
          </Field>
        </div>

        <FormActions error={error}>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create vehicle'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push('/fleet')}>
            Cancel
          </SecondaryButton>
        </FormActions>
      </form>
    </section>
  );
}
