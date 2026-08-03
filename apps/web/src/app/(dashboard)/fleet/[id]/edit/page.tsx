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
  toDateInputValue,
} from '@/components/form';
import { api, VehicleStatus, isAdminRole } from '@/lib/api';

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['vehicle', params.id],
    queryFn: () => api.getVehicle(params.id),
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

    const mileage = emptyToNull(String(form.get('monthlyMileageLimit') ?? ''));
    const warrantyKm = emptyToNull(String(form.get('warrantyKmLimit') ?? ''));
    const serviceKm = emptyToNull(String(form.get('nextServiceDueKm') ?? ''));

    try {
      await api.updateVehicle(params.id, {
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
      router.push(`/fleet/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vehicle');
      setSaving(false);
    }
  }

  async function onRetire() {
    if (!confirm('Mark this vehicle as returned / off fleet?')) return;
    setSaving(true);
    try {
      await api.deleteVehicle(params.id);
      router.push('/fleet');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retire vehicle');
      setSaving(false);
    }
  }

  if (query.isLoading) {
    return <p className="text-slate-600 dark:text-slate-300">Loading vehicle…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Vehicle not found.</p>;
  }

  const vehicle = query.data;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/fleet/${vehicle.id}`}
          className="text-sm text-brand hover:underline"
        >
          ← Back to vehicle
        </Link>
        <h1 className="mt-2 text-3xl text-navy">
          Edit {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4 md:grid-cols-2">
          <Field label="Make">
            <TextInput name="make" required defaultValue={vehicle.make} />
          </Field>
          <Field label="Model">
            <TextInput name="model" required defaultValue={vehicle.model} />
          </Field>
          <Field label="Year">
            <TextInput
              name="year"
              type="number"
              required
              defaultValue={vehicle.year}
            />
          </Field>
          <Field label="Colour">
            <TextInput name="color" defaultValue={vehicle.color ?? ''} />
          </Field>
          <Field label="VIN">
            <TextInput name="vin" required defaultValue={vehicle.vin} />
          </Field>
          <Field label="Registration">
            <TextInput
              name="registration"
              required
              defaultValue={vehicle.registration}
            />
          </Field>
          <Field label="Purchase price (ZAR)">
            <TextInput
              name="purchasePrice"
              type="number"
              step="0.01"
              required
              defaultValue={Number(vehicle.purchasePrice)}
            />
          </Field>
          <Field label="Purchase date">
            <TextInput
              name="purchaseDate"
              type="date"
              defaultValue={toDateInputValue(vehicle.purchaseDate)}
            />
          </Field>
          <Field label="Status">
            <TextSelect name="status" defaultValue={vehicle.status}>
              <option value="AVAILABLE">New / Available</option>
              <option value="ACTIVE">Active</option>
              <option value="ARREARS">Arrears</option>
              <option value="PAID_UP">Paid Up</option>
              <option value="RETURNED">Returned</option>
              <option value="WRITTEN_OFF">Written Off</option>
            </TextSelect>
          </Field>
          <Field label="Monthly mileage limit (km)">
            <TextInput
              name="monthlyMileageLimit"
              type="number"
              defaultValue={vehicle.monthlyMileageLimit ?? ''}
            />
          </Field>
          <Field label="CarTrack device ID">
            <TextInput
              name="carTrackDeviceId"
              defaultValue={vehicle.carTrackDeviceId ?? ''}
            />
          </Field>
        </div>

        <div className="grid gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Warranty & service
          </h2>
          <Field label="Warranty provider">
            <TextInput
              name="warrantyProvider"
              defaultValue={vehicle.warrantyProvider ?? ''}
            />
          </Field>
          <Field label="Warranty km limit">
            <TextInput
              name="warrantyKmLimit"
              type="number"
              defaultValue={vehicle.warrantyKmLimit ?? ''}
            />
          </Field>
          <Field label="Warranty start">
            <TextInput
              name="warrantyStartDate"
              type="date"
              defaultValue={toDateInputValue(vehicle.warrantyStartDate)}
            />
          </Field>
          <Field label="Warranty expiry">
            <TextInput
              name="warrantyExpiryDate"
              type="date"
              defaultValue={toDateInputValue(vehicle.warrantyExpiryDate)}
            />
          </Field>
          <Field label="Next service due (km)">
            <TextInput
              name="nextServiceDueKm"
              type="number"
              defaultValue={vehicle.nextServiceDueKm ?? ''}
            />
          </Field>
          <Field label="Next service due (date)">
            <TextInput
              name="nextServiceDueDate"
              type="date"
              defaultValue={toDateInputValue(vehicle.nextServiceDueDate)}
            />
          </Field>
          <Field label="Warranty notes">
            <TextTextarea
              name="warrantyNotes"
              rows={2}
              defaultValue={vehicle.warrantyNotes ?? ''}
            />
          </Field>
          <Field label="Notes">
            <TextTextarea name="notes" rows={2} defaultValue={vehicle.notes ?? ''} />
          </Field>
        </div>

        <FormActions error={error}>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => router.push(`/fleet/${vehicle.id}`)}
          >
            Cancel
          </SecondaryButton>
          {canAdmin ? (
            <DangerButton type="button" disabled={saving} onClick={onRetire}>
              Retire vehicle
            </DangerButton>
          ) : null}
        </FormActions>
      </form>
    </section>
  );
}
