import type { NextApiRequest, NextApiResponse } from "next";
import { getJobStatus } from "@/lib/queue";

interface StatusRequest {
  jobIds: (string | number)[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobIds } = req.body as StatusRequest;

  if (!jobIds || !Array.isArray(jobIds)) {
    return res.status(400).json({ error: "No jobIds provided" });
  }

  try {
    const statuses = await Promise.all(
      jobIds.map((id) => getJobStatus(String(id)))
    );

    return res.status(200).json({ statuses: statuses.filter(Boolean) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch job status";
    return res.status(500).json({ error: message });
  }
}
