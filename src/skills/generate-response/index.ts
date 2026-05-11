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
