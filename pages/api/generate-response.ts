import type { NextApiRequest, NextApiResponse } from "next";
import { createProvider } from "@/providers/factory";
import { generateResponse, ResponseResult } from "@/skills/generate-response";

interface GenerateRequestBody {
  enquiry: string;
  classification: string;
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface GenerateResponseBody {
  response?: ResponseResult;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponseBody>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { enquiry, classification, providerType, model, apiKey, baseUrl } =
    body as GenerateRequestBody;

  if (
    !enquiry ||
    typeof enquiry !== "string" ||
    !classification ||
    typeof classification !== "string" ||
    !providerType ||
    !model ||
    typeof model !== "string"
  ) {
    return res.status(400).json({
      error: "Missing required fields: enquiry, classification, providerType, model",
    });
  }

  const validProviders = ["openai", "anthropic", "google", "ollama"];
  if (!validProviders.includes(providerType)) {
    return res.status(400).json({
      error: "Invalid providerType. Must be one of: " + validProviders.join(", "),
    });
  }

  try {
    const provider = createProvider({ type: providerType, apiKey, baseUrl });
    const result = await generateResponse(classification, enquiry, provider, model);

    if (result.error || !result.data) {
      return res.status(500).json({
        error: result.error || "Failed to generate response",
      });
    }

    return res.status(200).json({ response: result.data });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}
