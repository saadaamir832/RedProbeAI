import { useEffect, useState } from 'react';
import { History, Trash2, Eye, AlertTriangle, Clock } from 'lucide-react';
import type { TestRun } from '@/lib/types';
import { fetchRuns } from '@/lib/db';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { SeverityBar } from '@/components/charts';
import { SeverityBadge, SeverityDot } from '@/components/SeverityBadge';
import type { ViewId } from '@/components/Sidebar';

export function HistoryView({ onNavigate, onViewRun }: { onNavigate: (v: ViewId) => void; onViewRun: (run: TestRun) => void }) {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRuns(await fetchRuns());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="grid place-items-center py-20"><Spinner size={28} /></div>;

  return (
    <div>
      <PageHeader
        title="Test History"
        subtitle="Every recorded test run with severity breakdown and risk posture."
        icon={<History size={20} />}
      />

      {runs.length === 0 ? (
        <EmptyState
          icon={<History size={26} />}
          title="No runs recorded"
          description="Completed test runs will appear here once you save them from the Test Runner."
          action={<button className="btn-primary" onClick={() => onNavigate('runner')}>Run a test</button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-medium">Run</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Categories</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Severity Mix</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Duration</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-ink-800/60 hover:bg-ink-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{r.name}</div>
                      <div className="text-[11px] text-slate-500 mono">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.model_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(r.categories ?? []).slice(0, 3).map((c) => (
                          <span key={c} className="chip border-ink-700 bg-ink-800 text-slate-400 text-[10px]">{c.split('-')[0]}</span>
                        ))}
                        {(r.categories ?? []).length > 3 && <span className="text-[10px] text-slate-500">+{r.categories.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="w-32">
                        <SeverityBar counts={{ Informational: r.informational, Low: r.low, Medium: r.medium, High: r.high, Critical: r.critical }} />
                      </div>
                      <div className="mt-1 flex gap-2 text-[10px] text-slate-500">
                        <span>{r.passed} pass</span><span>{r.failed} fail</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={r.overall_risk} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-400 mono">
                      <span className="inline-flex items-center gap-1"><Clock size={11} /> {(r.duration_ms / 1000).toFixed(1)}s</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-md p-1.5 text-slate-500 hover:bg-cyber-500/15 hover:text-cyber-400" onClick={() => onViewRun(r)} title="View report">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
