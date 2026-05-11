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

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { providerType, apiKey, baseUrl } = body;

  if (typeof providerType !== "string") {
    return res.status(400).json({ error: "providerType must be a string" });
  }
  if (apiKey !== undefined && typeof apiKey !== "string") {
    return res.status(400).json({ error: "apiKey must be a string" });
  }
  if (baseUrl !== undefined && typeof baseUrl !== "string") {
    return res.status(400).json({ error: "baseUrl must be a string" });
  }

  const validProviders = ["openai", "anthropic", "google", "ollama"];
  if (!validProviders.includes(providerType)) {
    return res.status(400).json({ error: "Invalid provider type" });
  }

  try {
    const provider = createProvider({ type: providerType as "openai" | "anthropic" | "google" | "ollama", apiKey, baseUrl });
    const models = await provider.listModels();
    return res.status(200).json({ models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list models";
    return res.status(500).json({ error: message });
  }
}
