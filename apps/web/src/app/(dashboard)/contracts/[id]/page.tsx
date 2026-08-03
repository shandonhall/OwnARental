'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
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
import { useTableSort } from '@/lib/table-sort';
import { formatMoney, moneyCellClass } from '@/lib/format-money';

function money(value: string | number) {
  return formatMoney(value);
}

function ledgerStatusLabel(status: string) {
  switch (status) {
    case 'ON_TIME':
      return 'On time';
    case 'EARLY':
      return 'Early';
    case 'LATE':
      return 'Late';
    case 'PENDING':
      return 'Pending';
    case 'FAILED':
      return 'Failed';
    case 'VOID':
      return 'Void';
    default:
      return status.replaceAll('_', ' ');
  }
}

function ledgerStatusClass(status: string) {
  switch (status) {
    case 'ON_TIME':
    case 'EARLY':
      return 'text-success';
    case 'LATE':
    case 'FAILED':
      return 'text-danger';
    case 'PENDING':
      return 'text-warning';
    case 'VOID':
      return 'text-slate-600 dark:text-slate-300';
    default:
      return 'text-navy';
  }
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

  const ledgerRows = useMemo(
    () => query.data?.ledger ?? [],
    [query.data?.ledger],
  );

  const ledgerAccessors = useMemo(
    () => ({
      type: (e: (typeof ledgerRows)[number]) => e.type,
      status: (e: (typeof ledgerRows)[number]) => e.status,
      amount: (e: (typeof ledgerRows)[number]) => Number(e.amount),
      paid: (e: (typeof ledgerRows)[number]) =>
        e.paidAt ? new Date(e.paidAt).getTime() : 0,
    }),
    [],
  );

  const { sorted: sortedLedger, SortTh: LedgerSortTh } = useTableSort(
    ledgerRows,
    ledgerAccessors,
    'type',
  );

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
    return <p className="text-slate-600 dark:text-slate-300">Loading contract…</p>;
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
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {contract.vehicle.year} {contract.vehicle.make}{' '}
          {contract.vehicle.model} · {contract.vehicle.registration}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Month owed
          </p>
          <p
            className={`mt-2 text-2xl ${
              Number(contract.monthOwed ?? 0) > 0 ? 'text-danger' : 'text-navy'
            }`}
          >
            {Number(contract.monthOwed ?? 0) > 0
              ? money(contract.monthOwed!)
              : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Unpaid rentals due this month or overdue
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Outstanding (ex balloon)
          </p>
          <p className="mt-2 text-2xl text-navy">
            {money(
              contract.outstandingExBalloon ?? contract.outstandingBalance,
            )}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Rentals + deposit remaining
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {contract.hasBalloon ? 'Outstanding (incl. balloon)' : 'Outstanding'}
          </p>
          <p className="mt-2 text-2xl text-navy">
            {money(contract.outstandingBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {contract.hasBalloon
              ? Number(contract.balloonOutstanding ?? 0) > 0
                ? `Balloon still due ${money(contract.balloonOutstanding!)}`
                : contract.balloonPaid
                  ? 'Balloon paid'
                  : `Balloon ${money(contract.balloonAmount ?? 0)}`
              : `Expected ${money(contract.expectedTotal)} · Paid ${money(contract.totalPaid)}`}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Monthly rate
          </p>
          <p className="mt-2 text-2xl text-navy">
            {money(contract.monthlyRate)}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {contract.planType.replace('_', ' ')} · {contract.status}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Term progress
        </p>
        <p className="mt-2 text-2xl text-navy">{progress.percent}%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          Month {progress.monthsElapsed}/{progress.termMonths} ·{' '}
          {progress.daysRemaining} days left
          {progress.isFinalNinetyDays ? ' · Final 90 days' : ''}
        </p>
        {contract.ghlOpportunityId ? (
          <p className="mt-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            GHL opportunity · {contract.ghlOpportunityId}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Financial ledger
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-600 dark:text-slate-300">
                <tr>
                  <LedgerSortTh column="type" className="py-2 pr-3 font-medium">
                    Type
                  </LedgerSortTh>
                  <LedgerSortTh
                    column="status"
                    className="py-2 pr-3 font-medium"
                  >
                    Status
                  </LedgerSortTh>
                  <LedgerSortTh
                    column="amount"
                    className="py-2 pr-3 text-right font-medium"
                    align="right"
                  >
                    Amount
                  </LedgerSortTh>
                  <LedgerSortTh column="paid" className="py-2 font-medium">
                    Paid
                  </LedgerSortTh>
                </tr>
              </thead>
              <tbody>
                {sortedLedger.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-600 dark:text-slate-300">
                      No ledger entries yet.
                    </td>
                  </tr>
                )}
                {sortedLedger.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="py-2.5 pr-3 text-navy">
                      {entry.type.replaceAll('_', ' ')}
                    </td>
                    <td
                      className={`py-2.5 pr-3 font-medium ${ledgerStatusClass(entry.status)}`}
                    >
                      {ledgerStatusLabel(entry.status)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap text-navy">
                      {money(entry.amount)}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">
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
          className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4"
        >
          <h2 className="text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
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
