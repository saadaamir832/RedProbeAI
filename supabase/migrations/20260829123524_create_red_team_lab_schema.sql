/*
# AI Red Teaming Lab — core schema

1. Purpose
   Stores AI model configurations, automated security test runs, and findings
   for an authorized defensive-security testing lab. Single-tenant: no sign-in,
   data is intentionally shared/public within the lab instance.

2. New Tables
   - `models`         : configured AI model endpoints (mock or real)
   - `test_runs`      : each execution of a test suite against a model
   - `findings`       : individual findings produced by a test run
   - `test_cases`     : library of generated security test cases (cache)

3. Columns
   models:
     id, name, provider, endpoint, is_mock, api_key_label, system_prompt,
     temperature, status, created_at, updated_at
   test_runs:
     id, model_id (fk), name, categories, total, passed, failed, informational,
     low, medium, high, critical, overall_risk, duration_ms, status, created_at
   findings:
     id, run_id (fk), model_id (fk), test_id, title, category, owasp_id,
     severity, status, prompt, response, evidence, recommendation, passed, created_at
   test_cases:
     id, category, test_id, prompt, expected_behavior, owasp_id, technique, created_at

4. Security
   - RLS enabled on every table.
   - Policies: anon + authenticated full CRUD (single-tenant shared lab data).
*/

CREATE TABLE IF NOT EXISTS models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL DEFAULT 'mock',
  endpoint text,
  is_mock boolean NOT NULL DEFAULT true,
  api_key_label text,
  system_prompt text DEFAULT '',
  temperature numeric DEFAULT 0.7,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_models" ON models;
CREATE POLICY "anon_select_models" ON models FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_models" ON models;
CREATE POLICY "anon_insert_models" ON models FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_models" ON models;
CREATE POLICY "anon_update_models" ON models FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_models" ON models;
CREATE POLICY "anon_delete_models" ON models FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled run',
  categories text[] NOT NULL DEFAULT '{}',
  total integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  informational integer NOT NULL DEFAULT 0,
  low integer NOT NULL DEFAULT 0,
  medium integer NOT NULL DEFAULT 0,
  high integer NOT NULL DEFAULT 0,
  critical integer NOT NULL DEFAULT 0,
  overall_risk text NOT NULL DEFAULT 'Informational',
  duration_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_runs" ON test_runs;
CREATE POLICY "anon_select_runs" ON test_runs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_runs" ON test_runs;
CREATE POLICY "anon_insert_runs" ON test_runs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_runs" ON test_runs;
CREATE POLICY "anon_update_runs" ON test_runs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_runs" ON test_runs;
CREATE POLICY "anon_delete_runs" ON test_runs FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  owasp_id text NOT NULL DEFAULT 'LLM01',
  severity text NOT NULL DEFAULT 'Informational',
  status text NOT NULL DEFAULT 'open',
  prompt text NOT NULL DEFAULT '',
  response text NOT NULL DEFAULT '',
  evidence text NOT NULL DEFAULT '',
  recommendation text NOT NULL DEFAULT '',
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_findings" ON findings;
CREATE POLICY "anon_select_findings" ON findings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_findings" ON findings;
CREATE POLICY "anon_insert_findings" ON findings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_findings" ON findings;
CREATE POLICY "anon_update_findings" ON findings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_findings" ON findings;
CREATE POLICY "anon_delete_findings" ON findings FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  test_id text NOT NULL,
  prompt text NOT NULL,
  expected_behavior text NOT NULL DEFAULT '',
  owasp_id text NOT NULL DEFAULT 'LLM01',
  technique text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cases" ON test_cases;
CREATE POLICY "anon_select_cases" ON test_cases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cases" ON test_cases;
CREATE POLICY "anon_insert_cases" ON test_cases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cases" ON test_cases;
CREATE POLICY "anon_delete_cases" ON test_cases FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_findings_run ON findings(run_id);
CREATE INDEX IF NOT EXISTS idx_findings_model ON findings(model_id);
CREATE INDEX IF NOT EXISTS idx_runs_model ON test_runs(model_id);
CREATE INDEX IF NOT EXISTS idx_cases_category ON test_cases(category);
