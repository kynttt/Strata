export interface AIProvider {
  readonly name: string;
  listModels(): Promise<string[]>;
  send(systemPrompt: string, userPrompt: string, model: string): Promise<string>;
}

export interface ProviderConfig {
  type: "openai" | "anthropic" | "google" | "ollama";
  apiKey?: string;
  baseUrl?: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "timeout" | "auth" | "network" | "unknown"
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
