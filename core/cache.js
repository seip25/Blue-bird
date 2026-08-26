import fs from "node:fs";

const CACHE = {};

let redisClient = null;
let isRedisConnected = false;

const rawCacheMode = (process.env.CACHE_MODE || "").toLowerCase().trim();
const CACHE_MODE =
  rawCacheMode || (process.env.REDIS_HOST ? "redis" : "memory");
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
 * Initializes the Redis client connection if CACHE_MODE is 'redis' and REDIS_HOST is configured.
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
    const url = redisUrl;

    redisClient = createClient({ url });
    redisClient.on("error", () => {
      isRedisConnected = false;
    });
    redisClient.on("ready", () => {
      isRedisConnected = true;
    });
    redisClient.on("connect", () => {
      isRedisConnected = true;
    });
    await redisClient.connect();
    isRedisConnected = true;
  } catch (err) {
    redisClient = null;
    isRedisConnected = false;
  }
}

if (isRedisMode && redisHost) {
  initRedis().catch(() => {});
}

// Background cleanup timer for in-memory cache
setInterval(() => {
  const now = Date.now();
  for (const key in CACHE) {
    if (CACHE[key].expiry <= now) {
      delete CACHE[key];
    }
  }
}, 300000).unref();

/**
 * High-performance Caching class supporting both local memory and Redis backends.
 */
class Cache {
  /**
   * Express middleware to cache route JSON and HTML responses.
   * @param {number} [seconds=60] - Expiry time in seconds.
   * @returns {Function} Express middleware.
   */
  static middleware(seconds = 60) {
    return async (req, res, next) => {
      if (isNoneMode) {
        return next();
      }

      const key = req.originalUrl;

      // 1. Redis Cache Lookup (if enabled)
      if (isRedisMode && redisHost && !redisClient) {
        await initRedis().catch(() => {});
      }

      if (isRedisMode && isRedisConnected && redisClient) {
        try {
          const cachedData = await redisClient.get(key);
          if (cachedData) {
            const cached = JSON.parse(cachedData);
            if (cached.type === "json") {
              res.set("X-Blue-Bird-Cache", "HIT");
              return res.json(cached.data);
            } else {
              res.type("text/html");
              res.set("X-Blue-Bird-Cache", "HIT");
              return res.send(cached.data);
            }
          }
        } catch {
          isRedisConnected = false;
        }
      }

      // 2. In-Memory Cache Lookup (memory mode or fallback)
      if (!isRedisMode || !isRedisConnected || !redisClient) {
        if (CACHE[key] && CACHE[key].expiry > Date.now()) {
          const cached = CACHE[key];
          if (cached.type === "json") {
            res.set("X-Blue-Bird-Cache", "HIT");
            return res.json(cached.data);
          } else {
            res.type("text/html");
            res.set("X-Blue-Bird-Cache", "HIT");
            return res.send(cached.data);
          }
        }
      }

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      let cachedInRequest = false;

      res.json = async (body) => {
        if (!cachedInRequest) {
          cachedInRequest = true;
          const cacheObject = {
            type: "json",
            data: body,
            expiry: Date.now() + seconds * 1000,
          };
          if (isRedisMode && isRedisConnected && redisClient) {
            try {
              await redisClient.set(key, JSON.stringify(cacheObject), {
                EX: seconds,
              });
            } catch {
              CACHE[key] = cacheObject;
            }
          } else {
            CACHE[key] = cacheObject;
          }
        }
        res.set("X-Blue-Bird-Cache", "MISS");
        return originalJson(body);
      };

      res.send = async (body) => {
        if (!cachedInRequest && typeof body === "string") {
          cachedInRequest = true;
          const cacheObject = {
            type: "html",
            data: body,
            expiry: Date.now() + seconds * 1000,
          };
          if (isRedisMode && isRedisConnected && redisClient) {
            try {
              await redisClient.set(key, JSON.stringify(cacheObject), {
                EX: seconds,
              });
            } catch {
              CACHE[key] = cacheObject;
            }
          } else {
            CACHE[key] = cacheObject;
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
   * Retrieves cached value by key.
   * @param {string} key - Cache key.
   * @returns {Promise<any|null>} Cached payload or null.
   */
  static async get(key) {
    if (isNoneMode) return null;
    key = key.trim();
    if (!key) return null;

    if (isRedisMode && redisHost && !redisClient) {
      await initRedis().catch(() => {});
    }

    if (isRedisMode && isRedisConnected && redisClient) {
      try {
        const cachedData = await redisClient.get(key);
        if (cachedData) {
          try {
            const cached = JSON.parse(cachedData);
            return cached && typeof cached === "object" && "data" in cached
              ? cached.data
              : cached;
          } catch {
            return cachedData;
          }
        }
        return null;
      } catch {
        isRedisConnected = false;
      }
    }

    if (CACHE[key]) {
      if (CACHE[key].expiry > Date.now()) {
        const cached = CACHE[key];
        return cached.data !== undefined ? cached.data : cached;
      }
      delete CACHE[key];
    }

    return null;
  }

  /**
   * Sets data into cache with a specified TTL in seconds.
   * @param {string} key - Cache key.
   * @param {any} value - Data to cache.
   * @param {number} [seconds=60] - Expiry time in seconds.
   * @returns {Promise<boolean>} True if set successfully.
   */
  static async set(key, value, seconds = 60) {
    if (isNoneMode) return true;
    key = key.trim();
    if (!key) return false;

    if (isRedisMode && redisHost && !redisClient) {
      await initRedis().catch(() => {});
    }

    const cacheObject = {
      type: typeof value === "string" ? "html" : "json",
      data: value,
      expiry: Date.now() + seconds * 1000,
    };

    if (isRedisMode && isRedisConnected && redisClient) {
      try {
        await redisClient.set(key, JSON.stringify(cacheObject), {
          EX: seconds,
        });
      } catch {
        CACHE[key] = cacheObject;
      }
    } else {
      CACHE[key] = cacheObject;
    }

    return true;
  }

  /**
   * Deletes one or more entries from cache.
   * @param {string|string[]} keys - Single key or array of keys to delete.
   * @returns {Promise<boolean>} True if deleted.
   */
  static async delete(keys) {
    if (isNoneMode || !keys) return false;
    const keyList = Array.isArray(keys) ? keys : [keys];

    if (isRedisMode && redisHost && !redisClient) {
      await initRedis().catch(() => {});
    }

    for (const key of keyList) {
      delete CACHE[key];
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
   * @param {string|string[]} keys - Single key or array of keys to delete.
   * @returns {Promise<boolean>} True if deleted.
   */
  static async del(keys) {
    return this.delete(keys);
  }

  /**
   * Flushes all cached data in memory (and Redis if connected).
   * @returns {Promise<boolean>} True if flushed.
   */
  static async clear() {
    for (const key in CACHE) {
      delete CACHE[key];
    }
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
   * Returns current active cache mode ('redis', 'memory', or 'none').
   * @returns {string}
   */
  static getMode() {
    return CACHE_MODE;
  }
}

/**
 * Returns the active Redis client if connected.
 * @returns {Object|null} The Redis client instance or null.
 */
export function getRedisClient() {
  return isRedisMode && isRedisConnected ? redisClient : null;
}

export default Cache;

