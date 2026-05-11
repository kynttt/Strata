# Enquiry Processor MVP

An AI-powered client enquiry processor for Strata Management Consultants. Built as a practical exam deliverable.

## What It Does

1. **Accepts a client enquiry** via a web dashboard text input.
2. **Classifies the enquiry** into one of five types: `new_client`, `support_request`, `complaint`, `general_question`, or `needs_clarification`.
3. **Returns a confidence score** (0.0–1.0) with a visual progress bar and reasoning explanation.
4. **Routes the enquiry** to the correct internal team with a priority level (low / medium / high).
5. **Generates a suggested response draft** and recommended action for the staff member.
6. **Flags low-confidence or vague enquiries** for human review and provides a ready-to-send clarification draft when the input is unclear.

## Architecture

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

Provider and model are selected dynamically from the dashboard UI and stored in `localStorage`.

## Tech Stack

- Next.js 15 (Pages Router)
- React + TypeScript
- Tailwind CSS + shadcn/ui components
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

Keys can also be entered directly in the dashboard UI at runtime.

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

## Prompt Engineering Design

### Structured JSON output constraints
Every skill prompt ends with the same strict output contract:

```
Return **only** a JSON object with this exact shape. No markdown, no explanation.
```

This reduces parsing failures. For Ollama (which is more prone to adding markdown or trailing commas), the skill runner uses a robust extractor that:
1. Strips markdown code fences.
2. Uses brace-matching to find the first valid JSON object.
3. Cleans trailing commas before parsing.

### Calibration instructions for confidence
The classify prompt includes explicit calibration:

```
- 0.9+ means you are very sure
- 0.7-0.9 means reasonably sure
- below 0.7 means uncertain
```

This grounds the model's confidence score so that the orchestrator threshold (0.7) is meaningful across different providers.

### Clarification draft generation
When the classifier returns `needs_clarification`, it also generates a `draft` field: a polite follow-up question the staff member can copy and send. This turns a vague enquiry into an actionable workflow step instead of just a red flag.

## Error Handling

### Vague or nonsensical input
- Classified as `needs_clarification`.
- Orchestrator skips routing and response generation.
- Dashboard shows a **Clarification Draft** card with a copy-to-clipboard button.

### Low-confidence input
- If confidence < 0.7, flagged as **Needs Human Review**.
- No automated routing or response is generated.

### Provider failures
- Custom `ProviderError` class with typed error codes (`timeout`, `network`, `auth`, `unknown`).
- **Timeout:** 10s for cloud providers, 60s for Ollama (local models are slower).
- **Network:** Clear messages when a provider is unreachable (e.g. Ollama not running).
- **Auth:** Distinguishes invalid API keys from rate limits.
- **Response errors:** If `generate-response` fails but classification succeeds, the dashboard shows the partial result plus a visible error banner.

## Automation Potential

The `/api/process` endpoint returns a stable JSON contract that acts as the integration boundary for larger workflows:

```json
{
  "classification": { "type": "new_client", "confidence": 0.92, "reasoning": "...", "draft": null },
  "routing": { "team": "Sales", "priority": "medium" },
  "response": { "draft": "Dear...", "recommended_action": "..." },
  "flags": { "needs_review": false, "reason": null },
  "draft": null
}
```

### Email system
- **Inbound:** A webhook adapter (`pages/api/webhooks/email.ts`) can receive forwarded emails, POST the body to `/api/process`, and store the result.
- **Outbound:** When `response.draft` exists and `flags.needs_review === false`, an outbox adapter queues the draft for send. If review is needed, it holds the email and notifies a staff member.

### CRM
- `classification.type === "new_client"` → create a `Lead` or `Opportunity`.
- `classification.type === "support_request"` → create a `Case` linked to an existing `Contact`.
- `routing.team` → assign owner by team.
- `response.draft` → log as an `Activity` on the record.
- `flags.needs_review` → set status to `"Pending Review"` instead of auto-assigning.

### Task queue / ticketing
- `routing` already decides team + priority. A ticket adapter can map this to Jira/Linear/Asana fields.
- If `needs_review === true`, ticket goes to a triage board.
- If `draft` exists (clarification needed), ticket includes a subtask: *"Send clarification email to client."*

### Persistence
Adding a `src/lib/persistence.ts` layer (e.g. Postgres or Supabase) to save every `ProcessResponse` would give an audit trail, enable dashboard history, and let downstream systems poll for new enquiries.

## Design Decisions

- **Next.js full-stack:** Single codebase for frontend and API. No separate backend deployment.
- **No database in MVP:** All state is ephemeral. Keeps the project zero-config and easy to run.
- **Skill markdown prompts:** Externalised so non-engineers can tune prompts without touching code.
- **Local-first AI option:** Ollama support means the system works entirely offline for demos or privacy-sensitive environments.
- **Conditional downstream skills:** Hard rules in the orchestrator prevent expensive LLM calls and bad outputs on uncertain inputs.
- **shadcn/ui + Tailwind CSS:** Provides accessible, themeable components with minimal custom CSS.
- **Zod + React Hook Form:** Type-safe configuration form with client-side validation before storage.

## Project Structure

```
pages/
  index.tsx          — Dashboard (input + results)
  configure.tsx      — AI provider configuration form
  api/
    process.ts       — Orchestrator API
    models.ts        — Fetch available models from provider
src/
  providers/         — OpenAI, Anthropic, Google, Ollama adapters
  skills/
    classify-enquiry/
    route-enquiry/
    generate-response/
  components/        — Cards, inputs, configuration UI
  lib/
    skill-runner.ts  — Reads skill.md + sends to AI + parses JSON
    skill-utils.ts   — File-system helpers (server-only)
    ai-config-schema.ts — Zod schema for config validation
```
