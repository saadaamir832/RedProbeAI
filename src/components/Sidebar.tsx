import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, ShieldAlert, FileWarning, Activity, Cpu, FlaskConical, FileText, GitCompareArrows, History } from 'lucide-react';

export type ViewId =
  | 'dashboard'
  | 'models'
  | 'generator'
  | 'runner'
  | 'findings'
  | 'history'
  | 'report'
  | 'comparison';

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  group: 'Monitor' | 'Test' | 'Analyze';
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity, group: 'Monitor' },
  { id: 'models', label: 'AI Models', icon: Cpu, group: 'Test' },
  { id: 'generator', label: 'Test Generator', icon: FlaskConical, group: 'Test' },
  { id: 'runner', label: 'Test Runner', icon: ShieldAlert, group: 'Test' },
  { id: 'findings', label: 'Findings', icon: FileWarning, group: 'Analyze' },
  { id: 'history', label: 'Test History', icon: History, group: 'Analyze' },
  { id: 'comparison', label: 'Model Comparison', icon: GitCompareArrows, group: 'Analyze' },
  { id: 'report', label: 'Report Generator', icon: FileText, group: 'Analyze' },
];

const GROUPS: NavItem['group'][] = ['Monitor', 'Test', 'Analyze'];

export function Sidebar({ current, onNavigate }: { current: ViewId; onNavigate: (v: ViewId) => void }) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900/60 backdrop-blur">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-ink-800">
        <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-cyber-500/10 ring-1 ring-cyber-500/30">
          <ShieldCheck size={20} className="text-cyber-400" />
          <span className="absolute inset-0 rounded-lg ring-1 ring-cyber-500/20 animate-pulseGlow" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">Red Team Lab</div>
          <div className="text-[10px] uppercase tracking-wider text-cyber-400/80 mono">SOC Console</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
        {GROUPS.map((group) => (
          <div key={group}>
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {group}
            </div>
            <div className="space-y-1">
              {NAV.filter((n) => n.group === group).map((item) => {
                const active = current === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={[
                      'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                      active
                        ? 'bg-cyber-500/10 text-cyber-300 ring-1 ring-cyber-500/20'
                        : 'text-slate-400 hover:bg-ink-800/60 hover:text-slate-200',
                    ].join(' ')}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-cyber-400 animate-slideIn" />
                    )}
                    <Icon
                      size={17}
                      className={`transition-transform duration-200 ${active ? 'text-cyber-400' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-110'}`}
                      strokeWidth={2}
                    />
                    {item.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyber-400 animate-blink" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-800 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-600 mono">
          <span className="h-2 w-2 rounded-full bg-cyber-400 animate-blink" />
          AUTHORIZED USE ONLY
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ current, onNavigate }: { current: ViewId; onNavigate: (v: ViewId) => void }) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-800 bg-ink-900/95 backdrop-blur">
      <div className="flex overflow-x-auto no-scrollbar">
        {NAV.map((item) => {
          const active = current === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={[
                'flex flex-1 min-w-[64px] flex-col items-center gap-1 py-2.5 text-[10px] transition-all duration-200',
                active ? 'text-cyber-400' : 'text-slate-500',
              ].join(' ')}
            >
              <Icon size={18} strokeWidth={2} className={active ? 'scale-110' : ''} />
              {item.label.split(' ')[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
