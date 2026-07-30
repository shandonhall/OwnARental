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
    return <p className="text-brand-grey">Loading client…</p>;
  }

  if (query.isError || !query.data) {
    return <p className="text-danger">Client not found.</p>;
  }

  const client = query.data;

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
          <p className="mt-1 text-brand-grey">
            {client.city}
            {client.province ? `, ${client.province}` : ''} · FICA{' '}
            {client.ficaStatus}
          </p>
        </div>
        <Link
          href={`/clients/${client.id}/edit`}
          className="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-[#13729a]"
        >
          Edit profile
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-brand-grey">
            Contact
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">ID number</dt>
              <dd className="font-mono">{client.idNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Phone</dt>
              <dd>{client.phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Alt phone</dt>
              <dd>{client.altPhone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Email</dt>
              <dd>{client.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-grey">Address</dt>
              <dd className="text-right">
                {client.addressLine1}
                {client.addressLine2 ? `, ${client.addressLine2}` : ''}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-brand-grey">
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
                  <span className="text-slate-300">{doc.label}</span>
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

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-brand-grey">
          Contracts
        </h2>
        {client.contracts.length === 0 ? (
          <p className="text-sm text-brand-grey">
            No contracts linked yet — Phase 2 will connect rent-to-own terms.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {client.contracts.map((contract) => (
              <li key={contract.id} className="flex justify-between gap-4">
                <span>
                  {contract.planType.replace('_', ' ')} · {contract.status}
                </span>
                {contract.vehicle && (
                  <Link
                    href={`/fleet/${contract.vehicle.id}`}
                    className="text-brand hover:underline"
                  >
                    {contract.vehicle.registration}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
