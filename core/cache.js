import fs from "node:fs";

const CACHE = {};

let redisClient = null;
let isRedisConnected = false;
const redisHost = process.env.REDIS_HOST ?? false;
const redisPort = process.env.REDIS_PORT ?? 6379;
const redisPassword = process.env.REDIS_PASSWORD || "";
const redisUrl = redisPassword
  ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
  : `redis://${redisHost}:${redisPort}`;

/**
 * Initializes the Redis client connection if REDIS_HOST env is set.
 * @returns {Promise<void>}
 */
async function initRedis() {
  if (redisClient) return;
  if (!redisHost) return;

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
    await redisClient.connect();
    isRedisConnected = true;
  } catch (err) {
    redisClient = null;
    isRedisConnected = false;
  }
}

initRedis().catch(() => {});

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
      const key = req.originalUrl;

      if (redisHost && !redisClient) {
        await initRedis().catch(() => {});
      }

      if (isRedisConnected && redisClient) {
        try {
          const cachedData = await redisClient.get(key);
          if (cachedData) {
            const cached = JSON.parse(cachedData);
            if (cached.type === "json") {
              return res.json(cached.data);
            } else {
              res.type("text/html");
              res.set("X-Blue-Bird-Cache", "HIT");
              return res.send(cached.data);
            }
          }
        } catch (err) {
          isRedisConnected = false;
        }
      }

      if (!isRedisConnected || !redisClient) {
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
          if (isRedisConnected && redisClient) {
            try {
              await redisClient.set(key, JSON.stringify(cacheObject), {
                EX: seconds,
              });
            } catch (err) {
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
          if (isRedisConnected && redisClient) {
            try {
              await redisClient.set(key, JSON.stringify(cacheObject), {
                EX: seconds,
              });
            } catch (err) {
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
}

/**
 * Returns the active Redis client if connected.
 * @returns {Object|null} The Redis client instance or null.
 */
export function getRedisClient() {
  return isRedisConnected ? redisClient : null;
}

export default Cache;
