import path from "node:path";
import fs from "node:fs";
import Config from "./config.js";
import Logger from "./logger.js";

const __dirname = Config.dirname();
const props = Config.props();
const logger = new Logger();

/** @type {Object<string, {html: string, expiry: number}>} */
const CACHE_TEMPLATE = {};

/** @type {Object<string, string>} */
const FILE_CACHE = {};

setInterval(() => {
  const now = Date.now();
  for (const key in CACHE_TEMPLATE) {
    if (CACHE_TEMPLATE[key].expiry > 0 && CACHE_TEMPLATE[key].expiry <= now) {
      delete CACHE_TEMPLATE[key];
    }
  }
}, 30000).unref();

/**
 * Generates a stable cache key from parts, filtering out empty values.
 * @param {string} prefix - The cache key prefix.
 * @param {Object} metaTags - SEO metadata tags.
 * @param {string} [extra=""] - Additional context for the cache key.
 * @returns {string} The constructed cache key.
 */
function buildCacheKey(prefix, metaTags, extra = "") {
  const parts = [
    prefix,
    extra,
    metaTags.titleMeta || "_",
    metaTags.descriptionMeta || "_",
    metaTags.langMeta || "_",
    metaTags.ogImage || "_",
  ];
  return parts.join("|");
}

/**
 * HTML template renderer for Express applications.
 * Renders static HTML files with SEO placeholder injection and high-speed in-memory caching.
 */
