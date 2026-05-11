import { AIProvider } from "@/providers/base";
import { readSkillMarkdown } from "./skill-utils";

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
  let systemPrompt: string;
  try {
    systemPrompt = readSkillMarkdown(skillName);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to read skill instructions";
    return { error: message };
  }

  let raw: string;
  try {
    raw = await provider.send(systemPrompt, userPrompt, model);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI provider request failed";
    return { error: message };
  }

  try {
    const data = parseJsonFromResponse<T>(raw);
    return { data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse AI response";
    return { error: message };
  }
}

function parseJsonFromResponse<T>(raw: string): T {
  // 1. Try markdown code fences first
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    const cleaned = cleanJson(fenceMatch[1].trim());
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // fall through to broader extraction
    }
  }

  // 2. Find the first JSON object or array by brace/bracket matching
  const firstBrace = raw.indexOf("{");
  const firstBracket = raw.indexOf("[");
  let start = -1;
  let endChar = "";
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    endChar = "}";
  } else if (firstBracket !== -1) {
    start = firstBracket;
    endChar = "]";
  }

  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === endChar) {
          if (depth === 0) {
            const candidate = raw.slice(start, i + 1);
            const cleaned = cleanJson(candidate);
            try {
              return JSON.parse(cleaned) as T;
            } catch {
              break;
            }
          }
        } else if (ch === (endChar === "}" ? "{" : "[")) {
          depth++;
        }
      }
    }
  }

  // 3. Last resort: clean and parse the whole string
  const cleaned = cleanJson(raw.trim());
  return JSON.parse(cleaned) as T;
}

function cleanJson(input: string): string {
  return input
    // Remove trailing commas before closing braces/brackets
    .replace(/,\s*([}\]])/g, "$1")
    // Remove BOM and control chars
    .replace(/^﻿/, "");
}
