import { useEffect, useState } from 'react';
import { Cpu, Plus, Trash2, Pencil, Server, FlaskConical, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { ModelConfig } from '@/lib/types';
import { deleteModel, fetchModels, saveModel } from '@/lib/db';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/ui';

const EMPTY: ModelConfig = {
  name: '',
  provider: 'mock',
  isMock: true,
  systemPrompt: '',
  temperature: 0.7,
  status: 'active',
  endpoint: '',
  apiKeyLabel: '',
};

export function ModelsView({ onNavigate }: { onNavigate: (v: 'runner' | 'models') => void }) {
  void onNavigate;
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setModels(await fetchModels());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) { setError('Model name is required'); return; }
    if (!editing.isMock && !editing.endpoint?.trim()) { setError('Endpoint URL is required for real models'); return; }
    setSaving(true); setError('');
    try {
      await saveModel(editing);
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this model and all of its test runs and findings? This cannot be undone.')) return;
    try {
      await deleteModel(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Model Configuration"
        subtitle="Configure local or authorized test models. Mock models run fully offline for demos; real endpoints require explicit authorization."
        icon={<Cpu size={20} />}
        actions={
          <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={16} /> New Model
          </button>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-20"><Spinner size={28} /></div>
      ) : models.length === 0 && !editing ? (
        <EmptyState
          icon={<Cpu size={26} />}
          title="No models configured"
          description="Add a mock model to run offline demos, or configure an authorized API endpoint to test a real model."
          action={<button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}><Plus size={16} /> Add first model</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {models.map((m) => (
            <Card key={m.id} className="p-5" hover>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ring-1 ${m.isMock ? 'bg-cyber-500/10 ring-cyber-500/30 text-cyber-400' : 'bg-signal-500/10 ring-signal-500/30 text-signal-500'}`}>
                    {m.isMock ? <FlaskConical size={18} /> : <Server size={18} />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{m.name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 mono">
                      {m.isMock ? 'Mock · offline' : `${m.provider} · live`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="rounded-md p-1.5 text-slate-500 hover:bg-ink-800 hover:text-slate-300" onClick={() => setEditing(m)} title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="rounded-md p-1.5 text-slate-500 hover:bg-red-500/15 hover:text-red-400" onClick={() => m.id && handleDelete(m.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <dl className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between"><dt className="text-slate-500">Provider</dt><dd className="text-slate-300">{m.provider}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Temperature</dt><dd className="text-slate-300 mono">{m.temperature}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="text-slate-300">{m.status}</dd></div>
                {m.endpoint && <div className="flex justify-between gap-2"><dt className="text-slate-500 shrink-0">Endpoint</dt><dd className="text-slate-400 truncate mono text-[10px]">{m.endpoint}</dd></div>}
              </dl>
              <div className="mt-4 flex items-center gap-2 border-t border-ink-800 pt-3">
                <span className={`chip ${m.isMock ? 'sev-info' : 'sev-high'}`}>
                  <ShieldCheck size={11} /> {m.isMock ? 'Demo safe' : 'Authorized only'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditing(null)}>
          <div className="panel w-full max-w-lg p-6 animate-fadeUp" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-100">{editing.id ? 'Edit Model' : 'New AI Model'}</h3>
            <p className="mt-1 text-sm text-slate-500">Define a target for authorized security testing.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="label">Model Name</label>
                <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. SentinelQA Mock" />
              </div>

              <div>
                <label className="label">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-all ${editing.isMock ? 'border-cyber-500/40 bg-cyber-500/10 text-cyber-300' : 'border-ink-700 bg-ink-900/50 text-slate-400 hover:border-ink-600'}`}
                    onClick={() => setEditing({ ...editing, isMock: true, provider: 'mock', endpoint: '' })}
                  >
                    <FlaskConical size={16} className="mb-1" />
                    <div className="font-medium">Mock (offline)</div>
                    <div className="text-[11px] opacity-80">Runs fully locally, no API key</div>
                  </button>
                  <button
                    className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-all ${!editing.isMock ? 'border-signal-500/40 bg-signal-500/10 text-signal-500' : 'border-ink-700 bg-ink-900/50 text-slate-400 hover:border-ink-600'}`}
                    onClick={() => setEditing({ ...editing, isMock: false, provider: 'openai' })}
                  >
                    <Server size={16} className="mb-1" />
                    <div className="font-medium">Real API endpoint</div>
                    <div className="text-[11px] opacity-80">Authorized models only</div>
                  </button>
                </div>
              </div>

              {!editing.isMock && (
                <>
                  <div>
                    <label className="label">Provider</label>
                    <select className="input" value={editing.provider} onChange={(e) => setEditing({ ...editing, provider: e.target.value as ModelConfig['provider'] })}>
                      <option value="openai">OpenAI-compatible</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Endpoint URL</label>
                    <input className="input mono text-xs" value={editing.endpoint ?? ''} onChange={(e) => setEditing({ ...editing, endpoint: e.target.value })} placeholder="https://api.example.com/v1/chat/completions" />
                  </div>
                  <div>
                    <label className="label">API Key Env Label (never stored)</label>
                    <input className="input mono text-xs" value={editing.apiKeyLabel ?? ''} onChange={(e) => setEditing({ ...editing, apiKeyLabel: e.target.value })} placeholder="e.g. OPENAI_API_KEY" />
                    <p className="mt-1 text-[11px] text-slate-500">Provide the key at runtime via env var. The database stores only the label name.</p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Temperature</label>
                  <input type="number" step="0.1" min="0" max="2" className="input mono" value={editing.temperature} onChange={(e) => setEditing({ ...editing, temperature: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as 'active' | 'inactive' })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">System Prompt (optional)</label>
                <textarea className="input mono text-xs h-20 resize-none" value={editing.systemPrompt} onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })} placeholder="You are a helpful assistant..." />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? <Spinner size={15} /> : <ShieldCheck size={15} />} Save Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
