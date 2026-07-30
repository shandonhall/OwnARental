'use client';

type Slice = {
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
}: {
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
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

  return (
    <div className="relative mx-auto h-[180px] w-[180px]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(44,61,73,0.12)"
          strokeWidth={stroke}
        />
        {arcs.map((arc) => {
          if (arc.value <= 0) return null;
          if (arc.sweep >= 359.9) {
            return (
              <circle
                key={arc.key}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
              />
            );
          }
          return (
            <path
              key={arc.key}
              d={arcPath(cx, cy, radius, arc.start, arc.end)}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              className="origin-center transition-all duration-700"
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
            stroke="rgba(44,61,73,0.12)"
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
        <p className="text-sm text-slate-600">{label}</p>
        <p className="mt-1 text-xs text-brand-grey">
          Share of fleet currently on assignment
        </p>
      </div>
    </div>
  );
}

export function StatusBars({ slices }: { slices: Slice[] }) {
  const max = Math.max(...slices.map((s) => s.value), 1);
  return (
    <ul className="space-y-3">
      {slices.map((slice) => (
        <li key={slice.key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3">
          <span className="truncate text-xs text-brand-grey">{slice.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-50">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(slice.value / max) * 100}%`,
                background: slice.color,
              }}
            />
          </div>
          <span className="text-right text-xs tabular-nums text-slate-600">
            {slice.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
