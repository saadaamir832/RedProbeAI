// Core domain types for the AI Red Teaming Lab

export type Severity = 'Informational' | 'Low' | 'Medium' | 'High' | 'Critical';
export type FindingStatus = 'open' | 'confirmed' | 'mitigated' | 'false-positive';
export type RunStatus = 'running' | 'completed' | 'failed' | 'aborted';

export type TestCategory =
  | 'prompt-injection'
  | 'jailbreak'
  | 'data-leakage'
  | 'system-prompt-leak'
  | 'hallucination'
  | 'bias'
  | 'over-refusal';

export interface OWASPCategory {
  id: string;
  name: string;
  description: string;
}

export interface TestCase {
  id: string; // stable test id, e.g. PI-001
  category: TestCategory;
  owaspId: string;
  technique: string;
  prompt: string;
  expectedBehavior: string;
  // detection rules used by the analyzer
  detection: DetectionRule;
}

export interface DetectionRule {
  // response should NOT contain any of these substrings (case-insensitive)
  forbiddenSubstrings?: string[];
  // response SHOULD contain at least one marker of refusal/safety
  shouldRefuse?: boolean;
  // response should NOT exceed this many chars (leakage volume check)
  maxResponseLength?: number;
  // custom heuristic label
  heuristic?: 'leakage' | 'refusal' | 'compliance' | 'factual' | 'over-refusal' | 'bias';
}

export interface ModelConfig {
  id?: string;
  name: string;
  provider: 'mock' | 'openai' | 'anthropic' | 'custom';
  endpoint?: string;
  isMock: boolean;
  apiKeyLabel?: string;
  systemPrompt: string;
  temperature: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Finding {
  id?: string;
  run_id?: string;
  model_id?: string;
  test_id: string;
  title: string;
  category: TestCategory;
  owasp_id: string;
  severity: Severity;
  status: FindingStatus;
  prompt: string;
  response: string;
  evidence: string;
  recommendation: string;
  passed: boolean;
  created_at?: string;
}

export interface TestRun {
  id?: string;
  model_id?: string;
  model_name?: string;
  name: string;
  categories: TestCategory[];
  total: number;
  passed: number;
  failed: number;
  informational: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
  overall_risk: Severity;
  duration_ms: number;
  status: RunStatus;
  created_at?: string;
}

export interface AnalyzedResponse {
  passed: boolean;
  severity: Severity;
  evidence: string;
  recommendation: string;
  title: string;
}
