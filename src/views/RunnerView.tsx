import { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Play, Square, CheckCircle2, XCircle, Loader2, Cpu, AlertTriangle, Save, Key, Zap, Eye, EyeOff } from 'lucide-react';
import type { Finding, ModelConfig, Severity, TestCategory, TestCase } from '@/lib/types';
import { CATEGORY_META } from '@/lib/owasp';
import { getCasesByCategories } from '@/lib/testLibrary';
import { runTests } from '@/lib/testEngine';
import type { RunProgress } from '@/lib/testEngine';
import { fetchModels, saveRun } from '@/lib/db';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { SeverityBar } from '@/components/charts';
import { SeverityBadge, SeverityDot } from '@/components/SeverityBadge';
import type { ViewId } from '@/components/Sidebar';

export function RunnerView({
  selected,
  onNavigate,
}: {
  selected: TestCategory[];
  onNavigate: (v: ViewId) => void;
}) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [modelId, setModelId] = useState<string>('');
  const [runName, setRunName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<RunProgress[]>([]);
  const [results, setResults] = useState<RunResultState | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const liveListRef = useRef<HTMLDivElement | null>(null);

  const cases = getCasesByCategories(selected);
  const selectedModel = models.find((m) => m.id === modelId);
  const isRealModel = selectedModel && !selectedModel.isMock;

  useEffect(() => {
    (async () => {
      try {
        const m = await fetchModels();
        setModels(m);
        if (m.length > 0) setModelId(m[0].id!);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-scroll the live execution list to follow the latest test
  useEffect(() => {
    if (running && liveListRef.current) {
      liveListRef.current.scrollTop = liveListRef.current.scrollHeight;
    }
  }, [progress, running]);

  // Clear API key when switching to a mock model
  useEffect(() => {
    if (selectedModel?.isMock) setApiKey('');
  }, [modelId, selectedModel]);

  async function handleRun() {
    const model = models.find((m) => m.id === modelId);
    if (!model) { setError('Select a model first'); return; }
    if (cases.length === 0) { setError('No test cases selected. Visit the Test Generator first.'); return; }
    if (!model.isMock && !apiKey.trim()) { setError('API key is required for real model testing. Enter it below.'); return; }

    setRunning(true); setError(''); setSaved(false);
    setResults(null); setProgress([]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await runTests(model, cases, {
        signal: controller.signal,
        apiKey,
        onProgress: (p) => {
          setProgress((prev) => {
            const next = [...prev];
            next[p.index] = p;
            return next;
          });
        },
      });

      const sev: Record<Severity, number> = { Informational: 0, Low: 0, Medium: 0, High: 0, Critical: 0 };
      res.findings.forEach((f) => {
        if (!f.analysis.passed) sev[f.analysis.severity] += 1;
      });
      sev.Informational = res.passed;

      setResults({
        findings: res.findings,
        passed: res.passed,
        failed: res.failed,
        severityCounts: sev,
        overallRisk: res.overallRisk,
        durationMs: res.durationMs,
        model,
        cases,
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
    setRunning(false);
  }

  async function handleSave() {
    if (!results) return;
    const model = results.model;
    setSaving(true);
    try {
      const findings: Finding[] = results.findings.map((f) => ({
        test_id: f.test.id,
        title: f.analysis.title,
        category: f.test.category,
        owasp_id: f.test.owaspId,
        severity: f.analysis.severity,
        status: 'open' as const,
        prompt: f.test.prompt,
        response: f.response,
        evidence: f.analysis.evidence,
        recommendation: f.analysis.recommendation,
        passed: f.analysis.passed,
      }));
      await saveRun(
        {
          model_id: model.id,
          model_name: model.name,
          name: runName || `${model.name} — ${new Date().toLocaleString()}`,
          categories: selected,
          total: results.passed + results.failed,
          passed: results.passed,
          failed: results.failed,
          informational: results.severityCounts.Informational,
          low: results.severityCounts.Low,
          medium: results.severityCounts.Medium,
          high: results.severityCounts.High,
          critical: results.severityCounts.Critical,
          overall_risk: results.overallRisk,
          duration_ms: results.durationMs,
          status: 'completed',
        },
        findings,
      );
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={28} /></div>;

  if (models.length === 0) {
    return (
      <div>
        <PageHeader title="Test Runner" subtitle="Execute selected security test cases against an authorized AI model." icon={<ShieldAlert size={20} />} />
        <EmptyState
          icon={<Cpu size={26} />}
          title="No models configured"
          description="Add an AI model (mock or real) before running tests."
          action={<button className="btn-primary" onClick={() => onNavigate('models')}>Configure a model</button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Test Runner"
        subtitle="Execute selected security test cases against an authorized AI model. Mock models run entirely offline."
        icon={<ShieldAlert size={20} />}
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fadeUp">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-300 shrink-0"><XCircle size={15} /></button>
        </div>
      )}

      <Card className="p-5 animate-fadeUp">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Target Model</label>
            <select className="input" value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={running}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name} {m.isMock ? '(mock)' : '(live)'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Run Name</label>
            <input className="input" value={runName} onChange={(e) => setRunName(e.target.value)} placeholder={`Run ${new Date().toLocaleDateString()}`} disabled={running} />
          </div>
          <div className="flex items-end">
            {!running ? (
              <button className="btn-primary w-full" onClick={handleRun} disabled={cases.length === 0}>
                <Play size={15} /> Run {cases.length} tests
              </button>
            ) : (
              <button className="btn-danger w-full" onClick={handleAbort}>
                <Square size={14} /> Abort Run
              </button>
            )}
          </div>
        </div>

        {/* API Key input for real models */}
        {isRealModel && (
          <div className="mt-4 rounded-lg border border-signal-500/25 bg-signal-500/5 p-4 animate-fadeUp">
            <div className="flex items-center gap-2 mb-2">
              <Key size={14} className="text-signal-500" />
              <span className="text-xs font-medium text-signal-500 uppercase tracking-wider">Runtime API Key Required</span>
            </div>
            <div className="relative">
              <input
                className="input pr-10 mono text-xs"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key here (not stored, sent only to the proxy)"
                disabled={running}
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                type="button"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              The key is sent only to the edge function proxy and is never stored in the database or browser.
              Endpoint: <span className="mono text-slate-400">{selectedModel?.endpoint}</span>
            </p>
          </div>
        )}

        {/* Selected categories */}
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((c) => (
            <span key={c} className="chip border-cyber-500/20 bg-cyber-500/8 text-cyber-300/90">{CATEGORY_META[c].label}</span>
          ))}
          {selected.length === 0 && <span className="text-xs text-slate-500">No categories selected — visit the Test Generator.</span>}
        </div>
      </Card>

      {(running || progress.length > 0) && (
        <Card className="mt-4 p-5 animate-fadeUp">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-200">Live Execution</h3>
              {running && (
                <span className="inline-flex items-center gap-1.5 text-xs text-cyber-400">
                  <Zap size={12} className="animate-pulseGlow" />
                  {progress.filter((p) => p && (p.status === 'passed' || p.status === 'failed')).length} / {cases.length}
                </span>
              )}
            </div>
            {running && <span className="inline-flex items-center gap-1.5 text-xs text-cyber-400"><Loader2 size={13} className="animate-spin" /> Processing…</span>}
          </div>

          {/* Progress bar */}
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-500 to-cyber-400 transition-all duration-300"
              style={{ width: `${(progress.filter((p) => p && (p.status === 'passed' || p.status === 'failed')).length / cases.length) * 100}%` }}
            />
          </div>

          <div ref={liveListRef} className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {cases.map((t, i) => {
              const p = progress[i];
              const status = p?.status ?? 'pending';
              return (
                <div key={t.id} className={`flex items-center gap-3 rounded-lg border p-2.5 text-xs transition-all duration-300 ${
                  status === 'running' ? 'border-cyber-500/40 bg-cyber-500/8 scale-[1.01]' :
                  status === 'failed' ? 'border-red-500/25 bg-red-500/5' :
                  status === 'passed' ? 'border-ink-800 bg-ink-900/40' :
                  'border-ink-800 bg-ink-900/20'
                }`}>
                  <span className="mono text-[10px] text-slate-500 w-16 shrink-0">{t.id}</span>
                  <span className="text-slate-400 truncate flex-1">{t.technique}</span>
                  {status === 'running' && <Loader2 size={13} className="animate-spin text-cyber-400 shrink-0" />}
                  {status === 'passed' && <CheckCircle2 size={14} className="text-cyber-400 shrink-0" />}
                  {status === 'failed' && p?.analysis && <SeverityBadge severity={p.analysis.severity} />}
                  {status === 'failed' && !p?.analysis && <XCircle size={14} className="text-red-400 shrink-0" />}
                  {status === 'pending' && <span className="h-3.5 w-3.5 rounded-full border border-ink-700 shrink-0" />}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {results && (
        <Card className="mt-4 p-5 animate-fadeUp">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyber-400" /> Run Complete
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {results.passed} passed · {results.failed} failed · {(results.durationMs / 1000).toFixed(1)}s · overall risk{' '}
                <SeverityBadge severity={results.overallRisk} />
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!saved ? (
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Spinner size={15} /> : <Save size={15} />} Save to History
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-cyber-400 animate-fadeUp"><CheckCircle2 size={14} /> Saved to history</span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <SeverityBar counts={results.severityCounts} />
          </div>

          <div className="mt-4 space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {results.findings.map((f, i) => (
              <FindingRow key={i} test={f.test} response={f.response} analysis={f.analysis} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface RunResultState {
  findings: { test: TestCase; response: string; analysis: { passed: boolean; severity: Severity; evidence: string; recommendation: string; title: string } }[];
  passed: number;
  failed: number;
  severityCounts: Record<Severity, number>;
  overallRisk: Severity;
  durationMs: number;
  model: ModelConfig;
  cases: TestCase[];
}

function FindingRow({ test, response, analysis }: { test: TestCase; response: string; analysis: { passed: boolean; severity: Severity; evidence: string; recommendation: string; title: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-lg border p-3.5 transition-all duration-200 ${analysis.passed ? 'border-ink-800 bg-ink-900/30' : 'border-ink-800 bg-ink-900/50'} ${open ? 'border-cyber-500/20' : ''}`}>
      <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen((o) => !o)}>
        <SeverityDot severity={analysis.passed ? 'Informational' : analysis.severity} />
        <span className="mono text-[10px] text-slate-500 w-16 shrink-0">{test.id}</span>
        <span className="text-sm text-slate-200 flex-1 truncate">{analysis.title}</span>
        {analysis.passed ? (
          <span className="chip sev-info"><CheckCircle2 size={11} /> Passed</span>
        ) : (
          <SeverityBadge severity={analysis.severity} />
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-3 animate-fadeUp">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Prompt Sent</div>
            <pre className="whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/60 p-2.5 text-xs text-slate-300 mono max-h-40 overflow-y-auto">{test.prompt}</pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Model Response</div>
            <pre className="whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/60 p-2.5 text-xs text-slate-300 mono max-h-40 overflow-y-auto">{response}</pre>
          </div>
          {!analysis.passed && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-amber-400/80 mb-1">Evidence</div>
                <p className="text-xs text-slate-300">{analysis.evidence}</p>
              </div>
              <div className="rounded-md border border-cyber-500/20 bg-cyber-500/5 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-cyber-400/80 mb-1">Recommendation</div>
                <p className="text-xs text-slate-300">{analysis.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
