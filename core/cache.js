import fs from "node:fs";

const CACHE_MAX_KEYS = parseInt(process.env.CACHE_MAX_KEYS || "1000", 10);

/**
 * LRU in-memory store backed by a Map (insertion-order iteration for eviction).
 * @type {Map<string, {type: string, data: any, expiry: number}>}
 */
const lruMap = new Map();

let redisClient = null;
let isRedisConnected = false;

const rawCacheMode = (process.env.CACHE_MODE || "").toLowerCase().trim();
const CACHE_MODE = rawCacheMode || (process.env.REDIS_HOST ? "redis" : "memory");
const isRedisMode = CACHE_MODE === "redis";
const isMemoryMode = CACHE_MODE === "memory" || CACHE_MODE === "inmemory";
const isNoneMode =
  CACHE_MODE === "none" ||
  CACHE_MODE === "disabled" ||
  CACHE_MODE === "false";

const redisHost = process.env.REDIS_HOST ?? false;
const redisPort = process.env.REDIS_PORT ?? 6379;
const redisPassword = process.env.REDIS_PASSWORD || "";
const redisUrl = redisPassword
  ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
  : `redis://${redisHost}:${redisPort}`;

/**
 * Evicts the oldest entry from the LRU map when the cap is reached.
 */
function evictIfNeeded() {
  if (lruMap.size >= CACHE_MAX_KEYS) {
    const oldestKey = lruMap.keys().next().value;
    if (oldestKey !== undefined) lruMap.delete(oldestKey);
  }
}

/**
 * Initializes the Redis client connection.
 * @returns {Promise<void>}
 */
async function initRedis() {
  if (!isRedisMode || !redisHost || redisClient) return;

  try {
    const { createClient } = await import("redis");
    let host = redisHost;
    if (host === "localhost" && fs.existsSync("/.dockerenv")) {
      host = "redis";
    }
    const url = redisPassword
      ? `redis://:${redisPassword}@${host}:${redisPort}`
      : `redis://${host}:${redisPort}`;

    redisClient = createClient({ url });
    redisClient.on("error", () => { isRedisConnected = false; });
    redisClient.on("ready", () => { isRedisConnected = true; });
    redisClient.on("connect", () => { isRedisConnected = true; });
    await redisClient.connect();
    isRedisConnected = true;
  } catch {
    redisClient = null;
    isRedisConnected = false;
  }
}

if (isRedisMode && redisHost) {
  initRedis().catch(() => {});
}

setInterval(() => {
  if (lruMap.size === 0) return;
  const now = Date.now();
  for (const [key, entry] of lruMap) {
    if (entry.expiry <= now) lruMap.delete(key);
  }
}, 300000).unref();

/**
 * High-performance Caching class supporting LRU memory and Redis backends.
 * Configure via CACHE_MODE, CACHE_MAX_KEYS env variables.
 */
class Cache {
  /**
   * Express middleware to cache route JSON and HTML responses.
   * Skips caching for non-GET requests automatically.
   * @param {number} [seconds=60] - Expiry time in seconds.
   * @param {Object} [options={}] - Override options.
   * @param {"memory"|"redis"} [options.driver] - Force a specific driver for this route.
   * @returns {Function} Express middleware.
   */
  static middleware(seconds = 60, options = {}) {
    return async (req, res, next) => {
      if (isNoneMode || req.method !== "GET") return next();

      const driver = options.driver || null;
      const useRedis = driver === "redis" || (!driver && isRedisMode);
      const key = req.originalUrl;

      if (useRedis && redisHost && !redisClient) {
        await initRedis().catch(() => {});
      }

      if (useRedis && isRedisConnected && redisClient) {
        try {
          const raw = await redisClient.get(key);
          if (raw) {
            const cached = JSON.parse(raw);
            res.set("X-Blue-Bird-Cache", "HIT");
            if (cached.type === "json") return res.json(cached.data);
            res.type("text/html");
            return res.send(cached.data);
          }
        } catch {
          isRedisConnected = false;
        }
      }

      if (!isRedisMode || !isRedisConnected || !redisClient || driver === "memory") {
        const entry = lruMap.get(key);
        if (entry && entry.expiry > Date.now()) {
          lruMap.delete(key);
          lruMap.set(key, entry);
          res.set("X-Blue-Bird-Cache", "HIT");
          if (entry.type === "json") return res.json(entry.data);
          res.type("text/html");
          return res.send(entry.data);
        }
      }

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      let stored = false;

      res.json = async (body) => {
        if (!stored) {
          stored = true;
          const obj = { type: "json", data: body, expiry: Date.now() + seconds * 1000 };
          if (useRedis && isRedisConnected && redisClient) {
            try {
              await redisClient.set(key, JSON.stringify(obj), { EX: seconds });
            } catch {
              evictIfNeeded();
              lruMap.set(key, obj);
            }
          } else {
            evictIfNeeded();
            lruMap.set(key, obj);
          }
        }
        res.set("X-Blue-Bird-Cache", "MISS");
        return originalJson(body);
      };

      res.send = async (body) => {
        if (!stored && typeof body === "string") {
          stored = true;
          const obj = { type: "html", data: body, expiry: Date.now() + seconds * 1000 };
          if (useRedis && isRedisConnected && redisClient) {
            try {
              await redisClient.set(key, JSON.stringify(obj), { EX: seconds });
            } catch {
              evictIfNeeded();
              lruMap.set(key, obj);
            }
          } else {
            evictIfNeeded();
            lruMap.set(key, obj);
          }
        }
        res.set("X-Blue-Bird-Cache", "MISS");
        return originalSend(body);
      };

      res.set("X-Blue-Bird-Cache", "MISS");
      next();
    };
  }

