import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Terminal, Activity } from 'lucide-react';
import type { ViewId } from '@/components/Sidebar';
import { Sidebar, MobileNav } from '@/components/Sidebar';
import { DashboardView } from '@/views/DashboardView';
import { ModelsView } from '@/views/ModelsView';
import { GeneratorView } from '@/views/GeneratorView';
import { RunnerView } from '@/views/RunnerView';
import { FindingsView } from '@/views/FindingsView';
import { HistoryView } from '@/views/HistoryView';
import { ReportView } from '@/views/ReportView';
import { ComparisonView } from '@/views/ComparisonView';
import type { TestCategory, TestRun } from '@/lib/types';
import { seedDefaultMockModel } from '@/lib/db';

export default function App() {
  const [view, setView] = useState<ViewId>('dashboard');
  const [selectedCategories, setSelectedCategories] = useState<TestCategory[]>([
    'prompt-injection',
    'jailbreak',
    'data-leakage',
    'system-prompt-leak',
  ]);
  const [reportRunId, setReportRunId] = useState<string | undefined>(undefined);
  const [bootError, setBootError] = useState('');
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    seedDefaultMockModel().catch((e) => setBootError((e as Error).message));
  }, []);

  // Reset scroll position to top whenever the view changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  function navigate(v: ViewId) {
    setView(v);
  }

  function viewRun(run: TestRun) {
    setReportRunId(run.id);
    setView('report');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 text-slate-200">
      <Sidebar current={view} onNavigate={navigate} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* SOC backdrop */}
        <div className="pointer-events-none absolute inset-0 soc-grid opacity-60" />
        <div className="pointer-events-none absolute inset-0 soc-vignette" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-500/40 to-transparent animate-scanline" />

        {/* Top bar */}
        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-900/70 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden grid h-8 w-8 place-items-center rounded-lg bg-cyber-500/10 ring-1 ring-cyber-500/30">
              <ShieldCheck size={18} className="text-cyber-400" />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 mono">
              <Terminal size={13} className="text-cyber-400" />
              <span className="text-slate-400">redteam-lab</span>
              <span className="text-slate-700">/</span>
              <span className="text-cyber-300">{viewTitle(view)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-cyber-500/20 bg-cyber-500/5 px-2.5 py-1 text-[11px] mono text-cyber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-400 animate-blink" />
              SYSTEM READY
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mono">
              <Activity size={12} className="text-slate-600" />
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Scroll area — single scroll container for the whole app */}
        <main ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 lg:pb-6">
          <div className="mx-auto max-w-7xl">
            {bootError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                Could not reach the database: {bootError}
              </div>
            )}
            <div key={view} className="animate-fadeUp">
              {renderView(view, {
                selectedCategories,
                setSelectedCategories,
                navigate,
                viewRun,
                reportRunId,
              })}
            </div>
          </div>
        </main>

        <MobileNav current={view} onNavigate={navigate} />
      </div>
    </div>
  );
}

function viewTitle(v: ViewId): string {
  const titles: Record<ViewId, string> = {
    dashboard: 'dashboard',
    models: 'models',
    generator: 'generator',
    runner: 'runner',
    findings: 'findings',
    history: 'history',
    report: 'report',
    comparison: 'comparison',
  };
  return titles[v];
}

interface ViewProps {
  selectedCategories: TestCategory[];
  setSelectedCategories: (c: TestCategory[]) => void;
  navigate: (v: ViewId) => void;
  viewRun: (run: TestRun) => void;
  reportRunId?: string;
}

function renderView(view: ViewId, props: ViewProps) {
  switch (view) {
    case 'dashboard':
      return <DashboardView onNavigate={props.navigate} />;
    case 'models':
      return <ModelsView onNavigate={props.navigate} />;
    case 'generator':
      return <GeneratorView selected={props.selectedCategories} onSelect={props.setSelectedCategories} onNavigate={props.navigate} />;
    case 'runner':
      return <RunnerView selected={props.selectedCategories} onNavigate={props.navigate} />;
    case 'findings':
      return <FindingsView />;
    case 'history':
      return <HistoryView onNavigate={props.navigate} onViewRun={props.viewRun} />;
    case 'report':
      return <ReportView presetRunId={props.reportRunId} />;
    case 'comparison':
      return <ComparisonView />;
    default:
      return null;
  }
}
