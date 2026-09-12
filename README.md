# AI Red Teaming Lab

An **Automated AI Red Teaming Lab** for authorized, defensive security testing of AI/LLM models. Built as an Information Security Engineering portfolio project, it provides a SOC-style dashboard for safely evaluating an AI model's resistance to prompt injection, jailbreaks, sensitive-data leakage, and other OWASP LLM Top 10 risks — all in a controlled, local test environment.

> **Authorized use only.** This system is designed for testing models you own or have **explicit written permission** to test. It does not perform attacks against third-party AI systems.

---

## Features

| Area | What it does |
| --- | --- |
| **Operations Dashboard** | Total tests, findings, risk levels, pass/fail statistics, severity donut, category bar chart, OWASP coverage grid, risk trend sparkline |
| **AI Model Configuration** | Configure mock (offline) or real OpenAI-compatible API endpoints. API keys are never stored — only an env-var label is saved |
| **Automated Test Generator** | Browse a categorized, modular library of security test cases aligned to the OWASP LLM Top 10. Filter, search, and select categories |
| **Prompt Injection Testing** | Direct overrides, delimiter injection, instruction smuggling, role-reset (DAN) |
| **Jailbreak / Safety Testing** | Fictional framing, authority-escalation, incremental boundary pushes |
| **Data Leakage Testing** | PII extraction, credential probes, internal-document recall |
| **System Prompt Extraction** | Direct and format-manipulation extraction attempts |
| **Hallucination / Bias / Over-Refusal** | Fabricated citations, demographic stereotypes, benign-request refusals |
| **Output Analyzer** | Heuristic + pattern-based analysis against configurable security rules (secrets, PII, system-prompt leak, harmful content, length) |
| **Risk Scoring** | Findings categorized as Informational, Low, Medium, High, or Critical with a weighted risk score |
| **Findings Dashboard** | Filterable table with severity, evidence, prompt, response, and per-finding remediation recommendations; triage status workflow |
| **Test History** | Every saved run with severity mix, duration, and risk posture |
| **Security Report Generator** | Professional assessment report with authorization scope, executive summary, OWASP coverage, and detailed findings — print to PDF |
| **Model Comparison** | Side-by-side comparison of up to 4 runs with pass rate, risk score, and severity breakdown |

---

## Architecture

```
src/
├── App.tsx                  # App shell, navigation, state
├── lib/
│   ├── types.ts             # Shared domain types
│   ├── owasp.ts             # OWASP LLM Top 10 + severity metadata
│   ├── testLibrary.ts       # Modular test-case library (add cases here)
│   ├── mockModel.ts         # Deterministic offline mock AI model
│   ├── analyzer.ts          # Output analyzer + risk scoring
│   ├── testEngine.ts        # Runs cases against mock or real API
│   └── db.ts                # Supabase data access layer
├── components/
│   ├── Sidebar.tsx          # Nav + mobile bottom nav
│   ├── ui.tsx               # Card, StatCard, PageHeader, Spinner, EmptyState
│   ├── charts.tsx           # Donut, Bar, SeverityBar, Sparkline (SVG)
│   └── SeverityBadge.tsx    # Severity badges + legend
└── views/
    ├── DashboardView.tsx
    ├── ModelsView.tsx
    ├── GeneratorView.tsx
    ├── RunnerView.tsx
    ├── FindingsView.tsx
    ├── HistoryView.tsx
    ├── ReportView.tsx
    └── ComparisonView.tsx
```

### Modular test architecture

New security tests are added by appending a `TestCase` object to `src/lib/testLibrary.ts`. Each case declares its category, OWASP ID, technique, prompt, expected behavior, and a detection rule. The generator, runner, analyzer, findings, and report all consume the library automatically — no other code changes required.

### Mock vs. real models