  /**
   * Retrieves a cached value by key.
   * @param {string} key - Cache key.
   * @param {Object} [options={}] - Override options.
   * @param {"memory"|"redis"} [options.driver] - Force a specific driver.
   * @returns {Promise<any|null>} Cached payload or null.
   */
  static async get(key, options = {}) {
    if (isNoneMode) return null;
    key = key.trim();
    if (!key) return null;

    const driver = options.driver || null;
    const useRedis = driver === "redis" || (!driver && isRedisMode);

    if (useRedis && redisHost && !redisClient) {
      await initRedis().catch(() => {});
    }

    if (useRedis && isRedisConnected && redisClient) {
      try {
        const raw = await redisClient.get(key);
        if (raw) {
          try {
            const cached = JSON.parse(raw);
            return cached && typeof cached === "object" && "data" in cached ? cached.data : cached;
          } catch {
            return raw;
          }
        }
        return null;
      } catch {
        isRedisConnected = false;
      }
    }

    const entry = lruMap.get(key);
    if (entry) {
      if (entry.expiry > Date.now()) {
        lruMap.delete(key);
        lruMap.set(key, entry);
        return entry.data !== undefined ? entry.data : entry;
      }
      lruMap.delete(key);
    }

    return null;
  }

  /**
   * Stores data in cache with a specified TTL.
   * @param {string} key - Cache key.
   * @param {any} value - Data to cache.
   * @param {number} [seconds=60] - Expiry time in seconds.
   * @param {Object} [options={}] - Override options.
   * @param {"memory"|"redis"} [options.driver] - Force a specific driver.
   * @param {"memory"|"redis"} [options.fallbackDriver] - Fallback driver if primary fails.
   * @returns {Promise<boolean>}
   */
  static async set(key, value, seconds = 60, options = {}) {
    if (isNoneMode) return true;
    key = key.trim();
    if (!key) return false;

    const driver = options.driver || null;
    const fallbackDriver = options.fallbackDriver || "memory";
    const useRedis = driver === "redis" || (!driver && isRedisMode);

    if (useRedis && redisHost && !redisClient) {
      await initRedis().catch(() => {});
    }

    const obj = {
      type: typeof value === "string" ? "html" : "json",
      data: value,
      expiry: Date.now() + seconds * 1000,
    };

    if (useRedis && isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, JSON.stringify(obj), { EX: seconds });
        return true;
      } catch {
        isRedisConnected = false;
        if (fallbackDriver === "memory") {
          evictIfNeeded();
          lruMap.set(key, obj);
        }
      }
    } else {
      evictIfNeeded();
      lruMap.set(key, obj);
    }

    return true;
  }

  /**
   * Deletes one or more entries from cache.
   * @param {string|string[]} keys - Single key or array of keys.
   * @returns {Promise<boolean>}
   */
  static async delete(keys) {
    if (isNoneMode || !keys) return false;
    const keyList = Array.isArray(keys) ? keys : [keys];

    if (isRedisMode && redisHost && !redisClient) {
      await initRedis().catch(() => {});
    }

    for (const key of keyList) {
      lruMap.delete(key);
      if (isRedisMode && isRedisConnected && redisClient) {
        try {
          await redisClient.del(key);
        } catch {
          isRedisConnected = false;
        }
      }
    }

    return true;
  }

  /**
   * Alias for delete.
   * @param {string|string[]} keys
   * @returns {Promise<boolean>}
   */
  static async del(keys) {
    return this.delete(keys);
  }

  /**
   * Flushes all cached entries from memory and optionally Redis.
   * @returns {Promise<boolean>}
   */
  static async clear() {
    lruMap.clear();
    if (isRedisMode && isRedisConnected && redisClient) {
      try {
        await redisClient.flushDb();
      } catch {
        isRedisConnected = false;
      }
    }
    return true;
  }

  /**
   * Returns the active cache mode.
   * @returns {"redis"|"memory"|"none"}
   */
  static getMode() {
    return CACHE_MODE;
  }

  /**
   * Returns the current in-memory entry count.
   * @returns {number}
   */
  static size() {
    return lruMap.size;
  }
}

/**
 * Returns the active Redis client if connected, otherwise null.
 * @returns {import("redis").RedisClientType|null}
 */
export function getRedisClient() {
  return isRedisMode && isRedisConnected ? redisClient : null;
}

export default Cache;
