import { Queue } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined
};

let queue: Queue | null = null;

export function getGenerationQueue() {
  queue ||= new Queue("assessment-generation", { connection });
  return queue;
}

export type GenerateJob = {
  assignmentId: string;
  mode: "full" | "section";
  sectionId?: string;
};
