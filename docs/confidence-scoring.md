# Confidence Scoring

## Overview

Every enquiry that enters the system is classified by an AI model with a **confidence score** between `0.0` and `1.0`. This score tells the staff how certain the AI is about its classification, and it directly drives downstream automation decisions.

## How It Works

### 1. Calibration in the Prompt

The `classify-enquiry` skill instructs the model to calibrate its own certainty:

- **0.9+** — very sure (e.g. clear intent, specific language)
- **0.7–0.9** — reasonably sure (e.g. mixed signals but leaning one way)
- **Below 0.7** — uncertain (e.g. vague, ambiguous, or nonsensical input)

This calibration is **explicit in the system prompt** so the score is meaningful across different providers (OpenAI, Anthropic, Google, Ollama).

### 2. Orchestrator Threshold

The orchestrator (`src/lib/process-enquiry.ts`) uses a hard threshold of **0.7**:

```typescript
const needsReview =
  classification.confidence < 0.7 || classification.type === "needs_clarification";
```

| Confidence | Action |
|---|---|
| `>= 0.7` | Proceed to routing + response generation |
| `< 0.7` | Flag as **Needs Human Review**, skip routing and response |

### 3. UI Display

The confidence score is surfaced in three places:

- **Dashboard row** (`EnquiryRow`) — a small progress bar + percentage badge
- **Enquiry detail card** (`EnquiryEntryCard`) — an animated confidence bar with numeric readout
- **Conversation header** (`/enquiries` page) — inline text: `new client · Sales · high · 92% confidence`

### 4. Why 0.7?

The 0.7 threshold was chosen because:

- It catches genuinely ambiguous input without being so strict that normal enquiries constantly escalate.
- The prompt calibration explicitly tells the model that "below 0.7 means uncertain," so the model respects the boundary.
- It prevents wasted tokens: if confidence is low, the orchestrator skips `route-enquiry` and `generate-response` entirely.

## Edge Cases

| Scenario | Handling |
|---|---|
| Model returns `confidence: 1.0` on gibberish | Rare but possible with smaller local models. The `needs_clarification` type acts as a second safety net. |
| Model returns `confidence: 0.0` on clear input | Usually indicates a prompt misunderstanding or provider failure. Falls through to `needs_review`. |
| Ollama (local) calibration drift | Local models can be over- or under-confident. The `needs_clarification` guard and reasoning field provide human-visible context. |

## Future Improvements

- **Rolling average:** Track confidence trends per provider to detect model drift.
- **Confidence history:** Store past confidence scores to identify enquiry types the AI consistently struggles with.
- **Adaptive threshold:** Lower the threshold for repeat senders (known clients) where context reduces ambiguity.
