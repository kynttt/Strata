# Client Conversation Page Split — Design

**Date:** 2026-05-12
**Project:** Strata Practical Exam
**Scope:** Extract the Client Conversation chat panel into its own Next.js page, introducing a shared `Layout` with navigation.

---

## 1. Overview

The current `index.tsx` renders a two-column layout: a **Client Conversation** chat panel on the left (5 columns) and a **Team History** dashboard on the right (7 columns). This design splits the chat into a dedicated page at `/conversation`, leaving the index page (`/`) as a full-width team-history dashboard. A shared `Layout` component is introduced to provide persistent navigation between the two pages.

---

## 2. Architecture

### Page Map

| Route | Purpose |
|-------|---------|
| `/` (index) | Full-width `TeamTabsPanel` — enquiry routing dashboard |
| `/conversation` | Full-width `ChatThread` — client conversation interface |

### Shared Layout

A new `src/components/Layout.tsx` wraps every page. It renders:
- **Top header bar** (existing visual style: logo + title on the left, nav links on the right, Configure AI button)
- **Nav links:** "Dashboard" → `/`, "Conversation" → `/conversation`
- **Active state:** The current route's link receives a visual highlight (e.g., `bg-primary/10 text-primary` or underline)
- **Content slot:** `<main>` renders `children` below the header

### State Ownership

| State | Owner | Persistence |
|-------|-------|-------------|
| `messages` (chat) | `/conversation` page | In-memory only |
| `enquiry` input | `/conversation` page | In-memory only |
| `teamHistory` | `/` (index) page | In-memory only |
| `activeTeamTab` | `/` (index) page | In-memory only |
| `config` / `configError` | `Layout` or individual pages | `localStorage` |

> **Decision:** `config` is read in each page independently (or lifted to `Layout` if we want a single read). Since the current `index.tsx` already reads `localStorage` in a `useEffect`, the simplest migration is to let each page read `config` itself. `Layout` does not need to own it.

---

## 3. Components

### 3.1 Layout (`src/components/Layout.tsx`)

- **Props:** `{ children: ReactNode }`
- **Header:** Retains existing motion entrance animation, logo, title, and Configure AI button.
- **Navigation:** Two text links/buttons styled as tabs next to the Configure button. Active link gets `bg-primary/10 text-primary rounded-lg`. Active state is determined automatically inside `Layout` via `useRouter().pathname`.
- **Styling:** Uses the same Tailwind classes as the current header (`border-b border-border`, `max-w-7xl mx-auto`, etc.).

### 3.2 Index Page (`pages/index.tsx`)

- **Removed:** `ChatThread`, `messages` state, `enquiry` state, `handleSubmit`, `handleSendResponse`.
- **Kept:** `teamHistory`, `activeTeamTab`, `config` / `configError`, `TEAMS`, `makeId`.
- **Layout:** Wrapped in `<Layout activeRoute="/">`.
- **Content:** A single full-width `<TeamTabsPanel>` inside `<main className="max-w-7xl mx-auto px-6 py-8">`.
- **Config error banner:** Still rendered at the top if `configError` exists.

### 3.3 Conversation Page (`pages/conversation.tsx`)

- **New file.**
- **Layout:** Wrapped in `<Layout activeRoute="/conversation">`.
- **State:** `messages`, `enquiry`, `loading`, `config`, `configError`.
- **Logic:** Copies `handleSubmit` from old `index.tsx` but **does not** push into `teamHistory`. After a successful `/api/process` call, the page appends the user's enquiry as a `role: "client"` message. If the AI returns a response draft, it is shown as a preview `role: "team"` message (visually distinct, e.g., with a dashed border or opacity) alongside a "Send Response" button.
- **Send response:** Clicking "Send Response" finalizes the preview message (removes the dashed border) and appends it permanently to `messages`.
- **Config error banner:** Same pattern as index.

### 3.4 ChatThread Adjustments (`src/components/ChatThread.tsx`)

- **No structural changes required.** It already accepts `messages`, `value`, `onChange`, `onSubmit`, and `loading`.
- **One optional enhancement:** Add a `footer` or `belowMessages` render-prop so `/conversation` can show the AI result summary and "Send Response" action without bloating the component. For simplicity, the page can render this extra UI *outside* the `<ChatThread>` card rather than inside it.

---

## 4. Data Flow

### Dashboard (`/`)

1. User opens `/`.
2. `Layout` renders header with "Dashboard" active.
3. Page reads `aiConfig` from `localStorage`.
4. `TeamTabsPanel` displays `teamHistory` (initially empty).
5. User clicks "Conversation" nav link → navigates to `/conversation`.

