'use client';

import { useState } from 'react';

export type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function StatusDonut({
  slices,
  centerValue,
  centerLabel,
  selectedKey,
  hoveredKey,
  onSelect,
  onHover,
}: {
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
  selectedKey?: string | null;
  hoveredKey?: string | null;
  onSelect?: (key: string) => void;
  onHover?: (key: string | null) => void;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 68;
  const stroke = 18;

  let angle = 0;
  const arcs =
    slices.length === 0
      ? []
      : slices.map((slice) => {
          const sweep = (slice.value / total) * 360;
          const start = angle;
          const end = angle + sweep;
          angle = end;
          return { ...slice, start, end, sweep };
        });

  const interactive = Boolean(onSelect || onHover);

  return (
    <div className="relative mx-auto h-[180px] w-[180px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--navy) 12%, transparent)"
          strokeWidth={stroke}
        />
        {arcs.map((arc) => {
          if (arc.value <= 0) return null;
          const active =
            hoveredKey === arc.key || selectedKey === arc.key;
          const muted =
            (hoveredKey || selectedKey) &&
            hoveredKey !== arc.key &&
            selectedKey !== arc.key;
          const width = active ? stroke + 6 : stroke;
          const opacity = muted ? 0.35 : 1;

          if (arc.sweep >= 359.9) {
            return (
              <circle
                key={arc.key}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={width}
                opacity={opacity}
                className={interactive ? 'cursor-pointer transition-all duration-200' : 'transition-all duration-200'}
                onClick={() => onSelect?.(arc.key)}
                onMouseEnter={() => onHover?.(arc.key)}
                onMouseLeave={() => onHover?.(null)}
              />
            );
          }
          return (
            <path
              key={arc.key}
              d={arcPath(cx, cy, radius, arc.start, arc.end)}
              fill="none"
              stroke={arc.color}
              strokeWidth={width}
              strokeLinecap="butt"
              opacity={opacity}
              className={interactive ? 'cursor-pointer transition-all duration-200' : 'transition-all duration-200'}
              onClick={() => onSelect?.(arc.key)}
              onMouseEnter={() => onHover?.(arc.key)}
              onMouseLeave={() => onHover?.(null)}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="text-3xl font-semibold text-navy"
          style={{ fontFamily: 'var(--font-display), sans-serif' }}
        >
          {centerValue}
        </p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-brand-grey">
          {centerLabel}
        </p>
      </div>
    </div>
  );
}

export function UtilizationRing({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[120px] w-[120px] shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="color-mix(in srgb, var(--navy) 12%, transparent)"
            strokeWidth={10}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#1680ab"
            strokeWidth={10}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xl font-semibold text-navy">{clamped}%</p>
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
        <p className="mt-1 text-xs text-brand-grey">
          Share of fleet currently on assignment
        </p>
      </div>
    </div>
  );
}

export function StatusBars({
  slices,
  selectedKey,
  hoveredKey,
  onSelect,
  onHover,
}: {
  slices: Slice[];
  selectedKey?: string | null;
  hoveredKey?: string | null;
  onSelect?: (key: string) => void;
  onHover?: (key: string | null) => void;
}) {
  const max = Math.max(...slices.map((s) => s.value), 1);
  return (
    <ul className="space-y-3">
      {slices.map((slice) => {
        const active =
          hoveredKey === slice.key || selectedKey === slice.key;
        const muted =
          (hoveredKey || selectedKey) &&
          hoveredKey !== slice.key &&
          selectedKey !== slice.key;
        return (
          <li key={slice.key}>
            <button
              type="button"
              className={`grid w-full grid-cols-[7rem_1fr_2rem] items-center gap-3 text-left transition ${
                muted ? 'opacity-40' : ''
              } ${active ? 'scale-[1.02]' : ''}`}
              onClick={() => onSelect?.(slice.key)}
              onMouseEnter={() => onHover?.(slice.key)}
              onMouseLeave={() => onHover?.(null)}
            >
              <span className="truncate text-xs text-brand-grey">
                {slice.label}
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(slice.value / max) * 100}%`,
                    background: slice.color,
                    transform: active ? 'scaleY(1.35)' : 'scaleY(1)',
                    transformOrigin: 'center',
                  }}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
                {slice.value}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SimpleBars({
  rows,
  color = '#1680ab',
}: {
  rows: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0) {
    return <p className="text-sm text-brand-grey">No data yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.label}
          className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3"
        >
          <span className="truncate text-xs text-brand-grey">{row.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(row.value / max) * 100}%`,
                background: color,
              }}
            />
          </div>
          <span className="text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type FinanceTrendPoint = {
  key: string;
  label: string;
  year: number;
  month: number;
  received: number;
  costs: number;
  expected: number;
  owed: number;
  profit: number;
  forecastProfit: number;
};

/** Grouped vertical bars for month-on-month finance comparison. */
export function FinanceMonthChart({
  series,
  metric = 'received',
  formatValue,
}: {
  series: FinanceTrendPoint[];
  metric?: 'received' | 'costs' | 'profit' | 'expected' | 'forecastProfit';
  formatValue?: (n: number) => string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const values = series.map((row) => row[metric]);
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);
  const hasNegative = values.some((v) => v < 0);

  const shortLabel = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (abs >= 1_000_000) {
      return `${sign}R${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
    }
    if (abs >= 10_000) {
      return `${sign}R${Math.round(abs / 1000)}k`;
    }
    if (abs >= 1000) {
      return `${sign}R${(abs / 1000).toFixed(1)}k`;
    }
    return `${sign}R${Math.round(abs)}`;
  };

  const fullLabel =
    formatValue ??
    ((n: number) => `R\u202F${Math.round(n).toLocaleString('en-ZA')}`);

  const colorFor = (metricKey: typeof metric, value: number) => {
    if (metricKey === 'costs') return '#eab024';
    if (metricKey === 'expected') return '#3aa4d1';
    if (metricKey === 'forecastProfit' || metricKey === 'profit') {
      return value >= 0 ? '#16a34a' : '#c01725';
    }
    return '#16a34a';
  };

  if (series.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        No monthly data yet.
      </p>
    );
  }

  const labelH = 22;
  const chartH = 168;
  const plotH = chartH - labelH;
  const zeroY = hasNegative ? plotH / 2 : plotH;

  return (
    <div>
      <div
        className="flex items-end gap-1.5 sm:gap-2.5"
        style={{ height: chartH }}
        onMouseLeave={() => setHovered(null)}
      >
        {series.map((row) => {
          const value = row[metric];
          const height = Math.max(
            (Math.abs(value) / maxAbs) *
              (hasNegative ? plotH / 2 - 8 : plotH - 12),
            value === 0 ? 0 : 3,
          );
          const isNeg = value < 0;
          const active = hovered === row.key;
          return (
            <button
              key={row.key}
              type="button"
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center"
              onMouseEnter={() => setHovered(row.key)}
              aria-label={`${row.label} ${fullLabel(value)}`}
              title={fullLabel(value)}
            >
              {/* Always-visible figure */}
              <span
                className={`mb-1 w-full truncate text-center text-[10px] font-medium tabular-nums leading-tight sm:text-[11px] ${
                  active ? 'text-navy' : 'text-slate-600 dark:text-slate-300'
                }`}
                style={{ height: labelH }}
              >
                {shortLabel(value)}
              </span>
              <div className="relative w-full max-w-11 flex-1" style={{ height: plotH }}>
                <div
                  className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-700"
                  style={{ top: zeroY }}
                />
                <div
                  className="absolute left-1/2 w-[70%] max-w-9 -translate-x-1/2 transition-opacity"
                  style={{
                    height: Math.max(height, value === 0 ? 0 : 3),
                    background: colorFor(metric, value),
                    opacity: active || !hovered ? 1 : 0.4,
                    top: isNeg ? zeroY : zeroY - height,
                    borderRadius: isNeg ? '0 0 2px 2px' : '2px 2px 0 0',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2.5">
        {series.map((row) => (
          <div
            key={`${row.key}-label`}
            className="min-w-0 flex-1 text-center text-[11px] tabular-nums text-slate-600 dark:text-slate-300"
          >
            <span className="block truncate">{row.label}</span>
            {series.length > 8 ? null : (
              <span className="block text-[10px] text-slate-500">
                {String(row.year).slice(2)}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Figures on bars are rounded (k / m). Hover for the exact amount.
      </p>
    </div>
  );
}
