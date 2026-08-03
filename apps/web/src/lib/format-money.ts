/** Shared ZAR / number display helpers for dashboard tables and KPIs. */

export function formatMoney(
  value: string | number | null | undefined,
  options?: { decimals?: number; empty?: string },
): string {
  if (value == null || value === '') return options?.empty ?? '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return options?.empty ?? '—';
  const decimals = options?.decimals ?? 2;
  const formatted = amount.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  // Narrow no-break space keeps "R" on the same line as the amount
  return `R\u202F${formatted}`;
}

export function formatMoneyCompact(value: string | number | null | undefined) {
  return formatMoney(value, { decimals: 0 });
}

export const moneyCellClass =
  'px-4 py-3 text-right tabular-nums whitespace-nowrap';

export const moneyHeadClass =
  'px-4 py-3 text-right font-medium';