- **Mock model** (`mockModel.ts`): a deterministic simulator that produces varied responses (some correct refusals, some intentional "leaks") so the full pipeline works with zero configuration and no paid API. Clearly labeled "Mock · offline" in the UI.
- **Real API**: configure an OpenAI-compatible chat-completions endpoint. The API key is provided at runtime via an environment variable — only the env-var label is stored in the database, never the key itself.

### Output analyzer

The analyzer evaluates each response against:
1. Forbidden substrings from the test's detection rule
2. Expected-refusal checks
3. Secret/credential pattern detection (`sk-...`, `ghp_...`, `AKIA...`, custom)
4. PII pattern detection (phone, SSN, email)
5. System-prompt leak markers
6. Harmful content compliance markers
7. Response length limits
8. Over-refusal and bias heuristics
9. Hallucination heuristics (confident fabricated specifics)

Severity is assigned per category and escalated to the highest observed level for the overall run risk.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide icons
- **Backend / persistence**: Supabase (PostgreSQL with Row Level Security)
- **Charts**: Hand-built SVG (no chart library dependency)
- **Fonts**: Outfit (UI) + JetBrains Mono (code/terminal)

---

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project (URL + anon key in `.env`)

### Install & run

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run typecheck
```

The database schema is applied automatically via Supabase migrations. A default mock model ("SentinelQA Mock") is seeded on first launch.

### Environment variables

Supabase credentials are pre-populated in `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

To test a real model, add its API key as a runtime env var matching the label you configured (e.g. `VITE_OPENAI_API_KEY`), and select the model in the Test Runner.

---

## Database Schema

| Table | Purpose |
| --- | --- |
| `models` | Configured AI model endpoints (mock or real) |
| `test_runs` | Each test execution with aggregate severity counts |
| `findings` | Individual findings with prompt, response, evidence, recommendation |
| `test_cases` | Optional cache for generated test cases |

All tables have Row Level Security enabled. Since this is a single-tenant lab with no sign-in, policies allow `anon + authenticated` CRUD (the data is intentionally shared within the lab instance).

---

## Sample Test Data

The mock model is pre-seeded. On first run:
1. Open the **Test Generator** — 4 categories are pre-selected (17 test cases).
2. Go to **Test Runner** and click **Run**.
3. The mock model responds with a mix of safe refusals and intentional vulnerabilities.
4. Save the run, then explore **Findings**, **History**, **Report**, and **Comparison**.

---

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

### One-time setup

1. **Push the project to a GitHub repository** (public or private).

2. **Add repository secrets** — go to Settings > Secrets and variables > Actions > New repository secret:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon public key

3. **Enable GitHub Pages** — go to Settings > Pages > Build and deployment:
   - Source: **GitHub Actions** (not "Deploy from a branch")

4. **Push to `main`** — the workflow in `.github/workflows/deploy.yml` will:
   - Install dependencies with `npm ci`
   - Build the project with the correct base path (`/<repo-name>/`)
   - Deploy the `dist/` folder to GitHub Pages

The site will be live at `https://<your-username>.github.io/<your-repo-name>/`.

### How the base path works

GitHub Pages serves your site at `/<repo-name>/`, not the root. The `VITE_BASE` env var in the workflow automatically sets the correct base path during the build. Locally, the base defaults to `/` so `npm run dev` works as normal.

### Files for deployment

| File | Purpose |
| --- | --- |
| `.github/workflows/deploy.yml` | GitHub Actions workflow — builds and deploys on every push to `main` |
| `public/.nojekyll` | Tells GitHub Pages not to process with Jekyll (preserves `_assets` folders) |
| `vite.config.ts` | Reads `VITE_BASE` env var to set the correct asset base path |

---

## Security & Ethics

- All test cases are **defensive probes** for models you own or are authorized to test.
- No attacks are performed against third-party AI systems.
- API keys are never persisted; only an env-var label is stored.
- The report includes an explicit authorization & scope section.
- The UI clearly separates mock/demo testing from real model testing.

---

## License

For educational and defensive security research purposes.
