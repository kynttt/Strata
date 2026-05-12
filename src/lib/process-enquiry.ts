import { createProvider } from "@/providers/factory";
import { classifyEnquiry, ClassificationResult } from "@/skills/classify-enquiry";
import { routeEnquiry, RoutingResult } from "@/skills/route-enquiry";
import { generateResponse, ResponseResult } from "@/skills/generate-response";
import { ProviderError } from "@/providers/base";

export interface AIConfig {
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ProcessResult {
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

export async function processEnquiry(
  enquiry: string,
  config: AIConfig
): Promise<ProcessResult> {
  const { providerType, model, apiKey, baseUrl } = config;

  try {
    const provider = createProvider({ type: providerType, apiKey, baseUrl });

    const classifyRes = await classifyEnquiry(enquiry, provider, model);
    if (classifyRes.error || !classifyRes.data) {
      return {
        flags: { needs_review: true, reason: "Classification failed: " + classifyRes.error },
        error: classifyRes.error,
      };
    }

    const classification = classifyRes.data;
    const needsReview =
      classification.confidence < 0.7 || classification.type === "needs_clarification";

    let routing: RoutingResult | undefined;
    let response: ResponseResult | undefined;
    let routingError: string | undefined;
    let responseError: string | undefined;

    const routeRes = await routeEnquiry(classification.type, enquiry, provider, model);
    if (routeRes.data) {
      routing = routeRes.data;
    } else if (routeRes.error) {
      routingError = routeRes.error;
    }

    const responseRes = await generateResponse(classification.type, enquiry, provider, model);
    if (responseRes.data) {
      response = responseRes.data;
    } else if (responseRes.error) {
      responseError = responseRes.error;
    }

    return {
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
    };
  } catch (err: unknown) {
    const message = err instanceof ProviderError ? err.message : "Internal server error";
    return {
      flags: { needs_review: true, reason: message },
      error: message,
    };
  }
}