class Template {
  /**
   * Renders an HTML template file or raw HTML string with placeholder replacement and caching.
   *
   * @static
   * @param {import('express').Response} res - Express response object.
   * @param {string} templateOrContent - File name (without .html extension) or raw HTML string.
   * @param {Object} [options={}] - Rendering configuration.
   * @param {string} [options.langHtml="en"] - Lang attribute value for html.
   * @param {string} [options.classBody="body"] - CSS class for the body element.
   * @param {Array<{tag: string, attrs: Object}>} [options.head=[]] - Extra head elements to inject.
   * @param {Array<{href: string}>} [options.linkStyles=[]] - Stylesheet links to inject.
   * @param {Array<{src: string}>} [options.scriptsInHead=[]] - Script tags for the head.
   * @param {Array<{src: string}>} [options.scriptsInBody=[]] - Script tags for the body.
   * @param {boolean|number} [options.cache=60] - Cache TTL in seconds (0 or false to disable).
   * @param {boolean} [options.minify=true] - Enable HTML minification.
   * @param {string|null} [options.cacheKey=null] - Custom cache key.
   * @param {Object} [options.metaTags={}] - SEO metadata tags.
   * @returns {void}
   */
  static render(res, templateOrContent = "", options = {}) {
    try {
      const {
        langHtml = "en",
        cache = 60,
        minify = true,
        cacheKey = null,
        metaTags = {},
      } = options;

      res.type("text/html");

      const extraKey = res.req ? res.req.originalUrl : "";
      const finalCacheKey =
        cacheKey || buildCacheKey(`html:${templateOrContent}`, metaTags, extraKey);

      const cacheDuration = typeof cache === "number" ? cache : (cache ? 60 : 0);
      const isCacheEnabled = !props.debug && cacheDuration > 0;

      if (isCacheEnabled && CACHE_TEMPLATE[finalCacheKey]) {
        const cached = CACHE_TEMPLATE[finalCacheKey];
        if (cached.expiry === 0 || cached.expiry > Date.now()) {
          return res.send(cached.html);
        }
        delete CACHE_TEMPLATE[finalCacheKey];
      }

      const isFile =
        !templateOrContent.includes("<") && templateOrContent.length < 100;

      let templateStr = "";
      let filePath = "";

      if (isFile) {
        filePath = path.join(
          __dirname,
          "frontend",
          "templates",
          `${templateOrContent}.html`,
        );
        const fileCacheKey = `file:${templateOrContent}`;
        if (!props.debug && FILE_CACHE[fileCacheKey]) {
          templateStr = FILE_CACHE[fileCacheKey];
        } else if (fs.existsSync(filePath)) {
          templateStr = fs.readFileSync(filePath, "utf-8");
          if (!props.debug) FILE_CACHE[fileCacheKey] = templateStr;
        } else {
          templateStr = templateOrContent;
        }
      } else {
        templateStr = templateOrContent;
      }

      const title = metaTags.titleMeta || props.titleMeta || "";
      const description = metaTags.descriptionMeta || props.descriptionMeta || "";
      const keywords = metaTags.keywordsMeta || props.keywordsMeta || "";
      const author = metaTags.authorMeta || props.authorMeta || "";
      const canonicalUrl = metaTags.canonicalUrl || props.appUrl || "";
      const lang = langHtml || res.locals.lang || "en";

      let finalHtml = templateStr;

      const escapes = {
        title,
        description,
        keywords,
        author,
        canonicalUrl,
        titleMeta: title,
        descriptionMeta: description,
        keywordsMeta: keywords,
        authorMeta: author,
      };

      const raws = {
        lang,
        langHtml: lang,
      };

      for (const [k, v] of Object.entries(escapes)) {
        finalHtml = finalHtml.replaceAll(`{{${k}}}`, this.escapeHtml(v));
      }

      for (const [k, v] of Object.entries(raws)) {
        finalHtml = finalHtml.replaceAll(`{{${k}}}`, v);
      }

      for (const [k, v] of Object.entries(metaTags)) {
        if (typeof v !== "object" && !escapes[k] && !raws[k]) {
          finalHtml = finalHtml.replaceAll(`{{${k}}}`, this.escapeHtml(String(v)));
        }
      }

      for (const [k, v] of Object.entries(options)) {
        if (k !== "metaTags" && typeof v !== "object" && !escapes[k] && !raws[k]) {
          finalHtml = finalHtml.replaceAll(`{{${k}}}`, this.escapeHtml(String(v)));
        }
      }

      if (props.debug) {
        const hotReloadScript = `<script>
(function(){var s=new EventSource("/__hot-reload");s.onmessage=function(e){if(e.data==="reload")location.reload()};s.onerror=function(){s.close();setTimeout(function(){location.reload()},2000)};})();
</script>`;
        if (finalHtml.includes("</body>")) {
          finalHtml = finalHtml.replace("</body>", `${hotReloadScript}</body>`);
        } else {
          finalHtml += hotReloadScript;
        }
      }

      if (minify) {
        finalHtml = this.minifyHtml(finalHtml);
      }

      if (isCacheEnabled) {
        CACHE_TEMPLATE[finalCacheKey] = {
          html: finalHtml,
          expiry: cacheDuration > 0 ? Date.now() + cacheDuration * 1000 : 0,
        };
      }
      res.send(finalHtml);
    } catch (error) {
      logger.error(`Error rendering HTML template: ${error.message}`);
      res.status(500).send("Internal Server Error");
    }
  }

  /**
   * Clears cached rendered templates.
   *
   * @static
   * @param {string} [key] - Specific cache key to clear. If omitted, clears all cache.
   * @returns {void}
   */
  static clearCache(key) {
    if (key) {
      delete CACHE_TEMPLATE[key];
      delete FILE_CACHE[key];
    } else {
      for (const k in CACHE_TEMPLATE) delete CACHE_TEMPLATE[k];
      for (const k in FILE_CACHE) delete FILE_CACHE[k];
    }
  }

  /**
   * Returns all active cache keys for rendered templates.
   *
   * @static
   * @returns {string[]} Array of cache key strings.
   */
  static getCacheKeys() {
    return Object.keys(CACHE_TEMPLATE);
  }

  /**
   * Removes HTML comments and collapses whitespace for smaller payloads.
   *
   * @static
   * @param {string} html - Raw HTML content.
   * @returns {string} Minified HTML content.
   */
  static minifyHtml(html) {
    return html
      .replace(/<!--(?!\[if).*?-->/gs, "")
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /**
   * Escapes HTML special characters to prevent XSS.
   *
   * @static
   * @param {string} [str=""] - Unescaped string.
   * @returns {string} Escaped HTML string.
   */
  static escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

export default Template;
