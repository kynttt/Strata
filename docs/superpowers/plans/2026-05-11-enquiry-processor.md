# Enquiry Processor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js MVP that classifies, routes, and drafts responses for client enquiries using an AI provider adapter and skill-as-markdown architecture.

**Architecture:** Hybrid orchestrator (classify first, then code decides downstream skills). Provider-agnostic adapter supports OpenAI, Anthropic, Google, and Ollama. Skills are markdown-prompt modules executed by a shared runner.

**Tech Stack:** Next.js 15 (Pages Router), React, TypeScript, Tailwind CSS, OpenAI SDK, Anthropic SDK, Google Generative AI SDK.

---

## File Structure

```
A:\Strata-practical-exam
├── src/
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
│   ├── lib/
│   │   ├── skill-runner.ts
│   │   └── utils.ts
│   └── components/
│       ├── Dashboard.tsx
│       ├── EnquiryInput.tsx
│       ├── ResultsPanel.tsx
│       ├── ClassificationCard.tsx
│       ├── RoutingCard.tsx
│       ├── ResponseCard.tsx
│       └── SettingsPanel.tsx
├── pages/
│   ├── index.tsx
│   └── api/
│       └── process.ts
├── public/
├── styles/
│   └── globals.css
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── README.md
```

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `next.config.js`
- Create: `styles/globals.css`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "strata-enquiry-processor",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.32.0",
    "@google/generative-ai": "^0.21.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Write next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

- [ ] **Step 5: Write styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules` created with Next.js, React, Tailwind, and AI SDKs.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json tailwind.config.ts next.config.js styles/globals.css
git commit -m "chore: scaffold Next.js project with Tailwind and AI SDKs"
```

---

### Task 2: Create Provider Base Interface + Factory

**Files:**
- Create: `src/providers/base.ts`
- Create: `src/providers/factory.ts`

- [ ] **Step 1: Write src/providers/base.ts**

```typescript
export interface AIProvider {
  name: string;
  listModels(): Promise<string[]>;
  send(systemPrompt: string, userPrompt: string, model: string): Promise<string>;
}

export interface ProviderConfig {
  type: "openai" | "anthropic" | "google" | "ollama";
  apiKey?: string;
  baseUrl?: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "timeout" | "auth" | "network" | "unknown"
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
```

- [ ] **Step 2: Write src/providers/factory.ts**

```typescript
import { AIProvider, ProviderConfig } from "./base";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import { OllamaProvider } from "./ollama";

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case "openai":
      return new OpenAIProvider(config.apiKey);
    case "anthropic":
      return new AnthropicProvider(config.apiKey);
    case "google":
      return new GoogleProvider(config.apiKey);
    case "ollama":
      return new OllamaProvider(config.baseUrl);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/providers/base.ts src/providers/factory.ts
git commit -m "feat: add provider base interface and factory"
```

---

### Task 3: Create OpenAI Provider Adapter

**Files:**
- Create: `src/providers/openai.ts`

- [ ] **Step 1: Write src/providers/openai.ts**

```typescript
import OpenAI from "openai";
import { AIProvider, ProviderError } from "./base";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }

  async listModels(): Promise<string[]> {
    const list = await this.client.models.list();
    return list.data.map((m) => m.id);
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await this.client.chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return response.choices[0]?.message?.content || "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("OpenAI request timed out after 10s", "timeout");
      }
      if (err.status === 401) {
        throw new ProviderError("Invalid OpenAI API key", "auth");
      }
      if (err.status >= 500 || err.code === "ECONNREFUSED") {
        throw new ProviderError("OpenAI service unavailable", "network");
      }
      throw new ProviderError(err.message || "OpenAI request failed", "unknown");
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/providers/openai.ts
git commit -m "feat: add OpenAI provider adapter"
```

---

### Task 4: Create Anthropic Provider Adapter

**Files:**
- Create: `src/providers/anthropic.ts`

