import { z } from "zod";

export const providerTypes = ["openai", "anthropic", "google", "ollama"] as const;

export const aiConfigSchema = z
  .object({
    providerType: z.enum(providerTypes),
    model: z.string().min(1, "Model is required"),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.providerType === "ollama") return true;
      return data.apiKey && data.apiKey.length > 0;
    },
    {
      message: "API key is required for this provider",
      path: ["apiKey"],
    }
  )
  .refine(
    (data) => {
      if (data.providerType !== "ollama") return true;
      return data.baseUrl && data.baseUrl.length > 0;
    },
    {
      message: "Base URL is required for Ollama",
      path: ["baseUrl"],
    }
  );

export type AIConfig = z.infer<typeof aiConfigSchema>;
