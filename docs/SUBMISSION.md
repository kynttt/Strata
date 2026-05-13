# Strata Enquiry Processor — Comprehensive Documentation

This document answers the five core requirements of the practical exam in one place. It is designed to be read by an examiner or stakeholder who wants to understand **how** the system works and **why** it was built this way.

---

## Table of Contents

1. [Setup & Running the Project](#1-setup--running-the-project)
2. [Confidence Scoring](#2-confidence-scoring)
3. [Prompt Engineering](#3-prompt-engineering)
4. [Error Handling](#4-error-handling)
5. [Automation Potential](#5-automation-potential)
6. [Design Decisions Summary](#6-design-decisions-summary)

---

## 1. Setup & Running the Project

### Prerequisites

- Node.js 18+ and npm
- (Optional) An API key from OpenAI, Anthropic, or Google
- (Optional) Ollama installed locally for offline demo mode

### Installation

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Add default API keys
cp .env.example .env
# Edit .env and paste your keys

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First-Time Configuration

1. Click **Configure AI** in the top navigation.
2. Select a provider (OpenAI, Anthropic, Google, or Ollama).
3. Choose a model and enter your API key (not needed for Ollama).
4. Click **Save**. Configuration is stored in `localStorage` and persists across sessions.

### Using Ollama (Local / Offline)

1. Install [Ollama](https://ollama.com)
2. Pull a model: `ollama pull llama3.2`
3. In the Configure AI page, select **Ollama** and model `llama3.2`.
4. Leave the API key blank.

**Note:** Local models are slower. The timeout is set to 60 seconds for Ollama vs. 10 seconds for cloud providers.

### Project Structure

```
pages/
  index.tsx              — Dashboard: team tabs + response generation + send
  enquiries.tsx          — Chats (conversation threads) + Emails (Gmail-style inbox)
  configure.tsx          — AI provider settings
  api/
    process.ts           — Orchestrator: classify + route
    generate-response.ts — Standalone response generation
    process-batch.ts     — Batch job enqueue
    job-status.ts        — Batch job polling

src/
  skills/
    classify-enquiry/      — skill.md + index.ts
    route-enquiry/         — skill.md + index.ts
    generate-response/     — skill.md + index.ts
  providers/             — OpenAI, Anthropic, Google, Ollama adapters
  components/            — Layout, TeamTabsPanel, ChatThread, GmailInbox, etc.
  lib/
    skill-runner.ts      — Reads skill.md → sends to AI → parses JSON
    process-enquiry.ts   — Orchestrator logic with confidence threshold
```

---

## 2. Confidence Scoring

### What It Is

Every enquiry that enters the system receives a **confidence score** from the AI classifier — a float between `0.0` and `1.0`. This score represents how certain the model is about its classification, and it is the single most important signal for deciding whether to automate the next steps or escalate to a human.

### How It Is Calibrated

The `classify-enquiry` skill explicitly anchors the model's interpretation of confidence:

```markdown
- `confidence` must be a float between 0.0 and 1.0.
- 0.9+ means you are very sure
- 0.7-0.9 means reasonably sure
- below 0.7 means uncertain
```

This calibration is critical because **different models interpret "confidence" differently**. GPT-4o might give 0.95 for an obvious case, while a local llama3.2 might give 0.85 for the same input. By telling the model exactly what each band means, the 0.7 threshold becomes meaningful across all four supported providers.

### The 0.7 Threshold (Orchestrator Rule)

In `src/lib/process-enquiry.ts`:

```typescript
const classification = classifyRes.data;
const needsReview =
  classification.confidence < 0.7 || classification.type === "needs_clarification";
```

| Confidence | Orchestrator Action | User Sees |
|---|---|---|
| `>= 0.7` | Proceed to `route-enquiry` + `generate-response` | Routing badge + Generate Response button |
| `< 0.7` | Skip downstream skills; flag for human review | "Needs Review" badge + reason displayed |

**Why 0.7?**
- It catches genuinely ambiguous input without being so strict that normal enquiries constantly escalate.
- The prompt calibration explicitly tells the model "below 0.7 means uncertain," so the boundary is respected.
- It prevents wasted tokens: if confidence is low, the orchestrator skips expensive routing and response generation calls entirely.

### Where It Appears in the UI

1. **Dashboard row** (`EnquiryRow`) — a small green progress bar + percentage badge
2. **Enquiry detail card** (`EnquiryEntryCard`) — an animated confidence bar with numeric readout
3. **Conversation header** (`/enquiries` page) — inline text: `new client · Sales · high · 92% confidence`
4. **Email drawer** (`EnquiryDrawer`) — large animated bar with percentage inside the bar

### Example Flow

**Input:** "I want to book a consultation about strata management."

```json
{
  "type": "new_client",
  "confidence": 0.94,
  "reasoning": "The user explicitly asks about booking a consultation, which signals a new-client intent."
}
```

→ Confidence 0.94 ≥ 0.7 → proceeds to routing → Sales team, medium priority → response generated.

**Input:** "help"

```json
{
  "type": "needs_clarification",
  "confidence": 0.42,
  "reasoning": "The message is too vague to determine intent.",
  "draft": "Thank you for reaching out. Could you let us know what you need help with?"
}
```

→ Confidence 0.42 < 0.7 → flagged for review → clarification draft surfaced in UI.

---

## 3. Prompt Engineering

### Philosophy: Skills as Markdown

Prompts are **first-class code artifacts**, not inline strings buried in TypeScript. Each AI task lives in its own `skill.md` file:

```
src/skills/classify-enquiry/
  skill.md   — system prompt, instructions, output constraints
  index.ts   — thin runner wrapper
```

**Why this matters:**
- Non-engineers can tune prompts without touching code.
- Prompts are versioned in git alongside the code.
- Each skill has a single, well-defined responsibility.
- The skill runner reads the markdown at runtime and passes it as the `systemPrompt` to the AI provider.

### The Three Skills

#### 1. `classify-enquiry`

**Responsibility:** Categorise the enquiry into exactly one of five types and return a calibrated confidence score.

**Key constraints in the prompt:**
- Five categories: `new_client`, `support_request`, `complaint`, `general_question`, `needs_clarification`
- `confidence` must be 0.0–1.0 with explicit calibration bands
- `reasoning` must be one concise sentence explaining the choice
- `draft` is `null` except for `needs_clarification`, where it becomes a polite follow-up question

**Output format enforced:**
```json
{
  "type": "new_client",
  "confidence": 0.92,
  "reasoning": "The user asks about pricing and wants to book a consultation.",
  "draft": null
}
```

#### 2. `route-enquiry`

**Responsibility:** Map the classification to an internal team and priority level.

**Key constraints:**
- Hard-coded mapping in the prompt (not learned from examples):
  - `new_client` → Sales
  - `support_request` → Technical Support
  - `complaint` → Complaints
  - `general_question` / `needs_clarification` → General
- Priority rules embedded:
  - `complaint` → high
  - `support_request` with "urgent/down/broken/critical" → high
  - `new_client` → medium
  - `general_question` → low
- Team must be one of: Sales, Technical Support, Complaints, General
- Priority must be one of: low, medium, high

**Output format:**
```json
{
  "team": "Sales",
  "priority": "medium"
}
```

#### 3. `generate-response`

**Responsibility:** Draft a professional, empathetic response and a recommended action for the staff member.

**Tone guardrails (recently added based on user feedback):**
- Professional, empathetic, concise
- No false promises (exact timelines, refunds)
- **No em-dashes (—)** — use commas or separate sentences for a natural human voice
- **Fixed sign-off:** `Warm regards, Strata Team` — never `[Your Name]`
- Complaints: acknowledge frustration, apologise sincerely, offer next steps
- New clients: enthusiastic, outline clear next steps

**Output format:**
```json
{
  "draft": "Dear Sarah, thank you for reaching out...",
  "recommended_action": "Follow up within 24 hours with a detailed quote."
}
```

### Structured JSON Output Handling

Every skill ends with:
```markdown
Return **only** a JSON object with this exact shape. No markdown, no explanation.
```

However, models (especially local ones) sometimes add markdown fences or trailing commas. The skill runner (`src/lib/skill-runner.ts`) has a robust parser:

1. **Strips code fences** — removes ` ```json ... ``` ` wrappers
2. **Brace-matching extraction** — finds the first valid `{ ... }` or `[ ... ]` block
3. **Trailing comma cleanup** — removes `, }` and `, ]` patterns
4. **Falls back to full-string parse** if brace-matching fails

This normalises output across all providers, so the orchestrator always receives clean structured data.

### Provider Behaviour Comparison

| Provider | Model | JSON Reliability | Tone Adherence |
|---|---|---|---|
| OpenAI | GPT-4o | Excellent | Good |
| Anthropic | Claude 3.5 Sonnet | Excellent | Excellent (best at empathy) |
| Google | Gemini 1.5 Flash | Good | Good |
| Ollama | llama3.2 | Fair | Fair |

The prompt calibration and robust JSON parser ensure consistent behaviour regardless of provider.

---

## 4. Error Handling

### Philosophy

Errors are **visible to the user** and **structured for code**. The system never silently fails. Every failure path produces a clear message in the UI and a typed error in the API response.

### Typed Provider Errors

A custom `ProviderError` class wraps all AI provider failures:

```typescript
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "timeout" | "auth" | "network" | "unknown"
  ) { ... }
}
```

| Code | Cause | Timeout | User Message |
|---|---|---|---|
| `timeout` | Request exceeded limit | 10s (cloud), 60s (Ollama) | "Request timed out. Try again or switch provider." |
| `auth` | Invalid API key / rate limit | — | "Authentication failed. Check your API key." |
| `network` | Provider unreachable | — | "Provider unavailable. Check settings or try Ollama." |
| `unknown` | Unexpected failure | — | "Something went wrong. Please try again." |

### Input-Level Errors

#### Vague or Nonsensical Input

**Example input:** "help" or "??"

**Flow:**
1. `classify-enquiry` returns `type: "needs_clarification"`, low confidence
2. Orchestrator sets `needs_review: true`
3. **Routing and response generation are skipped** (saving tokens)
4. Dashboard shows a **Clarification Draft** card — a pre-written polite follow-up question the staff member can copy and send

This turns a bad input into an **actionable workflow step** rather than a dead end.

#### Low-Confidence Input

**Example input:** "I have a question about something."

**Flow:**
1. `classify-enquiry` returns a type + confidence 0.55
2. Orchestrator sets `needs_review: true`, reason: "Low confidence classification"
3. Routing and response generation are skipped
4. Dashboard shows **Needs Human Review** badge
5. Staff can manually route or request clarification

### Partial Failures

Sometimes classification succeeds but a downstream skill fails (provider hiccup, timeout, etc.):

**Flow:**
1. `classify-enquiry` succeeds
2. `route-enquiry` or `generate-response` fails
3. Orchestrator returns the **successful classification** plus a `routingError` or `responseError` field
4. Dashboard shows the partial result plus a visible error banner

This prevents one failing skill from hiding the successful results of another.

### Request Validation

The `/api/process` endpoint validates every request:

| Violation | Response |
|---|---|
| Missing `enquiry` | `400 Bad Request` — "Missing required fields" |
| Missing `providerType` or `model` | `400 Bad Request` — "Missing required fields" |
| Invalid `providerType` | `400 Bad Request` — "Invalid providerType" |
| Malformed JSON body | `400 Bad Request` — "Invalid request body" |

### UI Error States

Errors are surfaced at multiple levels:

| Level | Component | Visual |
|---|---|---|
| Config | `Layout` banner | "Configuration Required" with link to Configure AI |
| Row | `EnquiryRow` / `GmailInbox` | Red "Error" badge |
| Detail | `EnquiryEntryCard` / `EnquiryDrawer` | Red error card with icon + message |
| Chat | `ChatThread` | Red team message bubble with error text |

### Recovery Paths

| Scenario | User Action |
|---|---|
| Provider timeout | Retry, or switch provider in Configure AI |
| Low confidence | Click into enquiry → manually route or edit |
| Needs clarification | Copy the pre-generated draft → send to client |
| Routing failed | Classification is still visible → manually assign team |
| Response failed | Classification + routing visible → write manual response |

---

## 5. Automation Potential

### Stateless API Design

The `/api/process` and `/api/generate-response` endpoints are **stateless** — they require no sessions, cookies, or database. Any system that can make an HTTP POST can integrate.

### API Contracts

#### `POST /api/process`

**Request:**
```json
{
  "enquiry": "I want a quote for strata management.",
  "providerType": "openai",
  "model": "gpt-4o",
  "apiKey": "sk-...",
  "sender": "John Smith",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "classification": {
    "type": "new_client",
    "confidence": 0.94,
    "reasoning": "The user asks about pricing and wants a quote."
  },
  "routing": {
    "team": "Sales",
    "priority": "medium"
  },
  "flags": {
    "needs_review": false,
    "reason": null
  },
  "error": null,
  "routingError": null
}
```

#### `POST /api/generate-response`

**Request:**
```json
{
  "enquiry": "I want a quote for strata management.",
  "classification": "new_client",
  "providerType": "openai",
  "model": "gpt-4o",
  "apiKey": "sk-..."
}
```

**Response:**
```json
{
  "response": {
    "draft": "Dear John, thank you for your interest...",
    "recommended_action": "Follow up within 24 hours with a detailed quote."
  }
}
```

### Integration Scenarios

#### Email System

**Inbound webhook:**
A `pages/api/webhooks/email.ts` endpoint could receive forwarded emails (via Zapier, Make, or mail server rules), POST the body to `/api/process`, and store the result.

```typescript
// Pseudo-code
export default async function handler(req, res) {
  const { from, subject, body } = req.body;
  const result = await fetch("http://localhost:3000/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      enquiry: body,
      providerType: "openai",
      model: "gpt-4o",
      sender: from,
    }),
  });
  const data = await result.json();
  // Store in DB, create ticket, etc.
}
```

**Outbound send queue:**
When `generate-response` succeeds and `flags.needs_review === false`, an outbox adapter can queue the draft for sending via SendGrid / AWS SES / Microsoft Graph. If review is needed, the email is held and a staff member is notified.

#### CRM Integration

The classification and routing data maps cleanly to CRM objects:

| Field | CRM Action |
|---|---|
| `classification.type === "new_client"` | Create a `Lead` or `Opportunity` |
| `classification.type === "support_request"` | Create a `Case` linked to existing `Contact` |
| `routing.team` | Assign owner by team |
| `response.draft` | Log as an `Activity` or `Note` on the record |
| `flags.needs_review === true` | Set status to `"Pending Review"` |
| `classification.reasoning` | Add to description for context |

**Example Salesforce flow:**
1. Webhook receives enquiry
2. Calls `/api/process`
3. If `new_client` → creates `Lead` with `Source = "Web Enquiry"`
4. If `support_request` → finds `Contact` by email, creates `Case`
5. If `needs_review` → sets `Lead.Status = "Working — Needs Review"`

#### Task Queue / Ticketing

The `routing` object already decides team + priority. Direct mappings:

| Field | Jira | Linear |
|---|---|---|
| `routing.team` | Component / Label | Team |
| `routing.priority` | Priority (P1–P3) | Priority (Low / Med / High / Urgent) |
| `classification.type` | Issue Type | Label |
| `response.recommended_action` | Sub-task | Sub-issue |

**Example Jira flow:**
1. Enquiry processed
2. If `needs_review === true` → create ticket in `TRIAGE` project
3. If `draft` exists (clarification needed) → add sub-task: *"Send clarification email to client"*
4. Else → create ticket in team-specific project

#### Batch Processing

The existing `/api/process-batch` + `/api/job-status` endpoints support bulk ingestion:

1. Submit an array of enquiries → receive job IDs
2. Poll every 2 seconds for completion
3. Process results as they arrive

Ideal for:
- Nightly email imports
- CSV upload workflows
- Migration from an old support inbox

### Current State vs. Full Automation

| Feature | Current (MVP) | Full Automation |
|---|---|---|
| Ingestion | Manual paste / sample data | Email webhook, CSV upload, API |
| Storage | `localStorage` only | Postgres / Supabase / CRM |
| Routing | Dashboard team tabs | Auto-create ticket in correct system |
| Response | Generate + click "Send" | Auto-send if confidence ≥ 0.9 and no review flag |
| Audit trail | None | Full log of every AI decision |
| Human override | Edit / manual response | Override in CRM / ticket system |

---

## 6. Design Decisions Summary

| Decision | Rationale |
|---|---|
| **Next.js full-stack** | Single codebase for frontend and API. No separate backend deployment. |
| **No database in MVP** | All state in `localStorage`. Zero-config, easy to run for exam submission. |
| **Skill markdown prompts** | Externalised so non-engineers can tune prompts without touching TypeScript. Versioned in git. |
| **Local-first AI option** | Ollama support means the system works entirely offline for demos or privacy-sensitive environments. |
| **Conditional downstream skills** | Hard rules in the orchestrator (confidence < 0.7 → skip) prevent expensive LLM calls and bad outputs on uncertain inputs. |
| **shadcn/ui + Tailwind CSS** | Accessible, themeable components with minimal custom CSS. |
| **Zod + React Hook Form** | Type-safe configuration form with client-side validation before storage. |
| **Two-step architecture** | Separates routing (automatic) from response generation (staff-reviewed), ensuring human oversight on client-facing communication. |
| **Batch job queue** | `/api/process-batch` decouples submission from execution, supporting bulk ingestion without blocking the UI. |
| **Provider-agnostic interface** | Single `AIProvider` interface with 4 adapters. Switching providers is a dropdown change, not a code change. |

---

*End of document.*
