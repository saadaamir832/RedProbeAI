import type { AnalyzedResponse, ModelConfig, Severity, TestCase } from './types';
import { mockGenerate } from './mockModel';
import { analyzeResponse, computeOverallRisk } from './analyzer';

/*
 * Test Engine — orchestrates a run of test cases against a model.
 *
 * For mock models it calls the local mockModel simulator. For real API
 * endpoints it routes through the Supabase edge function proxy (ai-proxy)
 * to avoid browser CORS restrictions. The API key is provided at runtime
 * and never stored.
 */

export interface RunProgress {
  index: number;
  total: number;
  test: TestCase;
  status: 'pending' | 'running' | 'passed' | 'failed';
  analysis?: AnalyzedResponse;
}

export interface RunResult {
  findings: RunFinding[];
  passed: number;
  failed: number;
  severityCounts: Record<Severity, number>;
  overallRisk: Severity;
  durationMs: number;
}

export interface RunFinding {
  test: TestCase;
  response: string;
  analysis: AnalyzedResponse;
}

interface RunCallbacks {
  onProgress?: (progress: RunProgress) => void;
  signal?: AbortSignal;
  apiKey?: string;
}

export async function runTests(
  model: ModelConfig,
  tests: TestCase[],
  callbacks: RunCallbacks = {},
): Promise<RunResult> {
  const start = performance.now();
  const findings: RunFinding[] = [];
  const severityCounts: Record<Severity, number> = {
    Informational: 0,
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  };

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    if (callbacks.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const test = tests[i];

    callbacks.onProgress?.({ index: i, total: tests.length, test, status: 'running' });

    let responseText: string;
    try {
      responseText = await queryModel(model, test.prompt, callbacks.signal, callbacks.apiKey);
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      responseText = `[model error] ${(err as Error).message}`;
    }

    const analysis = analyzeResponse(test, responseText);
    findings.push({ test, response: responseText, analysis });

    if (analysis.passed) {
      passed += 1;
      callbacks.onProgress?.({ index: i, total: tests.length, test, status: 'passed', analysis });
    } else {
      failed += 1;
      severityCounts[analysis.severity] += 1;
      callbacks.onProgress?.({ index: i, total: tests.length, test, status: 'failed', analysis });
    }
  }

  severityCounts.Informational = passed;

  const durationMs = Math.round(performance.now() - start);
  const overallRisk = computeOverallRisk(findings.filter((f) => !f.analysis.passed).map((f) => f.analysis.severity));

  return { findings, passed, failed, severityCounts, overallRisk, durationMs };
}

async function queryModel(model: ModelConfig, prompt: string, signal?: AbortSignal, apiKey?: string): Promise<string> {
  if (model.isMock || model.provider === 'mock') {
    const res = await mockGenerate(prompt, model);
    return res.text;
  }

  if (!model.endpoint) {
    throw new Error('No endpoint configured for this model. Edit the model to add an endpoint URL.');
  }

  // For real models, route through the Supabase edge function proxy to
  // avoid browser CORS restrictions. The proxy forwards to the target API.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const proxyUrl = `${supabaseUrl}/functions/v1/ai-proxy`;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required for real model testing. Enter it in the runner before starting.');
  }

  const messages: { role: string; content: string }[] = [
    ...(model.systemPrompt ? [{ role: 'system', content: model.systemPrompt }] : []),
    { role: 'user', content: prompt },
  ];

  const proxyBody = {
    endpoint: model.endpoint,
    apiKey: apiKey.trim(),
    model: model.name,
    messages,
    temperature: model.temperature,
    provider: model.provider,
  };

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(proxyBody),
    signal,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const detail = (errData as { error?: string; detail?: string }).error || (errData as { detail?: string }).detail || `HTTP ${res.status}`;
    throw new Error(`AI proxy error: ${detail}`);
  }

  const data = await res.json();
  const content = (data as { content?: string }).content;
  if (!content) throw new Error('AI proxy returned an empty response');
  return content;
}
