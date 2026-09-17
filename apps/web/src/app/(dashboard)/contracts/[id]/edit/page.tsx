'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { api, PlanType, UpdateContractInput } from '@/lib/api';

export default function EditContractPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['contract', params.id],
    queryFn: () => api.getContract(params.id),
    enabled: Boolean(params.id),
  });

  const [planType, setPlanType] = useState<PlanType | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.data) return;
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const effectivePlan =
      planType ?? query.data.planType;

    try {
      const payload = buildContractPayloadFromForm(form, {
        includeParties: false,
        planType: effectivePlan,
      });
      const update: UpdateContractInput = { ...payload };
      delete (update as { clientId?: string }).clientId;
      delete (update as { vehicleId?: string }).vehicleId;
      await api.updateContract(params.id, update);
      router.push(`/contracts/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contract');
      setSaving(false);
    }
  }

  if (query.isLoading) {
    return <p className="text-slate-600 dark:text-slate-300">Loading contract…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Contract not found.</p>;
  }

  const contract = query.data;

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/contracts/${contract.id}`}
          className="text-sm text-brand hover:underline"
        >
          ← Back to contract
        </Link>
        <h1 className="mt-2 text-3xl text-navy">Edit contract</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {contract.client.firstName} {contract.client.lastName} ·{' '}
          {contract.vehicle.registration}
          {contract.agreementNumber
            ? ` · ${contract.agreementNumber}`
            : ''}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <ContractScheduleFormFields
          mode="edit"
          contract={contract}
          planType={planType ?? contract.planType}
          onPlanTypeChange={setPlanType}
        />

        <FormActions error={error}>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => router.push(`/contracts/${contract.id}`)}
          >
            Cancel
          </SecondaryButton>
        </FormActions>
      </form>
    </section>
  );
}
