import { useEffect, useMemo, useState } from 'react';
import { Activity, Cpu, FileWarning, ShieldCheck, AlertOctagon, TrendingUp, Terminal, Radar } from 'lucide-react';
import type { Finding, Severity, TestRun } from '@/lib/types';
import { SEVERITY_META, OWASP_CATEGORIES, CATEGORY_META } from '@/lib/owasp';
import { fetchAllFindings, fetchModels, fetchRuns, fetchRunStats } from '@/lib/db';
import { Card, EmptyState, PageHeader, StatCard } from '@/components/ui';
import { BarChart, DonutChart, SeverityBar, Sparkline } from '@/components/charts';
import { SeverityBadge, SeverityDot } from '@/components/SeverityBadge';
import type { ViewId } from '@/components/Sidebar';

export function DashboardView({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [findings, setFindings] = useState<(Finding & { model_name?: string })[]>([]);
  const [stats, setStats] = useState({ totalRuns: 0, totalFindings: 0, totalModels: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, f, s] = await Promise.all([fetchRuns(), fetchAllFindings(), fetchRunStats()]);
        setRuns(r);
        setFindings(f);
        setStats(s);
      } catch {
        // data may be empty on first load
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const severityCounts = useMemo<Record<Severity, number>>(() => {
    const base: Record<Severity, number> = { Informational: 0, Low: 0, Medium: 0, High: 0, Critical: 0 };
    findings.forEach((f) => { base[f.severity] = (base[f.severity] ?? 0) + 1; });
    return base;
  }, [findings]);

  const passFail = useMemo(() => {
    const passed = runs.reduce((s, r) => s + r.passed, 0);
    const failed = runs.reduce((s, r) => s + r.failed, 0);
    return { passed, failed };
  }, [runs]);

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    findings.forEach((f) => counts.set(f.category, (counts.get(f.category) ?? 0) + 1));
    return Object.entries(CATEGORY_META).map(([k, v]) => ({
      label: v.label.split(' ')[0],
      value: counts.get(k) ?? 0,
    }));
  }, [findings]);

  const owaspCounts = useMemo(() => {
    const counts = new Map<string, number>();
    findings.forEach((f) => counts.set(f.owasp_id, (counts.get(f.owasp_id) ?? 0) + 1));
    return counts;
  }, [findings]);

  const recentRuns = runs.slice(0, 6);
  const sparkData = runs.slice(0, 12).reverse().map((r) => r.failed);

  if (!loading && stats.totalRuns === 0) {
    return (
      <div>
        <PageHeader title="Operations Dashboard" subtitle="Live posture across all authorized AI red-teaming activities." icon={<Activity size={20} />} />
        <EmptyState
          icon={<Radar size={26} />}
          title="No test data yet"
          description="Run your first automated security test to populate the dashboard with findings, severity metrics, and risk posture."
          action={<button className="btn-primary" onClick={() => onNavigate('runner')}>Launch a test run</button>}
        />
      </div>
    );
  }

  const donutData = (['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[])
    .map((s) => ({ label: s, value: severityCounts[s] ?? 0, color: SEVERITY_META[s].color }))
    .filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Live posture across all authorized AI red-teaming activities."
        icon={<Activity size={20} />}
        actions={
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-3 py-1.5 text-xs text-slate-400 mono">
            <Terminal size={13} className="text-cyber-400" />
            <span className="text-slate-300">lab://</span> authorized-scope
          </div>
        }
        showLegend
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Test Runs" value={stats.totalRuns} icon={<Activity size={16} />} accent="cyber" hint={`${passFail.passed + passFail.failed} total probes executed`} delay={0} />
        <StatCard label="Findings" value={stats.totalFindings} icon={<FileWarning size={16} />} accent="amber" hint={`${severityCounts.Critical + severityCounts.High} high+ critical`} delay={80} />
        <StatCard label="AI Models" value={stats.totalModels} icon={<Cpu size={16} />} accent="signal" hint="Configured test targets" delay={160} />
        <StatCard label="Pass Rate" value={passFail.passed + passFail.failed ? `${Math.round((passFail.passed / (passFail.passed + passFail.failed)) * 100)}%` : '—'} icon={<ShieldCheck size={16} />} accent="violet" hint={`${passFail.passed} passed / ${passFail.failed} failed`} delay={240} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1 stagger-in" hover style={{ animationDelay: '320ms' }}>
          <h3 className="text-sm font-semibold text-slate-200">Severity Distribution</h3>
          <div className="mt-4 flex flex-col items-center gap-4">
            <DonutChart data={donutData} centerLabel={String(stats.totalFindings)} centerSub="findings" />
            <div className="w-full space-y-2">
              {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map((s) => (
                <div key={s} className="flex items-center justify-between text-xs hover:bg-ink-800/40 rounded px-2 py-1 -mx-2 transition-colors">
                  <span className="inline-flex items-center gap-2 text-slate-400">
                    <SeverityDot severity={s} /> {s}
                  </span>
                  <span className="stat-num text-slate-300">{severityCounts[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2 stagger-in" hover style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Findings by Test Category</h3>
            <span className="text-[11px] text-slate-500 mono">OWASP LLM Top 10 aligned</span>
          </div>
          <div className="mt-6">
            <BarChart data={categoryData} height={180} />
          </div>
          <div className="mt-5 border-t border-ink-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">OWASP LLM Coverage</h4>
              <TrendingUp size={14} className="text-cyber-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {OWASP_CATEGORIES.map((o, i) => {
                const count = owaspCounts.get(o.id) ?? 0;
                return (
                  <div
                    key={o.id}
                    className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5 transition-all duration-200 hover:border-cyber-500/30 hover:bg-cyber-500/5 stagger-in"
                    style={{ animationDelay: `${400 + i * 40}ms` }}
                    title={o.name}
                  >
                    <div className="text-[10px] mono text-cyber-400/80">{o.id}</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-200 stat-num">{count}</div>
                    <div className="text-[10px] text-slate-500 truncate">{o.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 stagger-in" hover style={{ animationDelay: '480ms' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Recent Test Runs</h3>
            <button className="text-xs text-cyber-400 hover:text-cyber-300 transition-colors" onClick={() => onNavigate('history')}>View all →</button>
          </div>
          <div className="mt-4 space-y-2">
            {recentRuns.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No runs recorded yet.</p>}
            {recentRuns.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-900/40 p-3 hover:border-cyber-500/20 hover:bg-cyber-500/5 transition-all duration-200 cursor-default">
                <SeverityDot severity={r.overall_risk} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-200 truncate">{r.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.model_name} · {r.total} tests · {(r.duration_ms / 1000).toFixed(1)}s</div>
                </div>
                <div className="hidden sm:block w-32">
                  <SeverityBar counts={{ Informational: r.passed, Low: r.low, Medium: r.medium, High: r.high, Critical: r.critical }} />
                </div>
                <SeverityBadge severity={r.overall_risk} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 stagger-in" hover style={{ animationDelay: '560ms' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Risk Trend</h3>
            <AlertOctagon size={14} className="text-red-400" />
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 py-4">
            <Sparkline points={sparkData.length ? sparkData : [0, 0, 0]} color="#fb923c" width={220} height={60} />
            <p className="text-xs text-slate-500 text-center">Failed probes across the last {Math.min(runs.length, 12)} runs. Lower is better.</p>
          </div>
          <div className="mt-4 border-t border-ink-800 pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Highest severity observed</span>
              <SeverityBadge severity={((['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).find((s) => (severityCounts[s] ?? 0) > 0) ?? 'Informational')} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Open findings</span>
              <span className="stat-num text-slate-300">{findings.filter((f) => f.status === 'open').length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
