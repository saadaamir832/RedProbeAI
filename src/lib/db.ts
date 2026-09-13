import { createClient } from '@supabase/supabase-js';
import type { Finding, ModelConfig, TestRun } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const hasSupabaseConfig = Boolean(url && anonKey && url.trim() && anonKey.trim());

export const supabase = hasSupabaseConfig
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
    })
  : null;

const STORAGE_KEYS = {
  models: 'redprobeai.models',
  runs: 'redprobeai.runs',
  findings: 'redprobeai.findings',
} as const;

function makeId(prefix: string): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && 'randomUUID' in cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStore<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors and continue with in-memory fallback.
  }
}

function getLocalModels(): ModelConfig[] {
  return readStore<ModelConfig[]>(STORAGE_KEYS.models, []);
}

function saveLocalModels(models: ModelConfig[]): void {
  writeStore(STORAGE_KEYS.models, models);
}

function getLocalRuns(): TestRun[] {
  return readStore<TestRun[]>(STORAGE_KEYS.runs, []);
}

function saveLocalRuns(runs: TestRun[]): void {
  writeStore(STORAGE_KEYS.runs, runs);
}

function getLocalFindings(): Finding[] {
  return readStore<Finding[]>(STORAGE_KEYS.findings, []);
}

function saveLocalFindings(findings: Finding[]): void {
  writeStore(STORAGE_KEYS.findings, findings);
}

export async function fetchModels(): Promise<ModelConfig[]> {
  if (!supabase) {
    return [...getLocalModels()].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  }

  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToModel);
}

export async function saveModel(model: ModelConfig): Promise<ModelConfig> {
  if (!supabase) {
    const models = getLocalModels();
    const now = new Date().toISOString();
    const record: ModelConfig = {
      ...model,
      id: model.id ?? makeId('model'),
      created_at: model.created_at ?? now,
      updated_at: now,
    };

    const nextModels = model.id
      ? models.map((m) => (m.id === model.id ? { ...m, ...record } : m))
      : [record, ...models];

    saveLocalModels(nextModels);
    return record;
  }

  const row = {
    name: model.name,
    provider: model.provider,
    endpoint: model.endpoint ?? null,
    is_mock: model.isMock,
    api_key_label: model.apiKeyLabel ?? null,
    system_prompt: model.systemPrompt,
    temperature: model.temperature,
    status: model.status,
    updated_at: new Date().toISOString(),
  };
  if (model.id) {
    const { data, error } = await supabase.from('models').update(row).eq('id', model.id).select().single();
    if (error) throw error;
    return rowToModel(data);
  }
  const { data, error } = await supabase.from('models').insert(row).select().single();
  if (error) throw error;
  return rowToModel(data);
}

export async function deleteModel(id: string): Promise<void> {
  if (!supabase) {
    const models = getLocalModels().filter((m) => m.id !== id);
    saveLocalModels(models);
    const runs = getLocalRuns().map((run) => ({ ...run, model_id: run.model_id === id ? undefined : run.model_id }));
    saveLocalRuns(runs);
    const findings = getLocalFindings().map((finding) => ({ ...finding, model_id: finding.model_id === id ? undefined : finding.model_id }));
    saveLocalFindings(findings);
    return;
  }

  const { error } = await supabase.from('models').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRuns(): Promise<TestRun[]> {
  if (!supabase) {
    return [...getLocalRuns()].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
  }

  const { data, error } = await supabase
    .from('test_runs')
    .select('*, models(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    model_id: r.model_id,
    model_name: (r.models as { name: string } | null)?.name ?? 'Unknown',
    name: r.name,
    categories: r.categories ?? [],
    total: r.total,
    passed: r.passed,
    failed: r.failed,
    informational: r.informational,
    low: r.low,
    medium: r.medium,
    high: r.high,
    critical: r.critical,
    overall_risk: r.overall_risk,
    duration_ms: r.duration_ms,
    status: r.status,
    created_at: r.created_at,
  }));
}

export async function fetchRun(id: string): Promise<TestRun | null> {
  if (!supabase) {
    const run = getLocalRuns().find((item) => item.id === id) ?? null;
    if (!run) return null;
    const model = getLocalModels().find((m) => m.id === run.model_id);
    return { ...run, model_name: model?.name ?? 'Unknown' };
  }

  const { data, error } = await supabase
    .from('test_runs')
    .select('*, models(name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    model_id: data.model_id,
    model_name: (data.models as { name: string } | null)?.name ?? 'Unknown',
    name: data.name,
    categories: data.categories ?? [],
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    informational: data.informational,
    low: data.low,
    medium: data.medium,
    high: data.high,
    critical: data.critical,
    overall_risk: data.overall_risk,
    duration_ms: data.duration_ms,
    status: data.status,
    created_at: data.created_at,
  };
}

