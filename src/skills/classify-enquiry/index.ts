import { runSkill } from "@/lib/skill-runner";
import { AIProvider } from "@/providers/base";

export interface ClassificationResult {
  type: "new_client" | "support_request" | "complaint" | "general_question" | "needs_clarification";
  confidence: number;
  reasoning: string;
  draft: string | null;
}

export async function classifyEnquiry(
  enquiry: string,
  provider: AIProvider,
  model: string
) {
  return runSkill<ClassificationResult>("classify-enquiry", enquiry, provider, model);
}
