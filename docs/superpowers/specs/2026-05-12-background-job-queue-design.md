# Background Job Queue — Design

**Date:** 2026-05-12
**Project:** Strata Practical Exam
**Scope:** Introduce BullMQ with Redis to handle bulk AI processing of enquiries asynchronously, with retries and concurrency control.

---

## 1. Overview

The `/conversation` page allows users to select multiple enquiries and process them via AI. Processing each enquiry sequentially in the browser (N API calls) is inefficient and fragile. A background job queue decouples the submission from execution: the frontend submits a batch, the queue worker processes items with controlled concurrency, and the frontend polls for status updates.

---

## 2. Architecture

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| `src/lib/process-enquiry.ts` | Shared library | Core AI processing logic (classify → route → generate). Extracted so both API routes and the worker can call it. |
| `src/lib/queue.ts` | Queue manager | BullMQ `Queue` instance, `addEnquiryJob()`, `getJobStatus()`. |
| `src/lib/worker.ts` | Worker process | BullMQ `Worker` that listens on `enquiry-processing` queue, runs `processEnquiry()`, concurrency = 2. |
| `pages/api/process-batch.ts` | API route | `POST /api/process-batch` — validates input, enqueues N jobs, returns job IDs. |
| `pages/api/job-status.ts` | API route | `POST /api/job-status` — accepts job ID array, returns state/result for each. |
| `pages/api/process.ts` | API route (updated) | `POST /api/process` — refactored to use shared `processEnquiry()` (single-item, still used by chat flow). |
| `pages/conversation.tsx` | Page (updated) | `handleProcessSelected` calls `process-batch`, then polls `job-status` every 2s. |

### Data Flow

```
User selects items → clicks "Process Selected"
    ↓
POST /api/process-batch → enqueues N BullMQ jobs
    ↓
Redis queue holds jobs
    ↓
Worker (concurrency: 2) picks up jobs
    ↓
processEnquiry() calls AI provider
    ↓
Job completed/failed → result stored in Redis
    ↓
Frontend polls POST /api/job-status every 2s
    ↓
UI updates item status (processing → completed/error)
```

---

## 3. Queue Configuration

- **Queue name:** `enquiry-processing`
- **Concurrency:** 2 (process 2 enquiries in parallel)
- **Retries:** 3 with exponential backoff (base delay 2000ms)
- **Redis connection:** Configurable via `REDIS_HOST` / `REDIS_PORT` env vars. Defaults to `localhost:6379`.

---

## 4. API Endpoints

### `POST /api/process-batch`

**Body:**
```json
{
  "items": [{ "id": "1", "snippet": "..." }],
  "providerType": "openai",
  "model": "gpt-4o",
  "apiKey": "...",
  "baseUrl": "..."
}
```

**Response:**
```json
{
  "jobIds": ["bullmq-job-id-1", "bullmq-job-id-2"],
  "count": 2
}
```

### `POST /api/job-status`

**Body:**
```json
{
  "jobIds": ["bullmq-job-id-1"]
}
```

**Response:**
```json
{
  "statuses": [
    {
      "id": "bullmq-job-id-1",
      "state": "completed",
      "data": { "itemId": "1" },
      "result": { "itemId": "1", "result": { ... } }
    }
  ]
}
```

---

## 5. Error Handling

| Scenario | Handling |
|----------|----------|
| Redis unavailable | `process-batch` returns 500; frontend marks all items as error |
| AI provider rate limit | BullMQ auto-retries (3 attempts, exponential backoff) |
| Worker crash | Jobs remain in queue; worker restart picks them up |
| Job fails after retries | Frontend receives `state: "failed"` with `failedReason` |
| Frontend closes tab | Jobs continue processing in background; reopening page does not resume polling automatically (out of scope) |

---

## 6. Tech Stack

- **Queue:** BullMQ 5.x
- **Redis:** ioredis 5.x (Redis 6+ recommended)
- **Worker runtime:** `tsx` (TypeScript execution via `npm run worker`)
- **Frontend polling:** `setInterval` every 2000ms while `activeJobIds` is non-empty

---

## 7. Running Locally

```bash
# 1. Start Redis
redis-server

# 2. Start worker (separate terminal)
npm run worker

# 3. Start app (separate terminal)
npm run dev
```

---

## 8. Out of Scope

- SSE / WebSocket real-time updates (polling is sufficient for this use case)
- Queue monitoring UI (BullMQ Pro or Bull Board not included)
- Persisting `activeJobIds` across page reloads
- Hosted Redis configuration (env var support is ready but not wired to deployment config)

---

## 9. Files Changed

| File | Action |
|------|--------|
| `src/lib/process-enquiry.ts` | **Create** |
| `src/lib/queue.ts` | **Create** |
| `src/lib/worker.ts` | **Create** |
| `pages/api/process-batch.ts` | **Create** |
| `pages/api/job-status.ts` | **Create** |
| `pages/api/process.ts` | **Modify** (refactor to use shared `processEnquiry`) |
| `pages/conversation.tsx` | **Modify** (batch enqueue + polling) |
| `package.json` | **Modify** (add `worker` script) |
