import { useMemo, useState } from 'react';
import { FlaskConical, ArrowRight, Search, Layers, CheckCircle2 } from 'lucide-react';
import { CATEGORY_META, OWASP_CATEGORIES } from '@/lib/owasp';
import { TEST_LIBRARY, getCasesByCategories } from '@/lib/testLibrary';
import type { TestCategory } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui';
import type { ViewId } from '@/components/Sidebar';

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as TestCategory[];

export function GeneratorView({
  selected,
  onSelect,
  onNavigate,
}: {
  selected: TestCategory[];
  onSelect: (cats: TestCategory[]) => void;
  onNavigate: (v: ViewId) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEST_LIBRARY;
    return TEST_LIBRARY.filter(
      (t) =>
        t.prompt.toLowerCase().includes(q) ||
        t.technique.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        CATEGORY_META[t.category].label.toLowerCase().includes(q),
    );
  }, [query]);

  const selectedSet = new Set(selected);
  const selectedCases = getCasesByCategories(selected);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    TEST_LIBRARY.forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + 1));
    return m;
  }, []);

  function toggle(cat: TestCategory) {
    onSelect(selectedSet.has(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]);
  }

  return (
    <div>
      <PageHeader
        title="Automated Test Generator"
        subtitle="Browse and select categorized AI security test cases aligned to the OWASP LLM Top 10. Selected cases drive the next test run."
        icon={<FlaskConical size={20} />}
        actions={
          <button className="btn-primary" onClick={() => onNavigate('runner')}>
            Go to Test Runner <ArrowRight size={15} />
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1 h-fit">
          <h3 className="text-sm font-semibold text-slate-200">Test Categories</h3>
          <p className="mt-1 text-xs text-slate-500">Toggle categories to include in the run. All are safe, authorized probes.</p>
          <div className="mt-4 space-y-2">
            {ALL_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const on = selectedSet.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggle(cat)}
                  className={`w-full rounded-lg border p-3 text-left transition-all ${on ? 'border-cyber-500/40 bg-cyber-500/8' : 'border-ink-800 bg-ink-900/40 hover:border-ink-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{meta.label}</span>
                    <span className={`chip ${on ? 'sev-info' : 'border-ink-700 bg-ink-800 text-slate-500'}`}>
                      {on ? <CheckCircle2 size={11} /> : <Layers size={11} />} {counts.get(cat) ?? 0}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-snug">{meta.description}</p>
                  <div className="mt-2 text-[10px] mono text-cyber-400/70">{meta.owaspId}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-ink-800 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Selected cases</span>
              <span className="font-semibold text-cyber-300 stat-num">{selectedCases.length}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost flex-1 text-xs" onClick={() => onSelect(ALL_CATEGORIES)}>Select all</button>
              <button className="btn-ghost flex-1 text-xs" onClick={() => onSelect([])}>Clear</button>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-200">Test Case Library</h3>
            <div className="relative w-56 max-w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-9 py-2 text-xs" placeholder="Search prompts, techniques, IDs..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map((t) => {
              const meta = CATEGORY_META[t.category];
              const owasp = OWASP_CATEGORIES.find((o) => o.id === t.owaspId);
              const on = selectedSet.has(t.category);
              return (
                <div key={t.id} className={`rounded-lg border p-3.5 transition-colors ${on ? 'border-cyber-500/20 bg-cyber-500/5' : 'border-ink-800 bg-ink-900/40'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[11px] text-cyber-400/80">{t.id}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs font-medium text-slate-300">{meta.label}</span>
                    </div>
                    <span className="chip border-ink-700 bg-ink-800 text-slate-400 mono">{t.owaspId}</span>
                  </div>
                  <div className="mt-2 rounded-md border border-ink-800 bg-ink-950/60 p-2.5 text-xs text-slate-300 mono leading-relaxed">
                    {t.prompt}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span><span className="text-slate-600">Technique:</span> {t.technique}</span>
                    <span><span className="text-slate-600">OWASP:</span> {owasp?.name}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    <span className="text-slate-600">Expected:</span> {t.expectedBehavior}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No test cases match "{query}".</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
