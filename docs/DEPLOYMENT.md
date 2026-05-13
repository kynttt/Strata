# Deployment Guide

## Deploying to Vercel

### Option 1: Connect Git Repository (Recommended)

1. Push your code to GitHub / GitLab / Bitbucket
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your repository
4. Vercel will auto-detect Next.js — no config changes needed
5. Click **Deploy**

### Option 2: Vercel CLI

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy from project root
vercel --prod
```

### Environment Variables (Optional)

**No environment variables are required.** API keys are entered in the Configure AI page and stored in the browser's `localStorage`. They are sent from the frontend to the API routes in the request body.

If you want to **pre-fill keys** for a shared deployment, you can set these in the Vercel dashboard (Project Settings → Environment Variables):

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | Pre-fills OpenAI key in the UI. Users can still enter their own. |
| `ANTHROPIC_API_KEY` | No | Pre-fills Anthropic key. |
| `GOOGLE_API_KEY` | No | Pre-fills Google Gemini key. |
| `OLLAMA_BASE_URL` | No | Defaults to `http://localhost:11434`. Only needed if running Ollama remotely. |

### What the `vercel.json` Does

The included `vercel.json` increases the **maxDuration** for API routes:

- `/api/process` — 60 seconds (single enquiry classification + routing)
- `/api/generate-response` — 60 seconds (response generation)
- `/api/process-batch` — 60 seconds (batch enqueue)
- `/api/job-status` — 10 seconds (quick status lookup)

The default Vercel hobby plan limit is 10 seconds. If you are on the hobby plan and don't upgrade, the `maxDuration` in `vercel.json` will be capped at 10 seconds regardless. Upgrade to Pro for 300-second functions if needed.

### Known Limitations on Vercel

#### Batch Processing (Emails Tab)

The Emails tab supports **batch processing** (select multiple emails → click Process Selected). This uses an in-memory job queue that processes items with a concurrency of 2.

**On Vercel serverless functions**, this has a limitation:
- The batch endpoint adds jobs and returns immediately
- Jobs start processing in the background
- Vercel may freeze the function after the HTTP response is sent
- Subsequent poll requests might hit a different function instance with an empty queue

**Workaround:** Process emails **one at a time** on Vercel. The single-item processing (`/api/process`) works perfectly because it's fully synchronous.

For production batch processing, consider:
- Using a hosted Redis (Upstash) + BullMQ with a persistent worker
- Or migrating batch processing to a long-running server (DigitalOcean, Railway, AWS ECS)

#### LocalStorage Persistence

All app state (team history, conversations, email status, AI config) is stored in the browser's `localStorage`. This means:
- ✅ No database setup required
- ✅ Zero-config deployment
- ⚠️ Data is per-browser. Staff members won't see each other's history unless they share a browser profile
- ⚠️ Clearing browser data wipes all state

For multi-user persistence, add a database layer (Supabase, Postgres, Firebase) and replace `localStorage` calls with API persistence.

#### Ollama (Local AI)

Ollama runs on `localhost:11434`. It will **not work** on Vercel's cloud servers unless:
- You expose Ollama via a public URL (not recommended for security)
- Or use a hosted Ollama provider

For Vercel deployment, stick to cloud providers (OpenAI, Anthropic, Google).

### Build Settings

Vercel will auto-detect these from `package.json`:

- **Build Command:** `next build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Framework:** Next.js

No custom build settings needed.

### Post-Deployment Checklist

- [ ] Open the deployed URL
- [ ] Go to **Configure AI** and set your provider + API key
- [ ] Go to **Enquiries** → Chats tab, click **Process** on a sample conversation
- [ ] Go to **Dashboard** (`/`) and verify the enquiry appears in the correct team tab
- [ ] Click the enquiry → **Generate Response** → verify the AI draft appears
- [ ] Click **Send Response** → verify it marks as sent and appears in the conversation thread

### Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| "Configuration Required" banner | No AI config in localStorage | Go to Configure AI page and set provider |
| API timeout (10s) | Hobby plan limit reached | Upgrade to Vercel Pro, or use faster models |
| "Provider unavailable" | API key missing or invalid | Check key in Configure AI or env vars |
| Batch jobs never complete | Serverless function frozen | Process emails one at a time |
| Missing styles | Tailwind not built | Ensure `postcss.config.js` exists |

### Alternative Platforms

If Vercel's serverless limits are too restrictive:

| Platform | Pros | Cons |
|---|---|---|
| **Railway** | Easy Docker deploy, persistent containers | Costs money for always-on |
| **Render** | Native Node.js support, free tier | Spins down after inactivity |
| **DigitalOcean App Platform** | Predictable pricing, no cold starts | More manual config |
| **Self-hosted (Docker)** | Full control, no limits | You manage infrastructure |

For local demo / exam submission, `npm run dev` on your machine is perfectly sufficient.