export async function saveRun(run: TestRun, findings: Finding[]): Promise<TestRun> {
  if (!supabase) {
    const runs = getLocalRuns();
    const now = new Date().toISOString();
    const nextRun: TestRun = {
      ...run,
      id: run.id ?? makeId('run'),
      created_at: run.created_at ?? now,
    };

    const nextRuns = run.id ? runs.map((item) => (item.id === run.id ? nextRun : item)) : [nextRun, ...runs];
    saveLocalRuns(nextRuns);

    const storedFindings = getLocalFindings();
    const nextFindings = findings.map((finding) => ({
      ...finding,
      id: finding.id ?? makeId('finding'),
      run_id: finding.run_id ?? nextRun.id,
      model_id: finding.model_id ?? run.model_id,
      created_at: finding.created_at ?? now,
    }));
    saveLocalFindings([...storedFindings.filter((f) => f.run_id !== nextRun.id), ...nextFindings]);

    return nextRun;
  }

  const row = {
    model_id: run.model_id ?? null,
    name: run.name,
    categories: run.categories,
    total: run.total,
    passed: run.passed,
    failed: run.failed,
    informational: run.informational,
    low: run.low,
    medium: run.medium,
    high: run.high,
    critical: run.critical,
    overall_risk: run.overall_risk,
    duration_ms: run.duration_ms,
    status: run.status,
  };
  const { data, error } = await supabase.from('test_runs').insert(row).select().single();
  if (error) throw error;
  const runId = data.id as string;

  if (findings.length) {
    const findingRows = findings.map((f) => ({
      run_id: runId,
      model_id: run.model_id ?? null,
      test_id: f.test_id,
      title: f.title,
      category: f.category,
      owasp_id: f.owasp_id,
      severity: f.severity,
      status: f.status,
      prompt: f.prompt,
      response: f.response,
      evidence: f.evidence,
      recommendation: f.recommendation,
      passed: f.passed,
    }));
    const { error: fErr } = await supabase.from('findings').insert(findingRows);
    if (fErr) throw fErr;
  }

  return { ...run, id: runId, created_at: data.created_at };
}

export async function fetchFindingsByRun(runId: string): Promise<Finding[]> {
  if (!supabase) {
    return getLocalFindings().filter((finding) => finding.run_id === runId).sort((a, b) => {
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return aTime - bTime;
    });
  }

  const { data, error } = await supabase
    .from('findings')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Finding[];
}

export async function fetchAllFindings(): Promise<(Finding & { model_name?: string })[]> {
  if (!supabase) {
    const models = getLocalModels();
    return getLocalFindings()
      .slice()
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 500)
      .map((finding) => ({
        ...finding,
        model_name: models.find((model) => model.id === finding.model_id)?.name ?? 'Unknown',
      }));
  }

  const { data, error } = await supabase
    .from('findings')
    .select('*, models(name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((f) => ({
    ...f,
    model_name: (f.models as { name: string } | null)?.name ?? 'Unknown',
  }));
}

export async function updateFindingStatus(id: string, status: Finding['status']): Promise<void> {
  if (!supabase) {
    const findings = getLocalFindings().map((finding) => (finding.id === id ? { ...finding, status } : finding));
    saveLocalFindings(findings);
    return;
  }

  const { error } = await supabase.from('findings').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function fetchRunStats(): Promise<{ totalRuns: number; totalFindings: number; totalModels: number }> {
  if (!supabase) {
    const runs = getLocalRuns();
    const findings = getLocalFindings();
    const models = getLocalModels();
    return {
      totalRuns: runs.length,
      totalFindings: findings.length,
      totalModels: models.length,
    };
  }

  const [runs, findings, models] = await Promise.all([
    supabase.from('test_runs').select('id', { count: 'exact', head: true }),
    supabase.from('findings').select('id', { count: 'exact', head: true }),
    supabase.from('models').select('id', { count: 'exact', head: true }),
  ]);
  return {
    totalRuns: runs.count ?? 0,
    totalFindings: findings.count ?? 0,
    totalModels: models.count ?? 0,
  };
}

function rowToModel(r: Record<string, unknown>): ModelConfig {
  return {
    id: r.id as string,
    name: r.name as string,
    provider: (r.provider as ModelConfig['provider']) ?? 'mock',
    endpoint: (r.endpoint as string) ?? undefined,
    isMock: r.is_mock as boolean,
    apiKeyLabel: (r.api_key_label as string) ?? undefined,
    systemPrompt: (r.system_prompt as string) ?? '',
    temperature: Number(r.temperature ?? 0.7),
    status: (r.status as 'active' | 'inactive') ?? 'active',
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export async function seedDefaultMockModel(): Promise<ModelConfig | null> {
  if (!supabase) {
    const models = getLocalModels();
    if (models.some((model) => model.isMock)) return null;
    return saveModel({
      name: 'SentinelQA Mock',
      provider: 'mock',
      isMock: true,
      systemPrompt: '',
      temperature: 0.7,
      status: 'active',
    });
  }

  const { data } = await supabase.from('models').select('id').limit(1);
  if (data && data.length > 0) return null;
  return saveModel({
    name: 'SentinelQA Mock',
    provider: 'mock',
    isMock: true,
    systemPrompt: '',
    temperature: 0.7,
    status: 'active',
  });
}
