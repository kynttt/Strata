# Enquiry Processor MVP

An AI-powered client enquiry processor for Strata Management Consultants. Built as a practical exam deliverable.

## What It Does

1. **Accepts client enquiries** via a Chats/Emails interface at `/enquiries`.
2. **Classifies the enquiry** into one of five types: `new_client`, `support_request`, `complaint`, `general_question`, or `needs_clarification`.
3. **Returns a confidence score** (0.0–1.0) with a visual progress bar and reasoning explanation.
4. **Routes the enquiry** to the correct internal team with a priority level (low / medium / high).
5. **Generates a suggested response draft** and recommended action for the staff member.
6. **Flags low-confidence or vague enquiries** for human review and provides a ready-to-send clarification draft when the input is unclear.
7. **Persists state** in `localStorage` so team history, conversations, and email processing status survive refresh.

## Architecture

### Two-Step Pipeline

- **Step 1 — `/enquiries` (Chats/Emails):** Process an enquiry → runs `classify-enquiry` → `route-enquiry`. Saves to team history. No response generation here.
- **Step 2 — `/` (Dashboard):** Staff views routed enquiries by team tab. Clicks **Generate Response** to invoke `generate-response`. Edits if needed, then clicks **Send Response**. The sent reply appears back in the originating conversation thread.

### Hybrid Orchestrator

The API always classifies first. Code (not the AI) decides downstream execution based on two hard rules:
- **Confidence < 0.7** → skip routing and response generation; flag for human review.
- **Type === `needs_clarification`** → skip routing and response; surface a clarification draft instead.

This prevents wasting tokens on uncertain inputs and reduces the risk of bad automated responses.

### Skill-as-Markdown

Each AI task lives in its own `skill.md` file under `src/skills/{name}/`. The skill runner reads this at runtime and passes it as the system prompt. This means prompts can be tuned, versioned, and reviewed without touching TypeScript code.

Skills:
- `classify-enquiry` — categorises the enquiry and returns a confidence score.
- `route-enquiry` — maps classification to internal team + priority.
- `generate-response` — drafts a reply and recommended next step.

### Provider-Agnostic Adapter

Supports four providers via a shared `AIProvider` interface:
- **OpenAI** (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Google** (Gemini 1.5 Flash, Gemini 1.5 Pro)
- **Ollama** (llama3.2, llama3.1, mistral — runs locally, no API key)

Provider and model are selected dynamically from the Configure AI page and stored in `localStorage`.

## Tech Stack

- Next.js 15 (Pages Router)
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui components
- Framer Motion (animations)
- React Hook Form + Zod (configuration form validation)
- OpenAI / Anthropic / Google / Ollama SDKs

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional)

Copy `.env.example` to `.env` and add default API keys if you want them pre-filled.

```bash
cp .env.example .env
```

Keys can also be entered directly in the Configure AI page at runtime.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Configure your AI provider

Click **Configure AI** in the top right, choose your provider and model, and enter your API key (not needed for Ollama). Configuration is saved to `localStorage` in the browser.

### Using Ollama (Local)

1. Install Ollama: https://ollama.com
2. Pull a model: `ollama pull llama3.2`
3. Select **Ollama** in the configuration page with model `llama3.2`.

**Note:** Local models are significantly slower than cloud APIs. The timeout is set to 60 seconds for Ollama to allow for CPU-based generation.

## Pages

| Page | URL | Purpose |
|---|---|---|
| **Dashboard** | `/` | Team tabs (Sales, Technical Support, Complaints, General). Generate responses, edit, and send. |
| **Enquiries** | `/enquiries` | Chats tab (conversation threads) + Emails tab (Gmail-style inbox with batch processing). |
| **Configure AI** | `/configure` | Select provider, model, and API key. |

## Documentation

The exam requirements are covered in dedicated docs:

- [Confidence Scoring](docs/confidence-scoring.md) — How the 0–1.0 score works, calibration, thresholds, and UI display.
- [Prompt Engineering](docs/prompt-engineering.md) — Skill-as-markdown design, structured JSON output constraints, tone guardrails, and tuning workflow.
- [Error Handling](docs/error-handling.md) — Provider errors, vague input, low confidence, timeouts, partial failures, and UI error states.
- [Automation Potential](docs/automation-potential.md) — Email webhooks, CRM mapping, task queue integration, and batch processing.

## Design Decisions

- **Next.js full-stack:** Single codebase for frontend and API. No separate backend deployment.
- **No database in MVP:** All state is `localStorage`-based. Keeps the project zero-config and easy to run.
- **Skill markdown prompts:** Externalised so non-engineers can tune prompts without touching code.
- **Local-first AI option:** Ollama support means the system works entirely offline for demos or privacy-sensitive environments.
- **Conditional downstream skills:** Hard rules in the orchestrator prevent expensive LLM calls and bad outputs on uncertain inputs.
- **shadcn/ui + Tailwind CSS:** Provides accessible, themeable components with minimal custom CSS.
- **Zod + React Hook Form:** Type-safe configuration form with client-side validation before storage.
- **Two-step architecture:** Separates routing (automatic) from response generation (staff-reviewed), ensuring human oversight on client-facing communication.

## Project Structure

```
pages/
  index.tsx              — Dashboard (team tabs + response generation)
  enquiries.tsx          — Chats + Emails interface
  configure.tsx          — AI provider configuration form
  api/
    process.ts           — Orchestrator API (classify + route)
    generate-response.ts — Standalone response generation API
    process-batch.ts     — Batch enqueue endpoint
    job-status.ts        — Polling endpoint for batch jobs
src/
  providers/             — OpenAI, Anthropic, Google, Ollama adapters
  skills/
    classify-enquiry/
    route-enquiry/
    generate-response/
  components/              — UI components (Layout, TeamTabsPanel, ChatThread, etc.)
  lib/
    skill-runner.ts      — Reads skill.md + sends to AI + parses JSON
    process-enquiry.ts   — Orchestrator logic
    skill-utils.ts       — File-system helpers (server-only)
docs/
  confidence-scoring.md
  prompt-engineering.md
  error-handling.md
  automation-potential.md
```
