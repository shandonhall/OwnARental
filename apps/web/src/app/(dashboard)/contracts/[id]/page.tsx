'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Field,
  FormActions,
  PrimaryButton,
  TextInput,
  TextSelect,
  TextTextarea,
  emptyToNull,
} from '@/components/form';
import {
  api,
  LedgerEntryStatus,
  LedgerEntryType,
} from '@/lib/api';

function money(value: string | number) {
  return `R ${Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['contract', params.id],
    queryFn: () => api.getContract(params.id),
    enabled: Boolean(params.id),
  });

  async function onAddPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      await api.createLedgerEntry(params.id, {
        type: String(form.get('type')) as LedgerEntryType,
        status: String(form.get('status')) as LedgerEntryStatus,
        amount: Number(form.get('amount')),
        dueDate: emptyToNull(String(form.get('dueDate') ?? '')),
        paidAt: emptyToNull(String(form.get('paidAt') ?? '')),
        reference: emptyToNull(String(form.get('reference') ?? '')),
        description: emptyToNull(String(form.get('description') ?? '')),
      });
      event.currentTarget.reset();
      await queryClient.invalidateQueries({ queryKey: ['contract', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record entry');
      setSaving(false);
    }
  }

  if (query.isLoading) {
    return <p className="text-brand-grey">Loading contract…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Contract not found.</p>;
  }

  const contract = query.data;
  const progress = contract.termProgress;

  return (
    <section className="space-y-6">
      <div>
        <Link href="/contracts" className="text-sm text-brand hover:underline">
          ← Back to contracts
        </Link>
        <h1 className="mt-2 text-3xl text-navy">
          {contract.client.firstName} {contract.client.lastName}
        </h1>
        <p className="mt-1 text-brand-grey">
          {contract.vehicle.year} {contract.vehicle.make}{' '}
          {contract.vehicle.model} · {contract.vehicle.registration}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-grey">
            Outstanding
          </p>
          <p className="mt-2 text-2xl text-navy">
            {money(contract.outstandingBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Expected {money(contract.expectedTotal)} · Paid{' '}
            {money(contract.totalPaid)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-grey">
            Monthly rate
          </p>
          <p className="mt-2 text-2xl text-navy">
            {money(contract.monthlyRate)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {contract.planType.replace('_', ' ')} · {contract.status}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-grey">
            Term progress
          </p>
          <p className="mt-2 text-2xl text-navy">{progress.percent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Month {progress.monthsElapsed}/{progress.termMonths} ·{' '}
            {progress.daysRemaining} days left
            {progress.isFinalNinetyDays ? ' · Final 90 days' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-brand-grey">
            Financial ledger
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-brand-grey">
                <tr>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {contract.ledger.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      No ledger entries yet.
                    </td>
                  </tr>
                )}
                {contract.ledger.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 text-slate-200">
                      {entry.type.replaceAll('_', ' ')}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">{entry.status}</td>
                    <td className="py-2 pr-3 text-slate-200">
                      {money(entry.amount)}
                    </td>
                    <td className="py-2 text-brand-grey">
                      {entry.paidAt
                        ? new Date(entry.paidAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form
          onSubmit={onAddPayment}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm uppercase tracking-wide text-brand-grey">
            Record payment / fee
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <TextSelect name="type" defaultValue="RENTAL_PAYMENT">
                <option value="RENTAL_PAYMENT">Rental payment</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="BALLOON_PAYMENT">Balloon</option>
                <option value="FINE">Fine</option>
                <option value="TOLL">Toll</option>
                <option value="ADMIN_FEE">Admin fee</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="REFUND">Refund</option>
              </TextSelect>
            </Field>
            <Field label="Status">
              <TextSelect name="status" defaultValue="ON_TIME">
                <option value="ON_TIME">On time</option>
                <option value="EARLY">Early</option>
                <option value="LATE">Late</option>
                <option value="PENDING">Pending</option>
              </TextSelect>
            </Field>
            <Field label="Amount (ZAR)">
              <TextInput name="amount" type="number" step="0.01" required />
            </Field>
            <Field label="Paid at">
              <TextInput
                name="paidAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <Field label="Due date">
              <TextInput name="dueDate" type="date" />
            </Field>
            <Field label="Reference">
              <TextInput name="reference" />
            </Field>
            <Field label="Description">
              <TextTextarea name="description" rows={2} />
            </Field>
          </div>
          <FormActions error={error}>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add ledger entry'}
            </PrimaryButton>
          </FormActions>
        </form>
      </div>
    </section>
  );
}
