'use client';

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
