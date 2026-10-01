import fs from "node:fs";
import path from "node:path";
import { getRedisClient } from "./cache.js";
import Config from "./config.js";

const props = Config.props();
const DEBUG = props.debug;
const PM2_INSTANCES = parseInt(process.env.PM2_INSTANCES || "1", 10);
const RENDER_CACHE_MAX = parseInt(process.env.RENDER_CACHE_MAX || "500", 10);
const RENDER_CACHE_TTL = parseInt(process.env.RENDER_CACHE_TTL || "300", 10);
const VIEWS_DIR = path.join(process.cwd(), process.env.VIEWS_PATH || "app/views");
const FILE_CACHE_DIR = path.join(process.cwd(), "app/cache");

const isMultiInstance = PM2_INSTANCES > 1;

/**
 * In-memory LRU cache for rendered HTML strings.
 * @type {Map<string, {html: string, expiry: number}>}
 */
const lru = new Map();

let fileCacheEnabled = false;

if (!DEBUG) {
  try {
    fs.mkdirSync(FILE_CACHE_DIR, { recursive: true });
    fs.accessSync(FILE_CACHE_DIR, fs.constants.W_OK);
    fileCacheEnabled = true;
  } catch {
    console.warn("[RENDER] app/cache/ is not writable — file cache disabled.");
  }
}

/**
 * Evicts the oldest LRU entry when the cap is exceeded.
 */
function evictLru() {
  if (lru.size >= RENDER_CACHE_MAX) {
    const key = lru.keys().next().value;
    if (key !== undefined) lru.delete(key);
  }
}

/**
 * Returns a safe filesystem key derived from the cache key string.
 * @param {string} key
 * @returns {string}
 */
function toCacheFileName(key) {
  return key.replace(/[^a-z0-9_-]/gi, "_").substring(0, 200) + ".html";
}

/**
 * Reads an HTML string from the file cache, respecting TTL.
 * @param {string} key
 * @returns {string|null}
 */
function readFileCache(key) {
  if (!fileCacheEnabled) return null;
  const file = path.join(FILE_CACHE_DIR, toCacheFileName(key));
  try {
    const stats = fs.statSync(file);
    const age = (Date.now() - stats.mtimeMs) / 1000;
    if (age > RENDER_CACHE_TTL) return null;
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/**
 * Writes an HTML string to the file cache.
 * @param {string} key
 * @param {string} html
 */
function writeFileCache(key, html) {
  if (!fileCacheEnabled) return;
  try {
    const file = path.join(FILE_CACHE_DIR, toCacheFileName(key));
    fs.writeFileSync(file, html, "utf8");
  } catch {}
}

/**
 * Interpolates {{{key}}} and {{key}} placeholders in an HTML string.
 * {{{key}}} inserts raw value, {{key}} HTML-encodes the value.
 * @param {string} html - Raw HTML template string.
 * @param {Object} data - Key-value pairs to inject.
 * @returns {string} Interpolated HTML.
 */
function interpolate(html, data) {
  if (!data || typeof data !== "object") return html;

  let result = html;

  result = result.replace(/\{\{\{(\w[\w.]*)\}\}\}/g, (_, key) => {
    const val = resolvePath(data, key);
    return val !== undefined ? String(val) : "";
  });

  result = result.replace(/\{\{(\w[\w.]*)\}\}/g, (_, key) => {
    const val = resolvePath(data, key);
    return val !== undefined ? escapeHtml(String(val)) : "";
  });

  return result;
}

/**
 * Resolves a dot-notation key against a data object.
 * @param {Object} obj
 * @param {string} keyPath
 * @returns {any}
 */
function resolvePath(obj, keyPath) {
  return keyPath.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

/**
 * Escapes HTML special characters to prevent XSS in interpolated values.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Looks up a rendered HTML string from L1 (memory LRU), L2 (Redis), or L3 (file).
 * @param {string} key
 * @returns {Promise<string|null>}
 */
async function lookupCache(key) {
  const entry = lru.get(key);
  if (entry && entry.expiry > Date.now()) {
    lru.delete(key);
    lru.set(key, entry);
    return entry.html;
  }
  if (entry) lru.delete(key);

  if (isMultiInstance) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const val = await redis.get(`render:${key}`);
        if (val) {
          evictLru();
          lru.set(key, { html: val, expiry: Date.now() + RENDER_CACHE_TTL * 1000 });
          return val;
        }
      } catch {}
    } else {
      const fromFile = readFileCache(key);
      if (fromFile) {
        evictLru();
        lru.set(key, { html: fromFile, expiry: Date.now() + RENDER_CACHE_TTL * 1000 });
        return fromFile;
      }
    }
  }

  return null;
}

/**
 * Stores a rendered HTML string in all available cache layers.
 * @param {string} key
 * @param {string} html
 * @returns {Promise<void>}
 */
async function storeCache(key, html) {
  evictLru();
  lru.set(key, { html, expiry: Date.now() + RENDER_CACHE_TTL * 1000 });

  if (isMultiInstance) {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(`render:${key}`, html, { EX: RENDER_CACHE_TTL });
        return;
      } catch {}
    }
    writeFileCache(key, html);
  }
}

/**
 * Reads a view file. Checks .html first, then .ejs if EJS is available.
 * @param {string} viewName
 * @returns {{content: string, ext: string}|null}
 */
