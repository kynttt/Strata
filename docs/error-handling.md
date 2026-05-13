# Error Handling

## Philosophy

Errors are surfaced **clearly to the user** and **structured for downstream systems**. The system never silently fails. Every failure path produces a visible message in the UI and a typed error in the API response.

## Error Types

### 1. Provider Errors

A custom `ProviderError` class (`src/providers/base.ts`) wraps all AI provider failures with typed error codes:

```typescript
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "timeout" | "auth" | "network" | "unknown"
  ) { ... }
}
```

| Code | Cause | User Message |
|---|---|---|
| `timeout` | Request exceeded time limit (10s cloud, 60s Ollama) | "Request timed out. Try again or switch provider." |
| `auth` | Invalid API key or rate limit | "Authentication failed. Check your API key." |
| `network` | Provider unreachable (e.g. Ollama not running) | "Provider unavailable. Check settings or try Ollama." |
| `unknown` | Unexpected failure | "Something went wrong. Please try again." |

### 2. Vague or Nonsensical Input

When a client enquiry is too ambiguous for the AI to classify with confidence:

**Flow:**
1. `classify-enquiry` returns `type: "needs_clarification"`
2. Orchestrator sets `needs_review: true`
3. Routing and response generation are **skipped**
4. Dashboard shows a **Clarification Draft** card with a pre-written follow-up question

This turns a bad input into an **actionable next step** rather than a dead end.

### 3. Low-Confidence Input

If the model is uncertain (confidence < 0.7) but the enquiry is not gibberish:

**Flow:**
1. `classify-enquiry` returns a type + low confidence score
2. Orchestrator sets `needs_review: true`, reason: "Low confidence classification"
3. Routing and response generation are **skipped**
4. Dashboard shows a **Needs Human Review** badge
5. Staff can manually route or request clarification

### 4. Partial Failures

Sometimes classification succeeds but routing or response generation fails:

**Flow:**
1. `classify-enquiry` succeeds
2. `route-enquiry` or `generate-response` fails (provider hiccup)
3. Orchestrator returns the classification + a `routingError` or `responseError` field
4. Dashboard shows the partial result plus a visible error banner

This prevents one failing skill from hiding the successful results of another.

### 5. Validation Errors

The `/api/process` endpoint validates every request:

- Missing `enquiry` → `400 Bad Request`
- Missing `providerType` or `model` → `400 Bad Request`
- Invalid `providerType` → `400 Bad Request`
- Malformed request body → `400 Bad Request`

## UI Error States

The dashboard handles errors at three levels:

| Level | Component | Behaviour |
|---|---|---|
| Config | `Layout` config banner | Shows "Configuration Required" if no AI provider is set |
| Row | `EnquiryRow` / `GmailInbox` | Red "Error" badge, bold red text |
| Detail | `EnquiryEntryCard` / `EnquiryDrawer` | Full error card with icon + message |
| Chat | `ChatThread` | Red team message bubble with error text |

## Recovery Paths

| Scenario | User Action |
|---|---|
| Provider timeout | Retry, or switch provider in Configure AI |
| Low confidence | Click into enquiry card → manually route or edit |
| Needs clarification | Copy the pre-generated draft → send to client |
| Routing failed | Classification is still visible → manually assign team |
| Response failed | Classification + routing are still visible → write manual response |

## Future Improvements

- **Retry with backoff:** Automatically retry `route-enquiry` once on timeout before surfacing error.
- **Provider failover:** If OpenAI fails, silently try Anthropic with the same prompt.
- **Error analytics:** Log error types per provider to identify systemic issues.
