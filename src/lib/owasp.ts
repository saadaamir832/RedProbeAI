import type { OWASPCategory, Severity, TestCategory } from './types';

export const OWASP_CATEGORIES: OWASPCategory[] = [
  { id: 'LLM01', name: 'Prompt Injection', description: 'Crafted inputs alter model behavior, bypassing intended instructions or guardrails.' },
  { id: 'LLM02', name: 'Insecure Output Handling', description: 'Model output is consumed downstream without sanitization, enabling XSS or code execution.' },
  { id: 'LLM03', name: 'Training Data Poisoning', description: 'Tampered training data manipulates model behavior or introduces backdoors.' },
  { id: 'LLM04', name: 'Model DoS', description: 'Resource-exhaustion inputs degrade or crash the model service.' },
  { id: 'LLM05', name: 'Supply Chain Vulnerabilities', description: 'Compromised components, datasets, or plugins introduce risk into the model pipeline.' },
  { id: 'LLM06', name: 'Sensitive Information Disclosure', description: 'The model reveals private, proprietary, or personally identifiable data.' },
  { id: 'LLM07', name: 'Insecure Plugin Design', description: 'Plugins execute with broad access and process untrusted input without validation.' },
  { id: 'LLM08', name: 'Excessive Agency', description: 'The model is granted capabilities (file, network, code) beyond its required task scope.' },
  { id: 'LLM09', name: 'Overreliance', description: 'Systems or users trust model output without independent verification, propagating errors.' },
  { id: 'LLM10', name: 'Model Theft', description: 'Exfiltration of model weights or proprietary parameters via queries or side channels.' },
];

export const CATEGORY_META: Record<
  TestCategory,
  { label: string; owaspId: string; description: string; icon: string }
> = {
  'prompt-injection': {
    label: 'Prompt Injection',
    owaspId: 'LLM01',
    description: 'Tests whether crafted inputs can override the model\'s original instructions or system prompt.',
    icon: 'syringe',
  },
  jailbreak: {
    label: 'Jailbreak / Safety Bypass',
    owaspId: 'LLM01',
    description: 'Probes the model\'s safety boundaries in a controlled, authorized environment.',
    icon: 'unlock',
  },
  'data-leakage': {
    label: 'Sensitive Data Leakage',
    owaspId: 'LLM06',
    description: 'Identifies potential unintended disclosure of sensitive or private information.',
    icon: 'database',
  },
  'system-prompt-leak': {
    label: 'System Prompt Extraction',
    owaspId: 'LLM06',
    description: 'Attempts to recover the hidden system prompt that governs model behavior.',
    icon: 'file-code',
  },
  hallucination: {
    label: 'Hallucination / Factual Integrity',
    owaspId: 'LLM09',
    description: 'Checks whether the model fabricates facts, citations, or confident false claims.',
    icon: 'ghost',
  },
  bias: {
    label: 'Bias & Fairness',
    owaspId: 'LLM09',
    description: 'Evaluates whether responses contain discriminatory or biased outputs.',
    icon: 'scale',
  },
  'over-refusal': {
    label: 'Over-Refusal / Benign Refusal',
    owaspId: 'LLM09',
    description: 'Detects excessive refusals on benign requests that degrade legitimate utility.',
    icon: 'shield-x',
  },
};

export const SEVERITY_ORDER: Severity[] = ['Informational', 'Low', 'Medium', 'High', 'Critical'];

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; chip: string; score: number; description: string }
> = {
  Informational: {
    label: 'Informational',
    color: '#38bdf8',
    chip: 'sev-info',
    score: 1,
    description: 'No direct risk; useful context for hardening posture.',
  },
  Low: {
    label: 'Low',
    color: '#facc15',
    chip: 'sev-low',
    score: 3,
    description: 'Minor issue with limited exploitability or impact.',
  },
  Medium: {
    label: 'Medium',
    color: '#fbbf24',
    chip: 'sev-medium',
    score: 5,
    description: 'Moderate risk; could be chained or exploited in specific contexts.',
  },
  High: {
    label: 'High',
    color: '#fb923c',
    chip: 'sev-high',
    score: 8,
    description: 'Significant risk with realistic exploitation path.',
  },
  Critical: {
    label: 'Critical',
    color: '#f87171',
    chip: 'sev-critical',
    score: 10,
    description: 'Severe risk; immediate remediation required.',
  },
};
