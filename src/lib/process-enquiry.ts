import { createProvider } from "@/providers/factory";
import { classifyEnquiry, ClassificationResult } from "@/skills/classify-enquiry";
import { routeEnquiry, RoutingResult } from "@/skills/route-enquiry";
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
  flags: {
    needs_review: boolean;
    reason: string | null;
  };
  error?: string;
  routingError?: string;
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
    let routingError: string | undefined;

    const routeRes = await routeEnquiry(classification.type, enquiry, provider, model);
    if (routeRes.data) {
      routing = routeRes.data;
    } else if (routeRes.error) {
      routingError = routeRes.error;
    }

    return {
      classification,
      routing,
      flags: {
        needs_review: needsReview,
        reason: needsReview
          ? classification.confidence < 0.7
            ? "Low confidence classification"
            : "Enquiry needs clarification"
          : null,
      },
      routingError,
    };
  } catch (err: unknown) {
    const message = err instanceof ProviderError ? err.message : "Internal server error";
    return {
      flags: { needs_review: true, reason: message },
      error: message,
    };
  }
}
