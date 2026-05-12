import type { NextApiRequest, NextApiResponse } from "next";
import { addEnquiryJob } from "@/lib/queue";

interface BatchItem {
  id: string;
  snippet: string;
}

interface BatchRequest {
  items: BatchItem[];
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface BatchResponse {
  jobIds: (string | number | undefined)[];
  count: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BatchResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items, providerType, model, apiKey, baseUrl } = req.body as BatchRequest;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No items provided" });
  }

  try {
    const jobs = await Promise.all(
      items.map((item) =>
        addEnquiryJob({
          itemId: item.id,
          enquiry: item.snippet,
          providerType,
          model,
          apiKey,
          baseUrl,
        })
      )
    );

    return res.status(200).json({
      jobIds: jobs.map((job) => job.id),
      count: jobs.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to enqueue jobs";
    return res.status(500).json({ error: message });
  }
}
