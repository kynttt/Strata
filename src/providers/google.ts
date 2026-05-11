import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, ProviderError } from "./base";

export class GoogleProvider implements AIProvider {
  name = "google";
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_API_KEY || "");
  }

  async listModels(): Promise<string[]> {
    return ["gemini-1.5-flash", "gemini-1.5-pro"];
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const genModel = this.client.getGenerativeModel({ model });
      const result = await genModel.generateContent(
        {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.3 },
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return result.response.text() || "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Google request timed out after 10s", "timeout");
      }
      if (err.status === 401 || err.message?.includes("API key not valid")) {
        throw new ProviderError("Invalid Google API key", "auth");
      }
      if (err.status >= 500 || err.code === "ECONNREFUSED") {
        throw new ProviderError("Google service unavailable", "network");
      }
      throw new ProviderError(err.message || "Google request failed", "unknown");
    }
  }
}
