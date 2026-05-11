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
