import { AIProvider, ProviderConfig, ProviderError } from "./base";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import { OllamaProvider } from "./ollama";

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case "openai":
      return new OpenAIProvider(config.apiKey);
    case "anthropic":
      return new AnthropicProvider(config.apiKey);
    case "google":
      return new GoogleProvider(config.apiKey);
    case "ollama":
      return new OllamaProvider(config.baseUrl);
    default:
      throw new ProviderError(`Unknown provider type: ${config.type}`, "unknown");
  }
}
