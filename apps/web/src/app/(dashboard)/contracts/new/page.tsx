'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { api, ContractStatus, PlanType } from '@/lib/api';

export default function NewContractPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [planType, setPlanType] = useState<PlanType>('CIP_10');

  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients(),
  });
  const vehicles = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const availableVehicles = useMemo(
    () =>
      (vehicles.data ?? []).filter(
        (vehicle) =>
          vehicle.status === 'AVAILABLE' || vehicle.contracts.length === 0,
      ),
    [vehicles.data],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const contract = await api.createContract({
        clientId: String(form.get('clientId')),
        vehicleId: String(form.get('vehicleId')),
        planType: String(form.get('planType')) as PlanType,
        status: String(form.get('status') || 'DRAFT') as ContractStatus,
        termMonths: Number(form.get('termMonths')),
        monthlyRate: Number(form.get('monthlyRate')),
        depositAmount: Number(form.get('depositAmount') || 0),
        balloonAmount: emptyToNull(String(form.get('balloonAmount') ?? '')),
        cipPercent:
          planType === 'CIP_10' ? 10 : planType === 'CIP_20' ? 20 : null,
        startDate: String(form.get('startDate')),
        monthlyKmLimit: emptyToNull(String(form.get('monthlyKmLimit') ?? ''))
          ? Number(form.get('monthlyKmLimit'))
          : null,
        notes: emptyToNull(String(form.get('notes') ?? '')),
      });
      router.push(`/contracts/${contract.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/contracts" className="text-sm text-brand hover:underline">
          ← Back to contracts
        </Link>
        <h1 className="mt-2 text-3xl text-navy">New contract</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Link a client to a vehicle with rent-to-own terms.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4 md:grid-cols-2">
          <Field label="Client">
            <TextSelect name="clientId" required defaultValue="">
              <option value="" disabled>
                Select client
              </option>
              {(clients.data ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName} · {client.idNumber}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Vehicle">
            <TextSelect name="vehicleId" required defaultValue="">
              <option value="" disabled>
                Select vehicle
              </option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.year} {vehicle.make} {vehicle.model} ·{' '}
                  {vehicle.registration}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Plan type">
            <TextSelect
              name="planType"
              value={planType}
              onChange={(event) => setPlanType(event.target.value as PlanType)}
            >
              <option value="CIP_10">10% CIP</option>
              <option value="CIP_20">20% CIP</option>
              <option value="LONG_TERM">Long Term</option>
            </TextSelect>
          </Field>
          <Field label="Status">
            <TextSelect name="status" defaultValue="ACTIVE">
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARREARS">Arrears</option>
            </TextSelect>
          </Field>
          <Field label="Term (months)">
            <TextInput name="termMonths" type="number" required defaultValue={36} />
          </Field>
          <Field label="Monthly rate (ZAR)">
            <TextInput
              name="monthlyRate"
              type="number"
              step="0.01"
              required
            />
          </Field>
          <Field label="Deposit (ZAR)">
            <TextInput
              name="depositAmount"
              type="number"
              step="0.01"
              defaultValue={0}
            />
          </Field>
          <Field label="Balloon (ZAR)">
            <TextInput name="balloonAmount" type="number" step="0.01" />
          </Field>
          <Field label="Start date">
            <TextInput
              name="startDate"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </Field>
          <Field label="Monthly km limit">
            <TextInput name="monthlyKmLimit" type="number" />
          </Field>
          <Field label="Notes">
            <TextTextarea name="notes" rows={3} />
          </Field>
        </div>

        <FormActions error={error}>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create contract'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => router.push('/contracts')}
          >
            Cancel
          </SecondaryButton>
        </FormActions>
      </form>
    </section>
  );
}
