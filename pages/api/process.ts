import type { NextApiRequest, NextApiResponse } from "next";
import { processEnquiry } from "@/lib/process-enquiry";

interface ProcessRequestBody {
  enquiry: string;
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  sender?: string;
  email?: string;
}

interface ProcessResponse {
  classification?: import("@/skills/classify-enquiry").ClassificationResult;
  routing?: import("@/skills/route-enquiry").RoutingResult;
  flags: {
    needs_review: boolean;
    reason: string | null;
  };
  error?: string;
  routingError?: string;
  sender?: string;
  email?: string;
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

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({
      flags: { needs_review: false, reason: null },
      error: "Invalid request body",
    });
  }

  const { enquiry, providerType, model, apiKey, baseUrl, sender, email } = body as ProcessRequestBody;

  if (
    !enquiry ||
    typeof enquiry !== "string" ||
    !providerType ||
    !model ||
    typeof model !== "string"
  ) {
    return res.status(400).json({
      flags: { needs_review: false, reason: null },
      error: "Missing required fields: enquiry, providerType, model",
    });
  }

  const validProviders = ["openai", "anthropic", "google", "ollama"];
  if (!validProviders.includes(providerType)) {
    return res.status(400).json({
      flags: { needs_review: false, reason: null },
      error: "Invalid providerType. Must be one of: " + validProviders.join(", "),
    });
  }

  const result = await processEnquiry(enquiry, {
    providerType,
    model,
    apiKey,
    baseUrl,
  });

  if (result.error) {
    return res.status(500).json({ ...result, sender, email });
  }

  return res.status(200).json({ ...result, sender, email });
}