function readViewFile(viewName) {
  const htmlPath = path.join(VIEWS_DIR, `${viewName}.html`);
  if (fs.existsSync(htmlPath)) {
    return { content: fs.readFileSync(htmlPath, "utf8"), ext: "html" };
  }
  const ejsPath = path.join(VIEWS_DIR, `${viewName}.ejs`);
  if (fs.existsSync(ejsPath)) {
    return { content: fs.readFileSync(ejsPath, "utf8"), ext: "ejs" };
  }
  return null;
}

/**
 * HTML render engine for Blue Bird.
 *
 * Cache strategy (automatic, based on .env):
 *   - DEBUG=true                     -> no cache (always fresh reads from disk)
 *   - DEBUG=false, PM2_INSTANCES=1   -> L1 in-memory LRU only
 *   - DEBUG=false, PM2_INSTANCES>1   -> L1 LRU + L2 Redis (if connected) -> L3 file fallback
 *
 * Template syntax (built-in, no engine required):
 *   {{key}}      -> HTML-escaped interpolation
 *   {{{key}}}    -> Raw (unescaped) interpolation
 *
 * EJS support: opt-in. If `ejs` is installed and the view file uses the .ejs extension,
 * it will be processed by EJS. Install with: npm install ejs
 *
 * Use app.use() to configure any other template engine via Express normally.
 */
class Render {
  /**
   * Sends a rendered HTML response from app/views/<viewName>.html.
   * Applies cache based on environment configuration.
   * @param {import('express').Response} res - Express response object.
   * @param {string} viewName - View file name without extension (e.g., "index", "dashboard").
   * @param {Object} [data={}] - Data to interpolate into the template.
   * @param {number} [ttl] - Override cache TTL in seconds (defaults to RENDER_CACHE_TTL env).
   * @returns {Promise<void>}
   */
  static async send(res, viewName, data = {}, ttl) {
    const cacheTtl = ttl ?? RENDER_CACHE_TTL;
    const cacheKey = `view:${viewName}`;

    if (!DEBUG) {
      const cached = await lookupCache(cacheKey);
      if (cached) {
        const html = interpolate(cached, data);
        res.set("Content-Type", "text/html; charset=utf-8");
        res.set("X-Blue-Bird-Cache", "HIT");
        return res.send(html);
      }
    }

    const view = readViewFile(viewName);
    if (!view) {
      return res.status(404).json({ message: `View '${viewName}' not found.` });
    }

    let rendered;

    if (view.ext === "ejs") {
      try {
        const ejs = await import("ejs");
        rendered = await ejs.render(view.content, data, { async: true });
      } catch {
        return res.status(500).json({ message: "EJS is not installed. Run: npm install ejs" });
      }
    } else {
      rendered = interpolate(view.content, data);
    }

    if (!DEBUG) {
      await storeCache(cacheKey, view.content);
    }

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-Blue-Bird-Cache", "MISS");
    return res.send(rendered);
  }

  /**
   * Returns an Express route handler that renders a view.
   * Designed to be used directly as a route callback.
   * @param {string} viewName - View file name without extension.
   * @param {Object} [staticData={}] - Static data merged before request-time data.
   * @returns {Function} Express route handler (req, res) => void.
   * @example
   * web.get("/", Render.view("index"));
   * web.get("/about", Render.view("about", { company: "Blue Bird" }));
   */
  static view(viewName, staticData = {}) {
    return (req, res) => Render.send(res, viewName, staticData);
  }

  /**
   * Express middleware that caches the full rendered HTML response for a route.
   * Works as an alternative to Render.view when the handler builds its own response.
   * @param {number} [seconds] - Cache duration in seconds (defaults to RENDER_CACHE_TTL env).
   * @returns {Function} Express middleware.
   * @example
   * web.get("/dashboard", Auth.protect(), Render.cache(600), Render.view("dashboard"));
   */
  static cache(seconds) {
    const ttl = seconds ?? RENDER_CACHE_TTL;

    return async (req, res, next) => {
      if (DEBUG || req.method !== "GET") return next();

      const key = `route:${req.originalUrl}`;
      const cached = await lookupCache(key);
      if (cached) {
        res.set("Content-Type", "text/html; charset=utf-8");
        res.set("X-Blue-Bird-Cache", "HIT");
        return res.send(cached);
      }

      const originalSend = res.send.bind(res);
      res.send = async (body) => {
        if (typeof body === "string" && res.statusCode === 200) {
          await storeCache(key, body);
        }
        res.set("X-Blue-Bird-Cache", "MISS");
        return originalSend(body);
      };

      next();
    };
  }

  /**
   * Invalidates the render cache for one or more view names or route URLs.
   * @param {string|string[]} keys - View names or route URLs to invalidate.
   * @returns {Promise<void>}
   */
  static async invalidate(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const viewKey = `view:${key}`;
      const routeKey = `route:${key}`;
      lru.delete(viewKey);
      lru.delete(routeKey);

      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.del(`render:${viewKey}`);
          await redis.del(`render:${routeKey}`);
        } catch {}
      }

      if (fileCacheEnabled) {
        try {
          const f = path.join(FILE_CACHE_DIR, toCacheFileName(viewKey));
          if (fs.existsSync(f)) fs.unlinkSync(f);
        } catch {}
      }
    }
  }
}

export default Render;
