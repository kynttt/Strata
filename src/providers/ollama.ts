import { AIProvider, ProviderError } from "./base";

export class OllamaProvider implements AIProvider {
  name = "ollama";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || "http://localhost:11434";
  }

  async listModels(): Promise<string[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof ProviderError) {
        throw err;
      }
      if (err.name === "AbortError") {
        throw new ProviderError("Ollama list-models request timed out", "timeout");
      }
      if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch failed") || err.message?.includes("connect")) {
        throw new ProviderError("Ollama not running at " + this.baseUrl, "network");
      }
      throw new ProviderError("Ollama list-models failed: " + (err.message || "unknown error"), "unknown");
    }
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          options: { temperature: 0.3 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 404) {
          throw new ProviderError(`Ollama model "${model}" not found`, "unknown");
        }
        throw new ProviderError(`Ollama error: ${res.statusText}`, "unknown");
      }

      const data = await res.json();
      return data.message?.content || "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof ProviderError) {
        throw err;
      }
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Ollama request timed out after 60s — local models can be slow; try a smaller model or check GPU availability", "timeout");
      }
      if (err.cause?.code === "ECONNREFUSED" || err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
        throw new ProviderError("Ollama not running at " + this.baseUrl, "network");
      }
      throw new ProviderError(err.message || "Ollama request failed", "unknown");
    }
  }
}
