import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, ProviderError } from "./base";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  async listModels(): Promise<string[]> {
    return ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"];
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await this.client.messages.create(
        {
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.3,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      const content = response.content[0];
      return content.type === "text" ? content.text : "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Anthropic request timed out after 10s", "timeout");
      }
      if (err.status === 401) {
        throw new ProviderError("Invalid Anthropic API key", "auth");
      }
      if (err.status >= 500 || err.code === "ECONNREFUSED") {
        throw new ProviderError("Anthropic service unavailable", "network");
      }
      throw new ProviderError(err.message || "Anthropic request failed", "unknown");
    }
  }
}
