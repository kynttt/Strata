# Automation Potential

## Overview

The enquiry processing pipeline is designed as a **standalone, stateless API** that can be plugged into larger workflows. The `/api/process` and `/api/generate-response` endpoints return a stable JSON contract, making them ideal integration points for email systems, CRMs, and task queues.

## API Contract

### `POST /api/process`

Accepts an enquiry + provider config. Returns:

```json
{
  "classification": {
    "type": "new_client",
    "confidence": 0.92,
    "reasoning": "The user asks about pricing and wants to book a consultation."
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

### `POST /api/generate-response`

Accepts classification + enquiry. Returns:

```json
{
  "response": {
    "draft": "Dear Sarah, thank you for your interest...",
    "recommended_action": "Follow up within 24 hours with a detailed quote."
  }
}
```

Both endpoints are **stateless** — they do not require sessions, cookies, or database state. Any system that can make an HTTP POST can integrate.

---

## Integration Scenarios

### 1. Email System

**Inbound webhook:**

A `pages/api/webhooks/email.ts` endpoint could receive forwarded emails (e.g. from Zapier, Make, or a custom mail server rule), POST the body to `/api/process`, and store the result.

```typescript
// Pseudo-code for email webhook
export default async function handler(req, res) {
  const { from, subject, body } = req.body;
  const result = await fetch("http://localhost:3000/api/process", {
    method: "POST",
    body: JSON.stringify({ enquiry: body, providerType: "openai", model: "gpt-4o" }),
  });
  const data = await result.json();
  // Store in database, create ticket, etc.
}
```

**Outbound send queue:**

When `generate-response` succeeds and `flags.needs_review === false`, an outbox adapter can queue the draft for sending via SendGrid / AWS SES / Microsoft Graph. If review is needed, the email is held and a staff member is notified.

### 2. CRM Integration

The classification and routing data maps cleanly to CRM objects:

| Field | CRM Action |
|---|---|
| `classification.type === "new_client"` | Create a `Lead` or `Opportunity` |
| `classification.type === "support_request"` | Create a `Case` linked to existing `Contact` |
| `routing.team` | Assign owner by team |
| `response.draft` | Log as an `Activity` or `Note` on the record |
| `flags.needs_review === true` | Set status to `"Pending Review"` instead of auto-assigning |
| `classification.reasoning` | Add to description for context |

**Example Salesforce flow:**
1. Webhook receives enquiry
2. Calls `/api/process`
3. If `new_client` → creates `Lead` with `Source = "Web Enquiry"`
4. If `support_request` → finds `Contact` by email, creates `Case` with `Subject = routing.team`
5. If `needs_review` → sets `Lead.Status = "Working — Needs Review"`

### 3. Task Queue / Ticketing

The `routing` object already decides team + priority. A ticket adapter can map this directly:

| Field | Jira Mapping | Linear Mapping |
|---|---|---|
| `routing.team` | Component / Label | Team |
| `routing.priority` | Priority (P1–P3) | Priority (Low / Medium / High / Urgent) |
| `classification.type` | Issue Type | Issue Label |
| `response.recommended_action` | Description sub-task | Sub-issue |

**Example Jira flow:**
1. Enquiry processed
2. If `needs_review === true` → create ticket in `TRIAGE` project
3. If `draft` exists (clarification needed) → add sub-task: *"Send clarification email to client"*
4. Else → create ticket in team-specific project with priority mapped from `routing.priority`

### 4. Batch Processing

The existing `/api/process-batch` + `/api/job-status` endpoints already support bulk ingestion:

1. Submit an array of enquiries
2. Receive job IDs
3. Poll every 2 seconds for completion
4. Process results as they arrive

This is ideal for:
- Nightly email imports
- CSV upload workflows
- Migration from an old support inbox

---

## Current State vs. Full Automation

| Feature | Current (MVP) | Full Automation |
|---|---|---|
| Ingestion | Manual paste / sample data | Email webhook, CSV upload, API |
| Storage | `localStorage` only | Postgres / Supabase / CRM |
| Routing | Dashboard team tabs | Auto-create ticket in correct system |
| Response | Generate + click "Send" | Auto-send if confidence ≥ 0.9 and no review flag |
| Audit trail | None | Full log of every AI decision |
| Human override | Edit / manual response | Override in CRM / ticket system |

## Suggested Next Steps

1. **Add a database layer** (`src/lib/persistence.ts`) — Postgres or Supabase to replace `localStorage`. This enables audit trails, search, and multi-user access.
2. **Build the email webhook** — `pages/api/webhooks/email.ts` to receive real client emails.
3. **Add an outbox queue** — A simple table (`outbox`) that holds drafts pending send. A cron job or serverless function polls it and sends via SES.
4. **CRM connector** — A generic webhook or Zapier integration that POSTs the `ProcessResponse` to any CRM.
5. **Slack/Teams notifications** — When `needs_review === true`, notify the relevant team channel.
