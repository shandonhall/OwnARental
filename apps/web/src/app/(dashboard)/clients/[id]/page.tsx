'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

const FICA_DOCS = [
  { key: 'idDocumentUrl', label: 'ID document' },
  { key: 'driversLicenseUrl', label: "Driver's licence" },
  { key: 'payslipsUrl', label: '6 months payslips' },
  { key: 'bankStatementsUrl', label: '6 months bank statements' },
  { key: 'proofOfResidenceUrl', label: 'Proof of residence' },
] as const;

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['client', params.id],
    queryFn: () => api.getClient(params.id),
    enabled: Boolean(params.id),
  });

  if (query.isLoading) {
    return <p className="text-slate-600 dark:text-slate-300">Loading client…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Client not found.</p>;
  }

  const client = query.data;
  const summary = client.opsSummary;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/clients" className="text-sm text-brand hover:underline">
            ← Back to clients
          </Link>
          <h1 className="mt-2 text-3xl text-navy">
            {client.firstName} {client.lastName}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            {client.city}
            {client.province ? `, ${client.province}` : ''} · FICA{' '}
            {client.ficaStatus}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await api.syncClientGhl(client.id);
                await query.refetch();
              } catch {
                // query will surface state on next load
              }
            }}
            className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 bg-surface px-4 py-2 text-sm font-medium text-navy transition hover:bg-mist"
          >
            Sync to GHL
          </button>
          {summary?.activeContractId ? (
            <Link
              href={`/contracts/${summary.activeContractId}`}
              className="inline-flex rounded-md border border-slate-200 bg-surface px-4 py-2 text-sm font-medium text-navy transition hover:bg-slate-50 dark:hover:bg-slate-900/40 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Open contract
            </Link>
          ) : null}
          <Link
            href={`/clients/${client.id}/edit`}
            className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
          >
            Edit profile
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Outstanding
          </p>
          <p
            className={`mt-1 text-2xl ${
              summary?.arrears ? 'text-danger' : 'text-navy'
            }`}
          >
            {summary?.outstandingBalance != null
              ? `R ${Number(summary.outstandingBalance).toLocaleString('en-ZA')}`
              : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Pending fines
          </p>
          <p className="mt-1 text-2xl text-warning">
            {summary?.pendingFineCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {summary?.pendingFineTotal
              ? `R ${Number(summary.pendingFineTotal).toLocaleString('en-ZA')}`
              : 'Clear'}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Driver score
          </p>
          <p className="mt-1 text-2xl text-navy">
            {summary?.driverScore ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Alerts
          </p>
          <p className="mt-1 text-2xl text-navy">{summary?.alertCount ?? 0}</p>
        </div>
      </div>

      {summary?.alerts && summary.alerts.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Alerts & fines
          </h2>
          <ul className="space-y-2 text-sm">
            {summary.alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"
              >
                <div>
                  <p className="text-navy">{alert.detail}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{alert.kind}</p>
                </div>
                <div className="text-right">
                  {alert.amount ? (
                    <p className="text-warning">
                      R {Number(alert.amount).toLocaleString('en-ZA')}
                    </p>
                  ) : null}
                  <Link
                    href={`/contracts/${alert.contractId}`}
                    className="text-xs text-brand hover:underline"
                  >
                    Contract
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Contact
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">ID number</dt>
              <dd className="font-mono">{client.idNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Phone</dt>
              <dd>{client.phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Alt phone</dt>
              <dd>{client.altPhone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Email</dt>
              <dd>{client.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">GHL contact</dt>
              <dd className="font-mono text-xs">
                {client.ghlContactId ?? 'Not synced'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">Address</dt>
              <dd className="text-right">
                {client.addressLine1}
                {client.addressLine2 ? `, ${client.addressLine2}` : ''}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
            FICA documents
          </h2>
          <ul className="space-y-2 text-sm">
            {FICA_DOCS.map((doc) => {
              const url = client[doc.key];
              return (
                <li
                  key={doc.key}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-slate-500 dark:text-slate-400">
                    {doc.label}
                  </span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-slate-500">Missing</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-surface p-4 dark:border-slate-700">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Contracts
        </h2>
        {client.contracts.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No contracts linked yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {client.contracts.map((contract) => (
              <li
                key={contract.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800"
              >
                <div>
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="text-navy hover:text-brand"
                  >
                    {contract.planType.replace('_', ' ')} · {contract.status}
                  </Link>
                  {contract.outstandingBalance != null ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Outstanding R{' '}
                      {Number(contract.outstandingBalance).toLocaleString(
                        'en-ZA',
                      )}
                    </p>
                  ) : null}
                </div>
                {contract.vehicle ? (
                  <Link
                    href={`/fleet/${contract.vehicle.id}`}
                    className="text-brand hover:underline"
                  >
                    {contract.vehicle.registration}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
