import { useEffect, useMemo, useState } from 'react';
import { FileWarning, Search, Filter, ChevronDown, ChevronRight, ShieldCheck, ExternalLink } from 'lucide-react';
import type { Finding, FindingStatus, Severity, TestCategory } from '@/lib/types';
import { CATEGORY_META, OWASP_CATEGORIES, SEVERITY_META } from '@/lib/owasp';
import { fetchAllFindings, updateFindingStatus } from '@/lib/db';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { SeverityBadge, SeverityDot } from '@/components/SeverityBadge';

const STATUSES: FindingStatus[] = ['open', 'confirmed', 'mitigated', 'false-positive'];

export function FindingsView() {
  const [findings, setFindings] = useState<(Finding & { model_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all');
  const [catFilter, setCatFilter] = useState<TestCategory | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setFindings(await fetchAllFindings());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings.filter((f) => {
      if (f.passed) return false; // only show actual findings
      if (sevFilter !== 'all' && f.severity !== sevFilter) return false;
      if (catFilter !== 'all' && f.category !== catFilter) return false;
      if (q && !(`${f.title} ${f.evidence} ${f.test_id} ${f.prompt}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [findings, query, sevFilter, catFilter]);

  async function handleStatus(id: string, status: FindingStatus) {
    try {
      await updateFindingStatus(id, status);
      setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { Informational: 0, Low: 0, Medium: 0, High: 0, Critical: 0 };
    findings.filter((f) => !f.passed).forEach((f) => { c[f.severity] += 1; });
    return c;
  }, [findings]);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={28} /></div>;

  return (
    <div>
      <PageHeader
        title="Findings Dashboard"
        subtitle="All detected vulnerabilities with severity, evidence, and remediation recommendations."
        icon={<FileWarning size={20} />}
        showLegend
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map((s) => (
          <Card key={s} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-500">{s}</span>
              <SeverityDot severity={s} />
            </div>
            <div className="mt-1 text-2xl font-semibold stat-num" style={{ color: SEVERITY_META[s].color }}>{counts[s]}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9" placeholder="Search findings by title, evidence, test ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select className="input pl-8 pr-7 text-xs" value={sevFilter} onChange={(e) => setSevFilter(e.target.value as Severity | 'all')}>
                <option value="all">All severities</option>
                {(['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <select className="input text-xs" value={catFilter} onChange={(e) => setCatFilter(e.target.value as TestCategory | 'all')}>
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <EmptyState
            icon={<ShieldCheck size={26} />}
            title="No findings match"
            description="Adjust filters or run a new test to generate findings."
          />
        )}
        {filtered.map((f) => {
          const isOpen = expanded === f.id;
          const cat = CATEGORY_META[f.category as TestCategory];
          const owasp = OWASP_CATEGORIES.find((o) => o.id === f.owasp_id);
          return (
            <Card key={f.id} className="overflow-hidden">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setExpanded(isOpen ? null : f.id!)}>
                {isOpen ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                <SeverityDot severity={f.severity} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200 truncate">{f.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    <span className="mono">{f.test_id}</span> · {cat?.label} · {f.model_name}
                  </div>
                </div>
                <span className="hidden sm:inline chip border-ink-700 bg-ink-800 text-slate-400 mono">{f.owasp_id}</span>
                <SeverityBadge severity={f.severity} />
              </button>

              {isOpen && (
                <div className="border-t border-ink-800 p-4 space-y-4 animate-fadeUp">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Prompt</div>
                      <pre className="whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/60 p-2.5 text-xs text-slate-300 mono max-h-40 overflow-y-auto">{f.prompt}</pre>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Model Response</div>
                      <pre className="whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/60 p-2.5 text-xs text-slate-300 mono max-h-40 overflow-y-auto">{f.response}</pre>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-amber-400/80 mb-1">Evidence</div>
                      <p className="text-xs text-slate-300">{f.evidence}</p>
                    </div>
                    <div className="rounded-md border border-cyber-500/20 bg-cyber-500/5 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-cyber-400/80 mb-1">Recommendation</div>
                      <p className="text-xs text-slate-300">{f.recommendation}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>OWASP</span>
                      <span className="mono text-cyber-400/80">{f.owasp_id}</span>
                      <span>·</span>
                      <span>{owasp?.name}</span>
                      <ExternalLink size={11} className="text-slate-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Status:</span>
                      <select
                        className="input py-1.5 text-xs w-36"
                        value={f.status}
                        onChange={(e) => handleStatus(f.id!, e.target.value as FindingStatus)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
