import { useEffect, useMemo, useState } from 'react';
import { GitCompareArrows, X, Cpu } from 'lucide-react';
import type { TestRun } from '@/lib/types';
import { fetchRuns } from '@/lib/db';
import { CATEGORY_META } from '@/lib/owasp';
import type { Severity } from '@/lib/types';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { SeverityBadge, SeverityDot } from '@/components/SeverityBadge';

export function ComparisonView() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchRuns();
        setRuns(r);
        if (r.length >= 2) setSelected([r[0].id!, r[1].id!].slice(0, 2));
        else if (r.length === 1) setSelected([r[0].id!]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const compareRuns = useMemo(() => selected.map((id) => runs.find((r) => r.id === id)).filter(Boolean) as TestRun[], [selected, runs]);

  const metrics = useMemo(() => {
    return compareRuns.map((r) => ({
      run: r,
      passRate: r.total ? Math.round((r.passed / r.total) * 100) : 0,
      critical: r.critical,
      high: r.high,
      riskScore:
        r.critical * 10 + r.high * 8 + r.medium * 5 + r.low * 3 + r.informational * 1,
    }));
  }, [compareRuns]);

  const maxRiskScore = Math.max(1, ...metrics.map((m) => m.riskScore));

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={28} /></div>;

  return (
    <div>
      <PageHeader
        title="Model Comparison"
        subtitle="Compare security test results side-by-side across models and runs."
        icon={<GitCompareArrows size={20} />}
      />

      {runs.length === 0 ? (
        <EmptyState icon={<GitCompareArrows size={26} />} title="No runs to compare" description="Run and save at least two test runs to compare security posture across models." />
      ) : (
        <>
          <Card className="p-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 mr-2">Comparing:</span>
              {compareRuns.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-2 rounded-lg border border-cyber-500/30 bg-cyber-500/8 px-3 py-1.5 text-xs text-slate-200">
                  {r.model_name} · {r.name}
                  <button onClick={() => setSelected(selected.filter((id) => id !== r.id))} className="text-slate-500 hover:text-red-400">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <div className="relative">
                <select
                  className="input py-1.5 text-xs w-48"
                  value=""
                  onChange={(e) => { if (e.target.value && selected.length < 4) setSelected([...selected, e.target.value]); }}
                >
                  <option value="">+ Add run…</option>
                  {runs.filter((r) => !selected.includes(r.id!)).map((r) => (
                    <option key={r.id} value={r.id}>{r.model_name} — {r.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {compareRuns.length === 0 ? (
            <EmptyState icon={<Cpu size={26} />} title="Select runs to compare" description="Add one or more runs above to see a side-by-side comparison." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {metrics.map((m) => (
                <Card key={m.run.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{m.run.model_name}</div>
                      <div className="text-[11px] text-slate-500">{m.run.name}</div>
                    </div>
                    <SeverityBadge severity={m.run.overall_risk} size="md" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-3 text-center">
                      <div className="text-2xl font-semibold text-cyber-400 stat-num">{m.passRate}%</div>
                      <div className="text-[10px] uppercase text-slate-500">Pass rate</div>
                    </div>
                    <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-3 text-center">
                      <div className="text-2xl font-semibold text-slate-200 stat-num">{m.run.total}</div>
                      <div className="text-[10px] uppercase text-slate-500">Tests</div>
                    </div>
                    <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-3 text-center">
                      <div className="text-2xl font-semibold text-amber-400 stat-num">{m.riskScore}</div>
                      <div className="text-[10px] uppercase text-slate-500">Risk score</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Risk score bar</div>
                    <div className="h-2.5 w-full rounded-full bg-ink-800">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(m.riskScore / maxRiskScore) * 100}%`, background: 'linear-gradient(90deg, #00e5a0, #fb923c, #f87171)' }} />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map((s) => {
                      const val = s === 'Informational' ? m.run.informational : (m.run[s.toLowerCase() as 'critical'] as number);
                      return (
                        <div key={s} className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-2 text-slate-400"><SeverityDot severity={s} /> {s}</span>
                          <span className="stat-num text-slate-300">{val}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t border-ink-800 pt-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Categories tested</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(m.run.categories ?? []).map((c) => (
                        <span key={c} className="chip border-ink-700 bg-ink-800 text-slate-400 text-[10px]">{CATEGORY_META[c as keyof typeof CATEGORY_META]?.label ?? c}</span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {metrics.length >= 2 && (
            <Card className="mt-4 p-5">
              <h3 className="text-sm font-semibold text-slate-200">Summary Comparison</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-800 text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-4 font-medium">Metric</th>
                      {metrics.map((m) => <th key={m.run.id} className="py-2 px-4 font-medium">{m.run.model_name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <MetricRow label="Overall Risk" values={metrics.map((m) => <SeverityBadge severity={m.run.overall_risk} />)} />
                    <MetricRow label="Pass Rate" values={metrics.map((m) => <span className="stat-num text-slate-200">{m.passRate}%</span>)} />
                    <MetricRow label="Total Tests" values={metrics.map((m) => <span className="stat-num text-slate-200">{m.run.total}</span>)} />
                    <MetricRow label="Critical" values={metrics.map((m) => <span className="stat-num text-red-400">{m.run.critical}</span>)} />
                    <MetricRow label="High" values={metrics.map((m) => <span className="stat-num text-orange-400">{m.run.high}</span>)} />
                    <MetricRow label="Medium" values={metrics.map((m) => <span className="stat-num text-amber-400">{m.run.medium}</span>)} />
                    <MetricRow label="Risk Score" values={metrics.map((m) => <span className="stat-num text-amber-400">{m.riskScore}</span>)} />
                    <MetricRow label="Duration" values={metrics.map((m) => <span className="mono text-slate-300">{(m.run.duration_ms / 1000).toFixed(1)}s</span>)} />
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">Risk score = Critical×10 + High×8 + Medium×5 + Low×3 + Informational×1. Lower is better.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricRow({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-b border-ink-800/50">
      <td className="py-2.5 pr-4 text-slate-400">{label}</td>
      {values.map((v, i) => <td key={i} className="py-2.5 px-4">{v}</td>)}
    </tr>
  );
}
