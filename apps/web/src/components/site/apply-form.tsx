'use client';

import { useEffect, useRef, useState } from 'react';
import { whatsappLink } from '@/lib/site/site-config';
import { CheckIcon, WhatsAppIcon } from './icons';

type VehicleOption = { slug: string; label: string };

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** PLACEHOLDER WORDING — POPIA consent text awaiting Own A Rental approval. */
const CONSENT_TEXT =
  'I agree that Own A Rental may contact me about my application and use my personal information for this purpose.';

function Field({
  label,
  name,
  error,
  optional,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-[var(--oar-navy)]">
        {label}
        {optional ? <span className="font-normal text-[var(--oar-grey)]"> (optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-[var(--oar-red)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ApplyForm({
  vehicles,
  initialVehicle,
}: {
  vehicles: VehicleOption[];
  initialVehicle?: string;
}) {
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vehicle, setVehicle] = useState(initialVehicle ?? '');

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const licence = form.get('licence');
    const params = new URLSearchParams(window.location.search);

    setStatus('sending');
    setMessage(null);
    setErrors({});

    try {
      const response = await fetch('/api/website/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          cellphone: form.get('cellphone'),
          email: form.get('email'),
          area: form.get('area'),
          vehicle,
          hasValidDriversLicence: licence === 'yes' ? true : licence === 'no' ? false : null,
          message: form.get('message'),
          consent: form.get('consent') === 'on',
          company: form.get('company'),
          elapsedMs: Date.now() - startedAt.current,
          utmSource: params.get('utm_source'),
          utmCampaign: params.get('utm_campaign'),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string>;
      };
      if (!response.ok) {
        setErrors(data.errors ?? {});
        setMessage(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('sent');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setMessage('We could not reach our server. Please check your connection or WhatsApp us.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8" role="status">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="site-display mt-4 text-3xl font-bold text-[var(--oar-navy)]">
          Thank you, we have your application
        </h2>
        <p className="mt-3 leading-relaxed text-[var(--oar-navy)]">
          A member of our team will contact you on the number you gave us. Please have the documents
          listed on this page ready.
        </p>
        <a
          href={whatsappLink('Hi Own A Rental, I have just sent an application on your website.')}
          target="_blank"
          rel="noopener noreferrer"
          className="site-btn site-btn-whatsapp site-btn-lg mt-6"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Message us on WhatsApp
        </a>
      </div>
    );
  }

  const describedBy = (name: string) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" name="firstName" error={errors.firstName}>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={80}
            className="site-input"
            aria-invalid={!!errors.firstName}
            aria-describedby={describedBy('firstName')}
          />
        </Field>
        <Field label="Surname" name="lastName" error={errors.lastName}>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={80}
            className="site-input"
            aria-invalid={!!errors.lastName}
            aria-describedby={describedBy('lastName')}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cellphone number" name="cellphone" error={errors.cellphone}>
          <input
            id="cellphone"
            name="cellphone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={30}
            placeholder="e.g. 082 123 4567"
            className="site-input"
            aria-invalid={!!errors.cellphone}
            aria-describedby={describedBy('cellphone')}
          />
        </Field>
        <Field label="Email" name="email" optional error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={160}
            className="site-input"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy('email')}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vehicle you are interested in" name="vehicle" optional>
          <select
            id="vehicle"
            value={vehicle}
            onChange={(event) => setVehicle(event.target.value)}
            className="site-input"
          >
            <option value="">Not sure yet</option>
            {vehicles.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Area you live in" name="area" optional>
          <input
            id="area"
            name="area"
            autoComplete="address-level2"
            maxLength={120}
            placeholder="e.g. Randburg"
            className="site-input"
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-[var(--oar-navy)]">
          Do you have a valid driver’s licence?
        </legend>
        <div className="flex gap-3">
          {[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ].map((option) => (
            <label
              key={option.value}
              className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-[#cfd8de] bg-white px-4 has-[:checked]:border-[var(--oar-blue)] has-[:checked]:bg-[var(--oar-blue)]/5 sm:flex-none sm:px-6"
            >
              <input type="radio" name="licence" value={option.value} className="h-4 w-4 accent-[var(--oar-blue)]" />
              <span className="font-medium text-[var(--oar-navy)]">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Anything else we should know?" name="message" optional>
        <textarea id="message" name="message" rows={3} maxLength={1000} className="site-input" />
      </Field>

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--oar-red)]"
            aria-invalid={!!errors.consent}
            aria-describedby={describedBy('consent')}
          />
          <span className="text-sm leading-relaxed text-[var(--oar-navy)]">{CONSENT_TEXT}</span>
        </label>
        {errors.consent ? (
          <p id="consent-error" className="mt-1.5 text-sm text-[var(--oar-red)]">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-[var(--oar-red)]">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="site-btn site-btn-primary site-btn-lg w-full disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {status === 'sending' ? 'Sending…' : 'Send my application'}
      </button>
    </form>
  );
}
