'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FormActions,
  PrimaryButton,
  SecondaryButton,
} from '@/components/form';
import {
  buildContractPayloadFromForm,
  ContractScheduleFormFields,
} from '@/components/contract-schedule-form';
import { api, PlanType } from '@/lib/api';

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const payload = buildContractPayloadFromForm(form, {
        includeParties: true,
        planType,
      });
      const contract = await api.createContract(payload);
      router.push(`/contracts/${contract.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/contracts" className="text-sm text-brand hover:underline">
          ← Back to contracts
        </Link>
        <h1 className="mt-2 text-3xl text-navy">New contract</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Capture Schedule A commercial terms. Rental Amount &quot;All In&quot;
          remains the finance source of truth.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <ContractScheduleFormFields
          mode="create"
          clients={clients.data}
          vehicles={vehicles.data}
          planType={planType}
          onPlanTypeChange={setPlanType}
        />

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
