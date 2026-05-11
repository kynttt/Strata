import OpenAI from "openai";
import { AIProvider, ProviderError } from "./base";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }

  async listModels(): Promise<string[]> {
    const list = await this.client.models.list();
    return list.data.map((m) => m.id);
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await this.client.chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return response.choices[0]?.message?.content || "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("OpenAI request timed out after 10s", "timeout");
      }
      if (err.status === 401) {
        throw new ProviderError("Invalid OpenAI API key", "auth");
      }
      if (err.status >= 500 || err.code === "ECONNREFUSED") {
        throw new ProviderError("OpenAI service unavailable", "network");
      }
      throw new ProviderError(err.message || "OpenAI request failed", "unknown");
    }
  }
}
