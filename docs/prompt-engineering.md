# Prompt Engineering

## Philosophy

Prompts are treated as **first-class code artifacts**, not inline strings. Each AI task lives in a dedicated `skill.md` file under `src/skills/{name}/`. The skill runner reads this file at runtime and passes it as the `systemPrompt` to the AI provider.

This design means:

- Non-engineers can tune prompts without touching TypeScript.
- Prompts are versioned in git alongside the code.
- Each skill has a single, well-defined responsibility.

## Skill Structure

Each skill is a self-contained module:

```
src/skills/classify-enquiry/
  skill.md   — instructions, examples, output constraints
  index.ts   — runner function that calls the skill runner
```

### Current Skills

| Skill | Responsibility | Key Constraints |
|---|---|---|
| `classify-enquiry` | Categorise into 5 types + confidence score | JSON output, calibrated confidence, reasoning sentence |
| `route-enquiry` | Map classification → team + priority | Hard rules in prompt, never hallucinate teams |
| `generate-response` | Draft reply + recommended action | Tone rules, no em-dashes, fixed sign-off |

## Structured JSON Output

Every skill ends with the same strict contract:

```
Return **only** a JSON object with this exact shape. No markdown, no explanation.
```

This reduces parsing failures. The skill runner (`src/lib/skill-runner.ts`) has a robust extractor that:

1. Strips markdown code fences (` ```json ... ``` `).
2. Uses brace-matching to find the first valid JSON object.
3. Cleans trailing commas before parsing.

This is especially important for **Ollama**, which is more prone to adding markdown wrappers or trailing commas.

## Design Choices

### 1. Calibrated Confidence

The classify prompt anchors the model's confidence scale:

```
- 0.9+ means you are very sure
- 0.7-0.9 means reasonably sure
- below 0.7 means uncertain
```

Without this, different models interpret "confidence" differently. GPT-4o might give 0.95 for obvious cases, while a local llama3.2 might give 0.85 for the same input. Calibration makes the 0.7 threshold meaningful across providers.

### 2. Clarification Draft Generation

When the classifier returns `needs_clarification`, it also generates a `draft` field: a polite follow-up question. This turns a vague enquiry into an actionable workflow step instead of just a red flag.

Example:

```json
{
  "type": "needs_clarification",
  "confidence": 0.55,
  "reasoning": "The message is too vague to determine intent.",
  "draft": "Thank you for reaching out. To help you best, could you let us know whether you are an existing owner, a prospective buyer, or a tenant?"
}
```

### 3. Tone & Style Guardrails

The `generate-response` skill includes specific tone rules to prevent robotic or generic output:

- **No em-dashes** — commas or separate sentences instead, for a natural human voice.
- **Fixed sign-off** — `Warm regards, Strata Team` instead of placeholders like `[Your Name]`.
- **No false promises** — the model is explicitly told never to promise exact timelines or refunds.

### 4. Routing Rules in Prompt

The `route-enquiry` skill embeds the business rules directly in the prompt:

- `complaint` → high priority
- `support_request` with "urgent/down/broken/critical" → high priority
- `new_client` → medium priority
- `general_question` → low priority

This means the routing decision is transparent and auditable. A staff member can read `skill.md` and know exactly why an enquiry went to a particular team.

## Provider Differences

| Provider | Model | JSON Reliability | Notes |
|---|---|---|---|
| OpenAI | GPT-4o | Excellent | Follows instructions precisely |
| Anthropic | Claude 3.5 Sonnet | Excellent | Very good at tone guidelines |
| Google | Gemini 1.5 Flash | Good | Occasionally adds markdown |
| Ollama | llama3.2 | Fair | Needs the robust JSON extractor most often |

The skill runner's `parseJsonFromResponse` function normalises all of these, so the orchestrator never sees raw provider output — only structured data.

## Tuning Workflow

1. Edit `src/skills/{name}/skill.md`
2. Save and refresh the app (no rebuild needed — files are read at runtime)
3. Submit a test enquiry
4. Inspect the result in the dashboard
5. Iterate

Because prompts are markdown files, they can be reviewed in PRs just like code, and A/B tested by copying a skill folder and switching the orchestrator to use the new version.
