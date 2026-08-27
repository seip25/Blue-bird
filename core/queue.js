import fs from "node:fs";
import path from "node:path";
import { getRedisClient } from "./cache.js";

/**
 * Lightweight background queue worker module with Redis and in-memory fallback.
 */
class QueueManager {
  constructor() {
    this.handlers = new Map();
    this.memoryQueue = [];
    this.isProcessing = false;
    this.redisPrefix = "bluebird:queue:";
  }

  /**
   * Registers a job handler function.
   * @param {string} jobName - Name of the job.
   * @param {Function} handler - Async function(payload).
   */
  process(jobName, handler) {
    if (typeof handler !== "function") {
      throw new Error(`Handler for job '${jobName}' must be a function.`);
    }
    this.handlers.set(jobName, handler);
  }

  /**
   * Dispatches a new job to the queue.
   * @param {string} jobName - Name of the job.
   * @param {any} payload - Data payload to pass to the handler.
   * @param {object} [options] - Options (e.g. delayMs).
   * @returns {Promise<boolean>}
   */
  async dispatch(jobName, payload = {}, options = {}) {
    const jobItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: jobName,
      payload,
      createdAt: new Date().toISOString(),
    };

    const redis = getRedisClient();
    if (redis && redis.isReady) {
      try {
        await redis.lPush(`${this.redisPrefix}jobs`, JSON.stringify(jobItem));
        return true;
      } catch (err) {
        console.error("[QUEUE ERROR] Failed to dispatch job to Redis:", err.message);
      }
    }

    // In-memory fallback
    if (options.delayMs && options.delayMs > 0) {
      setTimeout(() => {
        this.memoryQueue.push(jobItem);
        this.runMemoryWorker();
      }, options.delayMs);
    } else {
      this.memoryQueue.push(jobItem);
      setImmediate(() => this.runMemoryWorker());
    }

    return true;
  }

  /**
   * Executes in-memory queue jobs sequentially.
   * @private
   */
  async runMemoryWorker() {
    if (this.isProcessing || this.memoryQueue.length === 0) return;
    this.isProcessing = true;

    while (this.memoryQueue.length > 0) {
      const job = this.memoryQueue.shift();
      if (!job) continue;

      const handler = this.handlers.get(job.name);
      if (!handler) {
        console.warn(`[QUEUE WARN] No handler registered for job '${job.name}'.`);
        continue;
      }

      try {
        await handler(job.payload);
      } catch (err) {
        console.error(`[QUEUE ERROR] Error processing job '${job.name}' (${job.id}):`, err);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Auto-loads all job definition files from backend/jobs/.
   */
  async loadJobs(jobsDir = path.resolve(process.cwd(), "backend/jobs")) {
    if (!fs.existsSync(jobsDir)) return;

    const files = fs
      .readdirSync(jobsDir)
      .filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));

    for (const file of files) {
      const fullPath = path.join(jobsDir, file);
      try {
        const module = await import(`file://${fullPath}`);
        if (typeof module.default === "function") {
          const jobName = path.basename(file, path.extname(file));
          this.process(jobName, module.default);
        }
      } catch (err) {
        console.error(`[QUEUE ERROR] Failed to load job file '${file}':`, err.message);
      }
    }
  }
}

export const Queue = new QueueManager();
export default Queue;
