# Enquiry Processor MVP Design

**Date:** 2026-05-11
**Project:** Strata Practical Exam — Part 1
**Scope:** AI-powered client enquiry classification, routing, and response generation

---

## 1. Overview

A Next.js full-stack MVP that accepts client enquiries via a web dashboard, uses an AI provider (OpenAI, Anthropic, Google, or Ollama) to classify and draft responses, and presents actionable results to staff. The architecture demonstrates practical integration of AI into a business workflow with clean boundaries between orchestration, skills, and provider adapters.

---

## 2. Architecture

### High-Level Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Dashboard │────▶│ Orchestrator │────▶│ Provider Adapter│
│  (Next.js)  │     │  (API Route) │     │ (OpenAI/Claude/ │
└─────────────┘     └──────────────┘     │  Gemini/Ollama) │
                                         └─────────────────┘
                                                  │
                       ┌──────────────────────────┼──────────────────────────┐
                       ▼                          ▼                          ▼
                ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
                │ classify-   │          │ route-      │          │ generate-   │
                │ enquiry     │          │ enquiry     │          │ response    │
                │ (skill.md)  │          │ (skill.md)  │          │ (skill.md)  │
                └─────────────┘          └─────────────┘          └─────────────┘
```

### Orchestrator Strategy: Hybrid (Option C)

1. **Hardcoded first step:** Always run `classify-enquiry` to understand the enquiry.
2. **Code-based routing:** Based on classification result + confidence score, code decides which downstream skills to run and how to parameterize them.
3. **Conditional execution:**
   - Confidence >= 0.7 → run `route-enquiry` + `generate-response`
   - Confidence < 0.7 or `needs_clarification` → skip routing/response, flag for human review
   - `general_question` → skip routing, only generate response

---

## 3. Components

### 3.1 Dashboard (Frontend)

- **Next.js Pages Router** (`pages/index.tsx`)
- **Top bar:** Settings button opens a configuration panel
- **Left panel (Input):**
  - Large textarea for enquiry text
  - "Process Enquiry" button
  - Quick-test sample buttons ("New client", "Complaint", "General question")
- **Right panel (Results):** Three stacked cards
  1. **Classification** — type badge (color-coded), confidence progress bar, reasoning text
  2. **Routing** — team icon + name, priority badge (hidden if skipped)
  3. **Suggested Response** — draft text, "Copy" button, "Regenerate" button (hidden if skipped)
- **Warnings:** Yellow banner for low-confidence or needs-clarification cases with "Route to Human" button
- **State:** All ephemeral (no database, no persistent storage)

### 3.2 Orchestrator (`pages/api/process.ts`)

- Accepts `POST { enquiry: string }`
- Loads `classify-enquiry/skill.md` and calls skill
- Evaluates confidence and classification
- Conditionally loads and calls downstream skills
- Returns unified JSON:
  ```json
  {
    "classification": {
      "type": "support_request",
      "confidence": 0.94,
      "reasoning": "The user reports a technical issue with their account."
    },
    "routing": {
      "team": "Technical Support",
      "priority": "medium"
    },
    "response": {
      "draft": "Dear...",
      "recommended_action": "Investigate account settings and follow up within 24 hours."
    },
    "flags": {
      "needs_review": false,
      "reason": null
    }
  }
  ```

### 3.3 Provider Adapter (`src/providers/`)

**Interface:**
```typescript
interface AIProvider {
  name: string;
  listModels(): Promise<string[]>;
  send(systemPrompt: string, userPrompt: string, model: string): Promise<string>;
}
```

**Adapters:**
- `OpenAIProvider` — OpenAI SDK, supports GPT-4o, GPT-3.5
- `AnthropicProvider` — Anthropic SDK, supports Claude 3.5/3
- `GoogleProvider` — Google Generative AI SDK, supports Gemini models
- `OllamaProvider` — HTTP fetch to `localhost:11434`, supports any local model

**Factory:** `createProvider(type, config)` returns the correct adapter.

**Error handling:**
- 10-second timeout per request
- Invalid API key → clear error message
- Provider down → "Provider unavailable. Check settings or try Ollama."
- Timeout → return partial results + error for timed-out skill

### 3.4 Skills (`src/skills/`)

Each skill is a self-contained module with a `.md` instruction file and a `.ts` runner.

**Skill runner signature:**
```typescript
async function run(
  enquiry: string,
  skillMarkdownPath: string,
  provider: AIProvider,
  model: string
): Promise<SkillResult>
```

The runner reads the `.md` file at runtime and passes its contents as the `systemPrompt` to the provider.

**Skills:**

1. **`classify-enquiry/`**
   - `skill.md`: Instructions to classify into categories (`new_client`, `support_request`, `complaint`, `general_question`, `needs_clarification`). Include confidence scoring guidance. Require JSON output.
   - Returns: `{ type, confidence, reasoning }`

2. **`route-enquiry/`**
   - `skill.md`: Instructions to map classification types to teams (`Sales`, `Technical Support`, `Complaints`, `General`) and assign priority (`low`, `medium`, `high`). Require JSON output.
   - Returns: `{ team, priority }`

3. **`generate-response/`**
   - `skill.md`: Instructions to draft a professional, empathetic response based on classification. Include a recommended action for staff. Require JSON output.
   - Returns: `{ draft, recommended_action }`

---

## 4. Data Flow

1. User submits enquiry via dashboard
2. Dashboard sends `POST /api/process` with enquiry text
3. Orchestrator loads `classify-enquiry/skill.md`
4. Orchestrator calls `classify-enquiry` skill via Provider Adapter
5. Orchestrator evaluates result:
   - Confidence < 0.7 or `needs_clarification` → set `needs_review = true`, return early
   - Otherwise → proceed
6. Orchestrator conditionally calls `route-enquiry` and `generate-response`
7. Orchestrator assembles unified result
8. Dashboard renders classification, routing, and response cards

---

## 5. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Low confidence (< 0.7) | Flag for human review, skip routing + response |
| Vague / nonsensical input | `classify-enquiry` returns `needs_clarification`, `generate-response` drafts a follow-up question |
| Provider API down / invalid key | Adapter catches error, returns structured error, dashboard shows clear message |
| Rate limits / timeouts | 10s timeout per skill, partial results returned with error for timed-out skill |
| Ollama not running | Same structured error flow, prompt user to check local server |

---

## 6. Tech Stack

- **Framework:** Next.js 15 (Pages Router) + React + TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Card, Button, Badge, Progress, Sheet, Alert)
- **AI SDKs:** `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`
- **Ollama:** Direct HTTP fetch to `localhost:11434`

---

## 7. Folder Structure

```
A:\Strata-practical-exam
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-11-enquiry-processor-design.md
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── EnquiryInput.tsx
│   │   ├── ResultsPanel.tsx
│   │   ├── ClassificationCard.tsx
│   │   ├── RoutingCard.tsx
│   │   ├── ResponseCard.tsx
│   │   └── SettingsPanel.tsx
│   ├── providers/
│   │   ├── base.ts
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── google.ts
│   │   ├── ollama.ts
│   │   └── factory.ts
│   ├── skills/
│   │   ├── classify-enquiry/
│   │   │   ├── skill.md
│   │   │   └── index.ts
│   │   ├── route-enquiry/
│   │   │   ├── skill.md
│   │   │   └── index.ts
│   │   └── generate-response/
│   │       ├── skill.md
│   │       └── index.ts
│   └── lib/
│       └── skill-runner.ts
├── pages/
│   ├── index.tsx
│   └── api/
│       └── process.ts
├── public/
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 8. Bonus Features Covered

- **Confidence scoring:** Built into `classify-enquiry` skill
- **Prompt engineering:** Each skill has a dedicated `skill.md` with explicit instructions and JSON output requirements
- **Error handling:** Provider errors, timeouts, low confidence, vague input
- **Automation potential:** The `/api/process` endpoint can be called by any external system (email webhook, CRM, task queue). The JSON response includes all metadata needed for downstream automation.
- **README:** Setup, how to run, design decisions

---

## 9. Out of Scope (MVP)

- Email integration
- Database / persistence
- User authentication
- CRM integration
- Multi-turn conversations
- Real-time updates