### Conversation (`/conversation`)

1. User opens `/conversation`.
2. `Layout` renders header with "Conversation" active.
3. Page reads `aiConfig`.
4. User types enquiry, hits Enter or clicks "Process Enquiry".
5. `POST /api/process` is called.
6. On success:
   - A `role: "client"` message is added to `messages`.
   - A system/info message (or just the response draft) is shown in the chat thread.
   - A "Send Response" button appears if a draft exists.
7. Clicking "Send Response" appends a `role: "team"` message to `messages`.
8. **No data is sent back to `/` index page automatically.** If the user wants the record to appear in the team history, they must navigate back to `/`.

### Enquiries Tab (`/conversation` → Inbox)

1. User selects one or more enquiries via checkboxes.
2. User clicks "Process Selected".
3. `POST /api/process-batch` enqueues jobs into BullMQ (Redis-backed queue).
4. Items show "Processing" status immediately.
5. Frontend polls `POST /api/job-status` every 2 seconds.
6. As jobs complete, items update to "Done" with classification/routing/response details.
7. Completed results are persisted to `localStorage` so the Dashboard (`/`) can display them.

---

## 5. Routing & Navigation

- **Next.js Pages Router** is already in use.
- `/conversation` is a new page file: `pages/conversation.tsx`.
- Navigation uses standard Next.js `<Link>` from `next/link` (or `useRouter` + `router.push`) inside `Layout`.
- Active route is determined via `useRouter().pathname`.

---

## 6. Error Handling

| Scenario | Handling |
|----------|----------|
| No AI config on either page | Yellow banner with "Go to Configuration" button, identical to current behavior |
| `/api/process` fails | Error message shown inline in the chat thread or below it |
| Navigation to non-existent page | Next.js 404 page (unchanged) |

---

## 7. Tech Stack

- **Framework:** Next.js 15 (Pages Router) + React + TypeScript
- **Styling:** Tailwind CSS (existing classes)
- **Animation:** Framer Motion (existing `motion` wrappers in `Layout`)
- **UI Components:** shadcn/ui `Button` (for nav links)
- **Icons:** Lucide React (replace inline SVGs in nav if desired — optional)

---

## 8. Folder Structure Changes

```
A:\Strata-practical-exam
├── pages/
│   ├── index.tsx              # full-width TeamTabsPanel
│   ├── conversation.tsx       # NEW — full-width ChatThread
│   ├── configure.tsx          # unchanged
│   └── api/
│       └── process.ts          # unchanged
├── src/
│   ├── components/
│   │   ├── Layout.tsx         # NEW — shared nav shell
│   │   ├── ChatThread.tsx     # unchanged
│   │   ├── TeamTabsPanel.tsx  # unchanged
│   │   └── ...                # unchanged
│   └── ...
```

---

## 9. Out of Scope

- Global state management (Context, Zustand, Redux) — each page keeps its own state.
- Synchronizing `teamHistory` between `/` and `/conversation` automatically.
- URL query parameters or deep-linking to a specific conversation.
- Persisting chat messages across reloads.
- Changing the visual design language (colors, fonts, spacing remain the same).

---

## 10. Open Questions / Decisions

1. **Should the Conversation page also update `teamHistory` on `/`?**  
   **Decision:** No. Keeping the two pages decoupled avoids introducing global state. If needed later, a shared context can be added without changing the page structure.

2. **Should we use `<Link>` or `router.push` for nav?**  
   **Decision:** `<Link>` from `next/link` for standard navigation; active state derived from `useRouter().pathname`.

3. **Should `Layout` read `aiConfig` once and pass it down?**  
   **Decision:** Let each page read `localStorage` independently to avoid prop-drilling and keep `Layout` purely presentational. If duplication becomes annoying, a future refactor can introduce a `useAIConfig()` hook.

---

## 11. Acceptance Criteria

- [ ] `/` renders full-width `TeamTabsPanel` with no chat input visible.
- [ ] `/conversation` renders full-width `ChatThread` with enquiry input.
- [ ] A shared header with "Dashboard" and "Conversation" links appears on both pages.
- [ ] The active page link is visually highlighted.
- [ ] Clicking either nav link navigates cleanly between pages.
- [ ] Both pages independently check for `aiConfig` and show the config error banner if missing.
- [ ] The existing `/api/process` endpoint continues to work from the new `/conversation` page.
- [ ] No console errors or TypeScript errors after the split.
