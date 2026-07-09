const CACHE = {};

setInterval(() => {
    const now = Date.now();
    for (const key in CACHE) {
        if (CACHE[key].expiry <= now) {
            delete CACHE[key];
        }
    }
}, 300000).unref();
/**
 * Simple in-memory Cache class to provide middleware for Express routes.
 * Caches JSON responses based on the request URL.
 */
class Cache {
  /**
   * Middleware to cache responses.
   * @param {number} [seconds=60] - Number of seconds to cache the response.
   * @returns {Function} Express middleware function.
   * @example
   * router.get("/stats", Cache.middleware(120), (req, res) => {
   *     res.json({ ok: true });
   * });
   */
  static middleware(seconds = 60) {
    return (req, res, next) => {
      const key = req.originalUrl;

      if (CACHE[key] && CACHE[key].expiry > Date.now()) {
        const cached = CACHE[key];
        if (cached.type === "json") {
          return res.json(cached.data);
        } else {
          res.type("text/html");
          return res.send(cached.data);
        }
      }

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      let cachedInRequest = false;

      res.json = (body) => {
        if (!cachedInRequest) {
          CACHE[key] = {
            type: "json",
            data: body,
            expiry: Date.now() + seconds * 1000,
          };
          cachedInRequest = true;
        }
        return originalJson(body);
      };

      res.send = (body) => {
        if (!cachedInRequest && typeof body === "string") {
          CACHE[key] = {
            type: "html",
            data: body,
            expiry: Date.now() + seconds * 1000,
          };
          cachedInRequest = true;
        }
        return originalSend(body);
      };

      next();
    };
  }
}

export default Cache;