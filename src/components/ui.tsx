import type { CSSProperties, ReactNode } from 'react';
import { SeverityLegend } from './SeverityBadge';

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  showLegend = false,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  showLegend?: boolean;
}) {
  return (
    <div className="mb-6 animate-fadeUp">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-lg bg-cyber-500/10 ring-1 ring-cyber-500/25 text-cyber-400 transition-transform duration-200 hover:scale-105">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-400 max-w-2xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {showLegend && (
        <div className="mt-4">
          <SeverityLegend />
        </div>
      )}
    </div>
  );
}

export function Card({
  children,
  className = '',
  hover = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  style?: CSSProperties;
}) {
  return <div className={`panel ${hover ? 'panel-hover' : ''} ${className}`} style={style}>{children}</div>;
}

export function StatCard({
  label,
  value,
  icon,
  accent = 'cyber',
  hint,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: 'cyber' | 'signal' | 'red' | 'amber' | 'violet';
  hint?: string;
  delay?: number;
}) {
  const accents: Record<string, string> = {
    cyber: 'text-cyber-400 bg-cyber-500/10 ring-cyber-500/25',
    signal: 'text-signal-500 bg-signal-500/10 ring-signal-500/25',
    red: 'text-red-400 bg-red-500/10 ring-red-500/25',
    amber: 'text-amber-400 bg-amber-500/10 ring-amber-500/25',
    violet: 'text-violet-400 bg-violet-500/10 ring-violet-500/25',
  };
  return (
    <Card className="p-5 stagger-in group" hover style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
        <div className={`grid h-8 w-8 place-items-center rounded-md ring-1 transition-transform duration-200 group-hover:scale-110 ${accents[accent]}`}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-100 stat-num">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="p-10 text-center animate-scaleIn">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-ink-800 ring-1 ring-ink-700 text-slate-500">
        {icon}
      </div>
      <h3 className="text-base font-medium text-slate-200">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-cyber-500/30 border-t-cyber-400 animate-sweep"
      style={{ width: size, height: size }}
    />
  );
}
