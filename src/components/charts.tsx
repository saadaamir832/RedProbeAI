import type { Severity } from '@/lib/types';
import { SEVERITY_META } from '@/lib/owasp';

/* Lightweight, dependency-free SVG charts tuned for the SOC aesthetic. */

export function DonutChart({
  data,
  size = 160,
  thickness = 18,
  centerLabel,
  centerSub,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#131924" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * circ;
          const dash = `${len} ${circ - len}`;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                filter: `drop-shadow(0 0 6px ${d.color}44)`,
              }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {centerLabel !== undefined && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-2xl font-semibold text-slate-100 stat-num">{centerLabel}</div>
            {centerSub && <div className="text-[10px] uppercase tracking-wider text-slate-500">{centerSub}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export function BarChart({
  data,
  height = 180,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end justify-center group">
            <div
              className="w-full max-w-[42px] rounded-t-md transition-all duration-500 hover:brightness-125 animate-barGrow"
              style={{
                height: `${(d.value / max) * 100}%`,
                background: d.color
                  ? `linear-gradient(180deg, ${d.color}, ${d.color}55)`
                  : 'linear-gradient(180deg, #00e5a0, #00e5a055)',
                minHeight: d.value > 0 ? 4 : 0,
                animationDelay: `${i * 60}ms`,
                boxShadow: d.value > 0 ? `0 0 12px -2px ${d.color || '#00e5a0'}66` : 'none',
              }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="absolute -top-5 text-[10px] font-medium text-slate-400 stat-num opacity-0 group-hover:opacity-100 transition-opacity">{d.value}</span>
          </div>
          <span className="text-[10px] text-slate-500 text-center leading-tight truncate w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function SeverityBar({ counts }: { counts: Record<Severity, number> }) {
  const order: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
  const total = order.reduce((s, k) => s + (counts[k] ?? 0), 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-800">
      {order.map((s) => {
        const v = counts[s] ?? 0;
        if (v === 0) return null;
        return (
          <div
            key={s}
            style={{ width: `${(v / total) * 100}%`, backgroundColor: SEVERITY_META[s].color }}
            className="transition-all duration-700 hover:brightness-125"
            title={`${s}: ${v}`}
          />
        );
      })}
    </div>
  );
}

export function Sparkline({ points, color = '#00e5a0', width = 120, height = 36 }: { points: number[]; color?: string; width?: number; height?: number }) {
  if (points.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - ((p - min) / range) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height}>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={color} opacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}66)` }} />
    </svg>
  );
}
