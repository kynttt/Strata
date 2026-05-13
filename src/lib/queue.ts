import { processEnquiry } from "./process-enquiry";

interface JobData {
  itemId: string;
  enquiry: string;
  providerType: "openai" | "anthropic" | "google" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface Job {
  id: string;
  name: string;
  data: JobData;
  state: "waiting" | "active" | "completed" | "failed";
  returnvalue?: { itemId: string; result: ReturnType<typeof processEnquiry> extends Promise<infer R> ? R : never };
  failedReason?: string;
  attemptsMade: number;
  opts: { attempts: number; backoff: { type: string; delay: number } };
}

class MemoryQueue {
  private jobs = new Map<string, Job>();
  private waiting: string[] = [];
  private activeCount = 0;
  private counter = 0;
  private concurrency: number;

  constructor(options: { concurrency?: number } = {}) {
    this.concurrency = options.concurrency ?? 2;
  }

  async add(
    name: string,
    data: JobData,
    opts: { attempts?: number; backoff?: { type?: string; delay?: number } } = {}
  ) {
    const id = `mem-${++this.counter}-${Date.now()}`;
    const job: Job = {
      id,
      name,
      data,
      state: "waiting",
      attemptsMade: 0,
      opts: {
        attempts: opts.attempts ?? 3,
        backoff: {
          type: opts.backoff?.type ?? "exponential",
          delay: opts.backoff?.delay ?? 2000,
        },
      },
    };
    this.jobs.set(id, job);
    this.waiting.push(id);
    this.processNext();
    return this.wrapJob(job);
  }

  private async processNext() {
    if (this.activeCount >= this.concurrency || this.waiting.length === 0) return;

    const id = this.waiting.shift()!;
    const job = this.jobs.get(id)!;
    job.state = "active";
    this.activeCount++;

    try {
      const result = await processEnquiry(job.data.enquiry, {
        providerType: job.data.providerType,
        model: job.data.model,
        apiKey: job.data.apiKey,
        baseUrl: job.data.baseUrl,
      });

      job.returnvalue = { itemId: job.data.itemId, result };
      job.state = "completed";
    } catch (err: unknown) {
      job.attemptsMade++;
      if (job.attemptsMade < job.opts.attempts) {
        job.state = "waiting";
        const delay = job.opts.backoff.delay * Math.pow(2, job.attemptsMade - 1);
        setTimeout(() => {
          this.waiting.push(id);
          this.processNext();
        }, delay);
      } else {
        job.state = "failed";
        job.failedReason = err instanceof Error ? err.message : "Unknown error";
      }
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private wrapJob(job: Job) {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      getState: async () => job.state,
    };
  }

  async getJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return null;
    return this.wrapJob(job);
  }
}

const globalForQueue = globalThis as unknown as { __enquiryQueue?: MemoryQueue };
export const enquiryQueue = globalForQueue.__enquiryQueue ?? new MemoryQueue({ concurrency: 2 });
if (process.env.NODE_ENV !== "production") {
  globalForQueue.__enquiryQueue = enquiryQueue;
}

export interface EnquiryJobData extends JobData {}

export async function addEnquiryJob(data: JobData) {
  return enquiryQueue.add(`enquiry-${data.itemId}`, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function getJobStatus(jobId: string) {
  const job = await enquiryQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id,
    state,
    data: job.data as EnquiryJobData,
    result: job.returnvalue as { itemId: string; result: import("./process-enquiry").ProcessResult } | undefined,
    failedReason: job.failedReason,
  };
}
