import { useEffect, useMemo, useState } from 'react';
import { FileText, AlertTriangle, CheckCircle2, Printer } from 'lucide-react';
import type { Finding, TestRun } from '@/lib/types';
import { CATEGORY_META, OWASP_CATEGORIES, SEVERITY_META } from '@/lib/owasp';
import { fetchFindingsByRun, fetchRun, fetchRuns } from '@/lib/db';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { SeverityBar } from '@/components/charts';
import { SeverityBadge, SeverityDot } from '@/components/SeverityBadge';

export function ReportView({ presetRunId }: { presetRunId?: string }) {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [runId, setRunId] = useState<string>('');
  const [run, setRun] = useState<TestRun | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchRuns();
        setRuns(r);
        if (presetRunId) {
          setRunId(presetRunId);
        } else if (r.length > 0) {
          setRunId(r[0].id!);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [presetRunId]);

  useEffect(() => {
    if (!runId) { setRun(null); setFindings([]); return; }
    setGenerating(true);
    (async () => {
      try {
        const [r, f] = await Promise.all([fetchRun(runId), fetchFindingsByRun(runId)]);
        setRun(r);
        setFindings(f);
      } finally {
        setGenerating(false);
      }
    })();
  }, [runId]);

  const failedFindings = useMemo(() => findings.filter((f) => !f.passed).sort((a, b) => SEVERITY_META[b.severity].score - SEVERITY_META[a.severity].score), [findings]);

  const owaspSummary = useMemo(() => {
    const map = new Map<string, number>();
    failedFindings.forEach((f) => map.set(f.owasp_id, (map.get(f.owasp_id) ?? 0) + 1));
    return OWASP_CATEGORIES.map((o) => ({ ...o, count: map.get(o.id) ?? 0 }));
  }, [failedFindings]);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={28} /></div>;

  return (
    <div>
      <PageHeader
        title="Security Report Generator"
        subtitle="Generate a professional AI security assessment report from any saved test run."
        icon={<FileText size={20} />}
        actions={
          run && (
            <button className="btn-ghost" onClick={() => window.print()}>
              <Printer size={15} /> Print / PDF
            </button>
          )
        }
      />

      {runs.length === 0 ? (
        <EmptyState icon={<FileText size={26} />} title="No runs to report on" description="Save a test run first, then generate a professional assessment report." />
      ) : (
        <Card className="p-4 mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="label">Select Test Run</label>
              <select className="input" value={runId} onChange={(e) => setRunId(e.target.value)}>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.model_name} ({r.created_at ? new Date(r.created_at).toLocaleDateString() : ''})</option>
                ))}
              </select>
            </div>
            {generating && <span className="inline-flex items-center gap-2 text-xs text-cyber-400"><Spinner size={14} /> Compiling…</span>}
          </div>
        </Card>
      )}

      {run && !generating && (
        <Card className="p-6 sm:p-8 animate-fadeUp print:shadow-none print:border-0">
          {/* Report header */}
          <div className="border-b border-ink-700 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-cyber-400/80 mono">AI Red Teaming Lab · Security Assessment</div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">{run.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Target model: <span className="text-slate-300">{run.model_name}</span></p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Report ID: <span className="mono text-slate-300">{run.id?.slice(0, 8)}</span></div>
                <div>Generated: <span className="mono text-slate-300">{new Date().toLocaleString()}</span></div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Overall Risk:</span> <SeverityBadge severity={run.overall_risk} size="md" />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 size={14} className="text-cyber-400" /> {run.passed} passed
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <AlertTriangle size={14} className="text-amber-400" /> {run.failed} findings
              </div>
              <div className="text-sm text-slate-400">Duration: <span className="mono">{(run.duration_ms / 1000).toFixed(1)}s</span></div>
            </div>
          </div>

          {/* Authorization scope */}
          <div className="mt-6 rounded-lg border border-cyber-500/20 bg-cyber-500/5 p-4">
            <div className="text-xs font-semibold text-cyber-400 uppercase tracking-wider">Authorization & Scope</div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              This assessment was conducted in an authorized, isolated testing environment. All test cases are
              defensively-oriented probes designed for models owned by or explicitly authorized for testing by the
              operator. No attacks were performed against third-party AI systems. Findings reflect the model's behavior
              under the configured conditions at the time of execution and may not generalize to other deployments.
            </p>
          </div>

          {/* Executive summary */}
          <section className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Executive Summary</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-4">
                <div className="text-xs text-slate-500 mb-2">Severity Distribution</div>
                <SeverityBar counts={{ Informational: run.informational, Low: run.low, Medium: run.medium, High: run.high, Critical: run.critical }} />
                <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                  {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as const).map((s) => (
                    <div key={s}>
                      <div className="text-lg font-semibold stat-num" style={{ color: SEVERITY_META[s].color }}>{run[s.toLowerCase() as 'critical'] as number}</div>
                      <div className="text-[9px] uppercase text-slate-500">{s.slice(0, 4)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-4">
                <div className="text-xs text-slate-500 mb-2">OWASP LLM Top 10 Coverage</div>
                <div className="space-y-1">
                  {owaspSummary.filter((o) => o.count > 0).map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400"><span className="mono text-cyber-400/70">{o.id}</span> {o.name}</span>
                      <span className="stat-num text-slate-300">{o.count}</span>
                    </div>
                  ))}
                  {owaspSummary.every((o) => o.count === 0) && <p className="text-xs text-slate-500">No OWASP-mapped findings.</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Findings detail */}
          <section className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Findings Detail ({failedFindings.length})</h3>
            <div className="mt-3 space-y-3">
              {failedFindings.map((f, i) => {
                const cat = CATEGORY_META[f.category as keyof typeof CATEGORY_META];
                return (
                  <div key={f.id} className="rounded-lg border border-ink-800 bg-ink-900/40 p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 mono">#{i + 1}</span>
                      <SeverityDot severity={f.severity} />
                      <span className="text-sm font-medium text-slate-200 flex-1">{f.title}</span>
                      <span className="mono text-[10px] text-slate-500">{f.test_id}</span>
                      <SeverityBadge severity={f.severity} />
                    </div>
                    <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Category</div>
                        <p className="text-slate-300">{cat?.label} · <span className="mono text-cyber-400/70">{f.owasp_id}</span></p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Evidence</div>
                        <p className="text-slate-300">{f.evidence}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-md border border-cyber-500/15 bg-cyber-500/5 p-2.5 text-xs text-slate-300">
                      <span className="text-cyber-400/80 font-medium">Remediation: </span>{f.recommendation}
                    </div>
                  </div>
                );
              })}
              {failedFindings.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No failed findings — all tests passed.</p>}
            </div>
          </section>

          <div className="mt-8 border-t border-ink-800 pt-4 text-[10px] text-slate-600 mono">
            AI Red Teaming Lab · Confidential — for authorized defensive security research only · Generated {new Date().toISOString()}
          </div>
        </Card>
      )}
    </div>
  );
}
