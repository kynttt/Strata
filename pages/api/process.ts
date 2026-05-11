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
  routingError?: string;
  responseError?: string;
  draft?: string | null;
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

  const { enquiry, providerType, model, apiKey, baseUrl } = body as ProcessRequestBody;

  if (!enquiry || typeof enquiry !== "string" || !providerType || !model || typeof model !== "string") {
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
    let routingError: string | undefined;
    let responseError: string | undefined;

    if (!needsReview) {
      if (classification.type !== "general_question") {
        const routeRes = await routeEnquiry(classification.type, enquiry, provider, model);
        if (routeRes.data) {
          routing = routeRes.data;
        } else if (routeRes.error) {
          routingError = routeRes.error;
        }
      }

      const responseRes = await generateResponse(classification.type, enquiry, provider, model);
      if (responseRes.data) {
        response = responseRes.data;
      } else if (responseRes.error) {
        responseError = responseRes.error;
      }
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
      routingError,
      responseError,
      draft: classification.draft,
    });
  } catch (err: unknown) {
    const message = err instanceof ProviderError ? err.message : "Internal server error";
    return res.status(500).json({
      flags: { needs_review: true, reason: message },
      error: message,
    });
  }
}