- [ ] **Step 1: Write src/providers/anthropic.ts**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, ProviderError } from "./base";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  async listModels(): Promise<string[]> {
    return ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"];
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await this.client.messages.create(
        {
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.3,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      const content = response.content[0];
      return content.type === "text" ? content.text : "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Anthropic request timed out after 10s", "timeout");
      }
      if (err.status === 401) {
        throw new ProviderError("Invalid Anthropic API key", "auth");
      }
      if (err.status >= 500 || err.code === "ECONNREFUSED") {
        throw new ProviderError("Anthropic service unavailable", "network");
      }
      throw new ProviderError(err.message || "Anthropic request failed", "unknown");
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/providers/anthropic.ts
git commit -m "feat: add Anthropic provider adapter"
```

---

### Task 5: Create Google Provider Adapter

**Files:**
- Create: `src/providers/google.ts`

- [ ] **Step 1: Write src/providers/google.ts**

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, ProviderError } from "./base";

export class GoogleProvider implements AIProvider {
  name = "google";
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_API_KEY || "");
  }

  async listModels(): Promise<string[]> {
    return ["gemini-1.5-flash", "gemini-1.5-pro"];
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const genModel = this.client.getGenerativeModel({ model });
      const result = await genModel.generateContent(
        {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.3 },
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return result.response.text() || "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Google request timed out after 10s", "timeout");
      }
      if (err.status === 401 || err.message?.includes("API key not valid")) {
        throw new ProviderError("Invalid Google API key", "auth");
      }
      if (err.status >= 500 || err.code === "ECONNREFUSED") {
        throw new ProviderError("Google service unavailable", "network");
      }
      throw new ProviderError(err.message || "Google request failed", "unknown");
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/providers/google.ts
git commit -m "feat: add Google provider adapter"
```

---

### Task 6: Create Ollama Provider Adapter

**Files:**
- Create: `src/providers/ollama.ts`

- [ ] **Step 1: Write src/providers/ollama.ts**

```typescript
import { AIProvider, ProviderError } from "./base";

export class OllamaProvider implements AIProvider {
  name = "ollama";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || "http://localhost:11434";
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error("Failed to fetch Ollama models");
      const data = await res.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (err: any) {
      throw new ProviderError("Ollama not running at " + this.baseUrl, "network");
    }
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: { temperature: 0.3 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 404) {
          throw new ProviderError(`Ollama model "${model}" not found`, "unknown");
        }
        throw new ProviderError(`Ollama error: ${res.statusText}`, "unknown");
      }

      const data = await res.json();
      return data.response || "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Ollama request timed out after 10s", "timeout");
      }
      if (err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
        throw new ProviderError("Ollama not running at " + this.baseUrl, "network");
      }
      throw new ProviderError(err.message || "Ollama request failed", "unknown");
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/providers/ollama.ts
git commit -m "feat: add Ollama provider adapter"
```

---

### Task 7: Create Skill Runner

**Files:**
- Create: `src/lib/skill-runner.ts`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Write src/lib/utils.ts**

```typescript
import fs from "fs";
import path from "path";

export function readSkillMarkdown(skillPath: string): string {
  const fullPath = path.join(process.cwd(), "src", "skills", skillPath, "skill.md");
  return fs.readFileSync(fullPath, "utf-8");
}
```

- [ ] **Step 2: Write src/lib/skill-runner.ts**

```typescript
import { AIProvider } from "@/providers/base";
import { readSkillMarkdown } from "./utils";

export interface SkillResult<T = unknown> {
  data?: T;
  error?: string;
}

export async function runSkill<T>(
  skillName: string,
  userPrompt: string,
  provider: AIProvider,
  model: string
): Promise<SkillResult<T>> {
  try {
    const systemPrompt = readSkillMarkdown(skillName);
    const raw = await provider.send(systemPrompt, userPrompt, model);

    // Extract JSON from markdown code fences if present
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : raw;

    const data = JSON.parse(jsonString) as T;
    return { data };
  } catch (err: any) {
    return { error: err.message || "Skill execution failed" };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts src/lib/skill-runner.ts
git commit -m "feat: add skill runner and markdown reader"
```

---

### Task 8: Create classify-enquiry Skill

**Files:**
- Create: `src/skills/classify-enquiry/skill.md`
- Create: `src/skills/classify-enquiry/index.ts`

- [ ] **Step 1: Write src/skills/classify-enquiry/skill.md**

```markdown
# classify-enquiry

You are an expert enquiry classifier for a strata management consulting firm.

Your task: Read the client enquiry below and classify it into exactly one category.

## Categories

- `new_client` — Person is interested in becoming a client or wants a quote/assessment.
- `support_request` — Existing client needs help with a service, account, or technical issue.
- `complaint` — Person is dissatisfied and wants to escalate a problem.
- `general_question` — Simple information request that does not fit above.
- `needs_clarification` — The enquiry is too vague, nonsensical, or missing key details.

## Output Format

Return **only** a JSON object with this exact shape. No markdown, no explanation.

```json
{
  "type": "new_client",
  "confidence": 0.92,
  "reasoning": "The user asks about pricing and wants to book a consultation, which signals a new-client intent."
}
```

- `confidence` must be a float between 0.0 and 1.0. Use your calibration: 0.9+ means you are very sure, 0.7-0.9 means reasonably sure, below 0.7 means uncertain.
- `reasoning` must be one concise sentence explaining why you chose this type.
```

- [ ] **Step 2: Write src/skills/classify-enquiry/index.ts**

```typescript
import { runSkill } from "@/lib/skill-runner";
import { AIProvider } from "@/providers/base";

export interface ClassificationResult {
  type: "new_client" | "support_request" | "complaint" | "general_question" | "needs_clarification";
  confidence: number;
  reasoning: string;
}

export async function classifyEnquiry(
  enquiry: string,
  provider: AIProvider,
  model: string
) {
  return runSkill<ClassificationResult>("classify-enquiry", enquiry, provider, model);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/skills/classify-enquiry/
git commit -m "feat: add classify-enquiry skill with markdown prompt"
```

---

### Task 9: Create route-enquiry Skill

**Files:**
- Create: `src/skills/route-enquiry/skill.md`
- Create: `src/skills/route-enquiry/index.ts`

- [ ] **Step 1: Write src/skills/route-enquiry/skill.md**

```markdown
# route-enquiry

You are a routing assistant for a strata management consulting firm.

Your task: Given the classification of a client enquiry, determine the correct internal team and priority.

## Team Rules

- `new_client` → Sales team
- `support_request` → Technical Support team
- `complaint` → Complaints team
- `general_question` → General team
- `needs_clarification` → General team (but note: this should rarely reach you; the orchestrator skips routing for unclear enquiries)

## Priority Rules

- `complaint` → high
- `support_request` involving "urgent", "down", "broken", "critical" → high
- `new_client` → medium
- `general_question` → low
- Everything else → medium

## Output Format

Return **only** a JSON object with this exact shape. No markdown, no explanation.

```json
{
  "team": "Sales",
  "priority": "medium"
}
```

- `team` must be one of: Sales, Technical Support, Complaints, General.
- `priority` must be one of: low, medium, high.
```

- [ ] **Step 2: Write src/skills/route-enquiry/index.ts**

```typescript
import { runSkill } from "@/lib/skill-runner";
import { AIProvider } from "@/providers/base";

export interface RoutingResult {
  team: "Sales" | "Technical Support" | "Complaints" | "General";
  priority: "low" | "medium" | "high";
}

export async function routeEnquiry(
  classification: string,
  enquiry: string,
  provider: AIProvider,
  model: string
) {
  const prompt = `Classification: ${classification}\n\nEnquiry:\n${enquiry}`;
  return runSkill<RoutingResult>("route-enquiry", prompt, provider, model);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/skills/route-enquiry/
git commit -m "feat: add route-enquiry skill with markdown prompt"
```

---

### Task 10: Create generate-response Skill

**Files:**
- Create: `src/skills/generate-response/skill.md`
- Create: `src/skills/generate-response/index.ts`

- [ ] **Step 1: Write src/skills/generate-response/skill.md**

```markdown
# generate-response

You are a professional client communications assistant for a strata management consulting firm.

Your task: Draft a suggested response and recommended action for a staff member, based on the client enquiry and its classification.

## Tone Guidelines

- Professional, empathetic, concise.
- Never make promises you cannot keep (e.g., exact timelines, refunds).
- For complaints: acknowledge frustration, apologize sincerely, offer next steps.
- For support requests: reassure the client, request any missing details politely.
- For new clients: enthusiastic, outline clear next steps.
- For general questions: direct, helpful, invite further questions.
- For needs_clarification: draft a polite follow-up asking for specific missing details.

## Output Format

Return **only** a JSON object with this exact shape. No markdown, no explanation.

```json
{
  "draft": "Dear [Name], thank you for reaching out...",
  "recommended_action": "Follow up within 24 hours with a detailed quote."
}
```

- `draft` must be the full email/message text, ready to send or edit.
- `recommended_action` must be one concise sentence telling the staff member what to do next.
```

- [ ] **Step 2: Write src/skills/generate-response/index.ts**

```typescript
import { runSkill } from "@/lib/skill-runner";
import { AIProvider } from "@/providers/base";

export interface ResponseResult {
  draft: string;
  recommended_action: string;
}

export async function generateResponse(
  classification: string,
  enquiry: string,
  provider: AIProvider,
  model: string
) {
  const prompt = `Classification: ${classification}\n\nEnquiry:\n${enquiry}`;
  return runSkill<ResponseResult>("generate-response", prompt, provider, model);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/skills/generate-response/
git commit -m "feat: add generate-response skill with markdown prompt"
```

---

### Task 11: Create Orchestrator API Route

**Files:**
- Create: `pages/api/process.ts`

- [ ] **Step 1: Write pages/api/process.ts**

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { createProvider } from "@/providers/factory";
import { classifyEnquiry, ClassificationResult } from "@/skills/classify-enquiry";
import { routeEnquiry, RoutingResult } from "@/skills/route-enquiry";
import { generateResponse, ResponseResult } from "@/skills/generate-response";
import { ProviderError } from "@/providers/base";

interface ProcessRequestBody {
  enquiry: string;
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface ProcessResponse {
  classification?: ClassificationResult;
  routing?: RoutingResult;
  response?: ResponseResult;
  flags: {
    needs_review: boolean;
    reason: string | null;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      flags: { needs_review: false, reason: null },
      error: "Method not allowed",
    });
  }

  const { enquiry, providerType, model, apiKey, baseUrl } = req.body as ProcessRequestBody;

  if (!enquiry || !providerType || !model) {
    return res.status(400).json({
      flags: { needs_review: false, reason: null },
      error: "Missing required fields: enquiry, providerType, model",
    });
  }

  try {
    const provider = createProvider({ type: providerType, apiKey, baseUrl });

    // Step 1: Classify
    const classifyRes = await classifyEnquiry(enquiry, provider, model);
    if (classifyRes.error || !classifyRes.data) {
      return res.status(500).json({
        flags: { needs_review: true, reason: "Classification failed: " + classifyRes.error },
        error: classifyRes.error,
      });
    }

    const classification = classifyRes.data;
    const needsReview = classification.confidence < 0.7 || classification.type === "needs_clarification";

    // Step 2: Conditional downstream skills
    let routing: RoutingResult | undefined;
    let response: ResponseResult | undefined;

    if (!needsReview) {
      if (classification.type !== "general_question") {
        const routeRes = await routeEnquiry(classification.type, enquiry, provider, model);
        if (routeRes.data) routing = routeRes.data;
      }

      const responseRes = await generateResponse(classification.type, enquiry, provider, model);
      if (responseRes.data) response = responseRes.data;
    }

    return res.status(200).json({
      classification,
      routing,
      response,
      flags: {
        needs_review: needsReview,
        reason: needsReview
          ? classification.confidence < 0.7
            ? "Low confidence classification"
            : "Enquiry needs clarification"
          : null,
      },
    });
  } catch (err: any) {
    const message = err instanceof ProviderError ? err.message : "Internal server error";
    return res.status(500).json({
      flags: { needs_review: true, reason: message },
      error: message,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add pages/api/process.ts
git commit -m "feat: add orchestrator API route with hybrid skill execution"
```

---

### Task 12: Create Dashboard Components — Layout + Input

**Files:**
- Create: `src/components/EnquiryInput.tsx`

- [ ] **Step 1: Write src/components/EnquiryInput.tsx**

```typescript
import React from "react";

interface EnquiryInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const SAMPLES = [
  "I am interested in your strata management services. Can we book a consultation?",
  "I am very unhappy with the slow response from your support team. This is unacceptable.",
  "What are your pricing options for small buildings?",
];

export default function EnquiryInput({ value, onChange, onSubmit, loading }: EnquiryInputProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">Client Enquiry</label>
      <textarea
        className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        placeholder="Paste a client enquiry here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(s)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
            >
              Sample {i + 1}
            </button>
          ))}
        </div>
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : "Process Enquiry"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EnquiryInput.tsx
git commit -m "feat: add EnquiryInput component with sample buttons"
```

---

### Task 13: Create Result Cards

**Files:**
- Create: `src/components/ClassificationCard.tsx`
- Create: `src/components/RoutingCard.tsx`
- Create: `src/components/ResponseCard.tsx`

- [ ] **Step 1: Write src/components/ClassificationCard.tsx**

```typescript
import React from "react";
import { ClassificationResult } from "@/skills/classify-enquiry";

const TYPE_COLORS: Record<string, string> = {
  new_client: "bg-green-100 text-green-800",
  support_request: "bg-blue-100 text-blue-800",
  complaint: "bg-red-100 text-red-800",
  general_question: "bg-purple-100 text-purple-800",
  needs_clarification: "bg-yellow-100 text-yellow-800",
};

interface Props {
  data: ClassificationResult;
}

export default function ClassificationCard({ data }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Classification</h3>
      <div className="flex items-center gap-3 mb-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[data.type] || "bg-gray-100"}`}>
          {data.type.replace(/_/g, " ")}
        </span>
        <span className="text-sm text-gray-600">Confidence: {(data.confidence * 100).toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${data.confidence >= 0.7 ? "bg-green-500" : "bg-yellow-500"}`}
          style={{ width: `${data.confidence * 100}%` }}
        />
      </div>
      <p className="text-sm text-gray-700">{data.reasoning}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write src/components/RoutingCard.tsx**

```typescript
import React from "react";
import { RoutingResult } from "@/skills/route-enquiry";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

interface Props {
  data: RoutingResult;
}

export default function RoutingCard({ data }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Routing</h3>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-900">{data.team}</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[data.priority]}`}>
          {data.priority} priority
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write src/components/ResponseCard.tsx**

```typescript
import React, { useState } from "react";
import { ResponseResult } from "@/skills/generate-response";

interface Props {
  data: ResponseResult;
  onRegenerate?: () => void;
}

export default function ResponseCard({ data, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Suggested Response</h3>
      <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-64 overflow-y-auto mb-3">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{data.draft}</p>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        <span className="font-semibold">Recommended action:</span> {data.recommended_action}
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
          >
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ClassificationCard.tsx src/components/RoutingCard.tsx src/components/ResponseCard.tsx
git commit -m "feat: add result cards for classification, routing, and response"
```

---

### Task 14: Create Settings Panel + Results Panel

**Files:**
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/ResultsPanel.tsx`

- [ ] **Step 1: Write src/components/SettingsPanel.tsx**

```typescript
import React, { useState, useEffect } from "react";

export interface Settings {
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey: string;
  baseUrl: string;
}

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  anthropic: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
  google: ["gemini-1.5-flash", "gemini-1.5-pro"],
  ollama: ["llama3.2", "llama3.1", "mistral"],
};

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  const [local, setLocal] = useState(settings);
  const [models, setModels] = useState<string[]>(PROVIDER_MODELS[settings.providerType]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    setModels(PROVIDER_MODELS[local.providerType]);
    setLocal((prev) => ({ ...prev, model: PROVIDER_MODELS[local.providerType][0] }));
  }, [local.providerType]);

  const handleSave = () => {
    onChange(local);
    onClose();
  };

  const fetchModels = async () => {
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: local.providerType,
          apiKey: local.apiKey,
          baseUrl: local.baseUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.models) {
        setModels(data.models);
      } else {
        setFetchError(data.error || "Failed to fetch models");
      }
    } catch {
      setFetchError("Network error");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">AI Provider Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={local.providerType}
              onChange={(e) => setLocal({ ...local, providerType: e.target.value as Settings["providerType"] })}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <div className="flex gap-2">
              <select
                className="flex-1 border border-gray-300 rounded-md p-2"
                value={local.model}
                onChange={(e) => setLocal({ ...local, model: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={fetchModels}
                disabled={fetching}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50"
              >
                {fetching ? "..." : "Fetch"}
              </button>
            </div>
            {fetchError && <p className="text-xs text-red-600 mt-1">{fetchError}</p>}
          </div>
          {local.providerType !== "ollama" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-md p-2"
                value={local.apiKey}
                onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>
          )}
          {local.providerType === "ollama" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2"
                value={local.baseUrl}
                onChange={(e) => setLocal({ ...local, baseUrl: e.target.value })}
                placeholder="http://localhost:11434"
              />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write src/components/ResultsPanel.tsx**

```typescript
import React from "react";
import ClassificationCard from "./ClassificationCard";
import RoutingCard from "./RoutingCard";
import ResponseCard from "./ResponseCard";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
import { ResponseResult } from "@/skills/generate-response";

interface Props {
  classification?: ClassificationResult;
  routing?: RoutingResult;
  response?: ResponseResult;
  flags: { needs_review: boolean; reason: string | null };
  error?: string;
  onRegenerate?: () => void;
}

export default function ResultsPanel({ classification, routing, response, flags, error, onRegenerate }: Props) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
      {flags.needs_review && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 font-medium">Needs Human Review</p>
          <p className="text-xs text-yellow-700 mt-1">{flags.reason}</p>
        </div>
      )}
      {classification && <ClassificationCard data={classification} />}
      {routing && <RoutingCard data={routing} />}
      {response && <ResponseCard data={response} onRegenerate={onRegenerate} />}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsPanel.tsx src/components/ResultsPanel.tsx
git commit -m "feat: add settings panel and results panel components"
```

---

### Task 15: Create Main Page + Models API

**Files:**
- Create: `pages/index.tsx`
- Create: `pages/api/models.ts`

- [ ] **Step 1: Write pages/api/models.ts**

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { createProvider } from "@/providers/factory";

interface ModelsResponse {
  models?: string[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModelsResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { providerType, apiKey, baseUrl } = req.body;

  try {
    const provider = createProvider({ type: providerType, apiKey, baseUrl });
    const models = await provider.listModels();
    return res.status(200).json({ models });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list models" });
  }
}
```

- [ ] **Step 2: Write pages/index.tsx**

```typescript
import React, { useState } from "react";
import EnquiryInput from "@/components/EnquiryInput";
import ResultsPanel from "@/components/ResultsPanel";
import SettingsPanel, { Settings } from "@/components/SettingsPanel";
import { ClassificationResult } from "@/skills/classify-enquiry";
import { RoutingResult } from "@/skills/route-enquiry";
import { ResponseResult } from "@/skills/generate-response";

interface ProcessResponse {
  classification?: ClassificationResult;
  routing?: RoutingResult;
  response?: ResponseResult;
  flags: { needs_review: boolean; reason: string | null };
  error?: string;
}

export default function Home() {
  const [enquiry, setEnquiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    providerType: "openai",
    model: "gpt-4o-mini",
    apiKey: "",
    baseUrl: "http://localhost:11434",
  });

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiry,
          providerType: settings.providerType,
          model: settings.model,
          apiKey: settings.apiKey || undefined,
          baseUrl: settings.baseUrl || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        flags: { needs_review: true, reason: "Network error" },
        error: "Failed to connect to the server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Enquiry Processor</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
          >
            Settings
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <EnquiryInput
              value={enquiry}
              onChange={setEnquiry}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </div>
          <div>
            {result ? (
              <ResultsPanel
                classification={result.classification}
                routing={result.routing}
                response={result.response}
                flags={result.flags}
                error={result.error}
                onRegenerate={handleSubmit}
              />
            ) : (
              <div className="text-center text-gray-400 py-20">
                <p className="text-lg">Results will appear here</p>
                <p className="text-sm mt-1">Enter an enquiry and click Process</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add pages/index.tsx pages/api/models.ts
git commit -m "feat: add main dashboard page and models API"
```

---

### Task 16: Add Environment Example + README

**Files:**
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Write .env.example**

```
# AI Provider API Keys (optional — can also be set via dashboard UI)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# Ollama runs locally by default; no key needed
# OLLAMA_BASE_URL=http://localhost:11434
```

- [ ] **Step 2: Write README.md**

```markdown
# Enquiry Processor MVP

A small, working AI-powered tool that processes incoming client enquiries for Strata Management Consultants. Built as Part 1 of a practical assessment.

## What It Does

1. Accepts a client enquiry (text input via web dashboard).
2. Uses an AI model to classify the enquiry type (new client, support, complaint, general, or needs clarification).
3. Generates a confidence score for the classification.
4. Routes the enquiry to the appropriate internal team with a priority level.
5. Drafts a suggested response and recommended action for the staff member.
6. Flags low-confidence or unclear enquiries for human review.

## Architecture

- **Hybrid Orchestrator:** The API always classifies first. Code (not the AI) decides whether to run routing and response generation based on confidence and classification.
- **Provider-Agnostic Adapter:** Supports OpenAI, Anthropic Claude, Google Gemini, and local Ollama models. Swap providers and models dynamically from the dashboard.
- **Skill-as-Markdown:** Each AI task (classify, route, generate response) has its own `skill.md` instruction file. The skill runner reads this at runtime and passes it as the system prompt.

## Tech Stack

- Next.js 15 (Pages Router)
- React + TypeScript
- Tailwind CSS
- OpenAI / Anthropic / Google / Ollama SDKs

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional)

Copy `.env.example` to `.env` and add your API keys. You can also set keys directly in the dashboard UI.

```bash
cp .env.example .env
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Set up your AI provider

Click **Settings** in the top right, choose your provider and model, and enter your API key (not needed for Ollama).

### Using Ollama (Local)

1. Install Ollama: https://ollama.com
2. Pull a model: `ollama pull llama3.2`
3. Select **Ollama** in Settings with model `llama3.2`.

## Design Decisions

- **Next.js full-stack:** Single project for frontend and API. No separate backend needed.
- **No database:** All state is ephemeral. Keeps the MVP simple and easy to run.
- **Skill markdown prompts:** Prompts are externalized to `.md` files so they can be tuned without touching code.
- **10-second timeouts:** Prevents hanging requests when a provider is slow or offline.
- **Conditional downstream skills:** Routing and response generation are skipped if classification confidence is low or the enquiry needs clarification. This avoids wasting tokens and reduces the risk of bad automated responses.

## Bonus Features

- Confidence scoring with visual progress bar
- Prompt engineering with structured JSON output constraints
- Error handling for timeouts, invalid keys, and provider outages
- Automation-ready JSON API (`/api/process`) for integration with email webhooks, CRMs, or task queues
- Sample enquiry buttons for quick testing
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: add README and environment example"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Every section of the design spec has a corresponding task.
- [x] **Placeholder scan:** No TBD, TODO, or vague steps. Every step has exact code and commands.
- [x] **Type consistency:** `AIProvider` interface, `ProviderConfig`, skill result types, and orchestrator types are consistent across all tasks.

**No gaps found. Plan is ready for execution.**
