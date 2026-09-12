import type { Severity } from '@/lib/types';
import { SEVERITY_META } from '@/lib/owasp';
import { ShieldAlert, ShieldCheck, Info, AlertTriangle, AlertOctagon, AlertCircle } from 'lucide-react';

const ICONS: Record<Severity, typeof ShieldAlert> = {
  Informational: Info,
  Low: ShieldCheck,
  Medium: AlertCircle,
  High: AlertTriangle,
  Critical: AlertOctagon,
};

export function SeverityBadge({ severity, size = 'sm' }: { severity: Severity; size?: 'sm' | 'md' }) {
  const meta = SEVERITY_META[severity];
  const Icon = ICONS[severity];
  const pad = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={`chip border ${meta.chip} ${pad}`}>
      <Icon size={size === 'md' ? 13 : 11} strokeWidth={2.5} />
      {severity}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
      aria-label={severity}
    />
  );
}

export function SeverityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
      {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <SeverityDot severity={s} />
          {s}
        </span>
      ))}
    </div>
  );
}
