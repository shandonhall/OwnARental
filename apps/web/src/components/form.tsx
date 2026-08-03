'use client';

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const fieldClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-brand-grey focus:border-brand';

const labelClass = 'mb-1 block text-xs uppercase tracking-wide text-brand-grey';

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
}

export function TextSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${fieldClass} ${props.className ?? ''}`}>
      {props.children}
    </select>
  );
}

export function TextTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${fieldClass} ${props.className ?? ''}`} />
  );
}

export function FormActions({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#13729a] disabled:opacity-50 dark:bg-[#1680ab] dark:text-white dark:hover:bg-[#13729a] ${props.className ?? ''}`}
    />
  );
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1a2832] transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 ${props.className ?? ''}`}
    />
  );
}

export function DangerButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`rounded-md border border-brand-red/30 bg-brand-red/10 px-4 py-2 text-sm font-semibold text-brand-red transition hover:bg-brand-red/15 disabled:opacity-50 dark:border-red-400/40 dark:text-red-300 ${props.className ?? ''}`}
    />
  );
}

export function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}
