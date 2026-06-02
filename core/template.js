import path from "node:path";
import fs from "node:fs";
import ejs from "ejs";
import Config from "./config.js";
import Logger from "./logger.js";

const __dirname = Config.dirname();
const props = Config.props();
const logger = new Logger();

/** @type {Object<string, {html: string, expiry: number}>} */
const CACHE_TEMPLATE = {};

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
 * @param {string} prefix
 * @param {Object} metaTags
 * @param {string} [extra=""]
 * @returns {string}
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
 * Renders HTML files from the frontend directory with SEO placeholders and in-memory caching.
 */
class Template {
  /**
   * Renders an EJS template file or raw HTML string with SEO meta tag injection and caching.
   *
   * @static
   * @param {import('express').Response} res - Express response object.
   * @param {string} templateOrContent - File name (without .ejs extension, resolved from frontend/) or raw HTML string.
   * @param {Object} [options={}] - Rendering configuration.
   * @param {string} [options.langHtml="en"] - HTML lang attribute value.
   * @param {string} [options.classBody="body"] - CSS class for the body element.
   * @param {Array<{tag: string, attrs: Object}>} [options.head=[]] - Extra head elements to inject.
   * @param {Array<{href: string}>} [options.linkStyles=[]] - Stylesheet links to inject.
   * @param {Array<{src: string}>} [options.scriptsInHead=[]] - Script tags for the head.
   * @param {Array<{src: string}>} [options.scriptsInBody=[]] - Script tags for the body.
   * @param {boolean} [options.cache=true] - Enable response caching (only active when DEBUG=false).
   * @param {number} [options.cacheLife=0] - Cache TTL in seconds. 0 means no expiration.
   * @param {string|null} [options.cacheKey=null] - Custom cache key. Auto-generated if null.
   * @param {Object} [options.metaTags={}] - SEO meta tags to inject into the template.
   * @param {boolean} [options.replace=true] - Whether to perform placeholder replacements.
   * @returns {void}
   *
   * @example
   * Template.render(res, "landing", {
   *   metaTags: { titleMeta: "Home", descriptionMeta: "Welcome" }
   * });
   *
   * @example
   * Template.render(res, "landing", {
   *   cache: true,
   *   cacheLife: 120,
   *   metaTags: { titleMeta: "Cached Page" }
   * });
   */
  static render(res, templateOrContent = "", options = {}) {
    try {
      const {
        langHtml = "en",
        classBody = "body",
        head = [],
        linkStyles = [],
        scriptsInHead = [],
        scriptsInBody = [],
        cache = true,
        cacheLife = 0,
        cacheKey = null,
        metaTags = {},
      } = options;

      res.type("text/html");

      const extraKey = res.req ? res.req.originalUrl : "";
      const finalCacheKey =
        cacheKey || buildCacheKey(`html:${templateOrContent}`, metaTags, extraKey);

      if (!props.debug && cache && CACHE_TEMPLATE[finalCacheKey]) {
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
          `${templateOrContent}.ejs`,
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

      const title = this.escapeHtml(
        metaTags.titleMeta || props.titleMeta || "",
      );
      const description = this.escapeHtml(
        metaTags.descriptionMeta || props.descriptionMeta || "",
      );
      const keywords = this.escapeHtml(
        metaTags.keywordsMeta || props.keywordsMeta || "",
      );
      const author = this.escapeHtml(
        metaTags.authorMeta || props.authorMeta || "",
      );
      const ogImage = this.escapeHtml(metaTags.ogImage || "");
      const ogType = this.escapeHtml(metaTags.ogType || "website");
      const twitterCard = this.escapeHtml(
        metaTags.twitterCard || "summary_large_image",
      );

      const headOptions = head
        .map(
          (item) =>
            `<${item.tag} ${Object.entries(item.attrs)
              .map(([k, v]) => `${k}="${v}"`)
              .join(" ")} />`,
        )
        .join("");

      const ogTags = `
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:type" content="${ogType}" />
        ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ""}
        <meta name="twitter:card" content="${twitterCard}" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ""}
      `;

      const canonicalUrl = metaTags.canonicalUrl || props.appUrl || "";

      const hotReloadScript = props.debug
        ? `<script>
(function(){var s=new EventSource("/__hot-reload");s.onmessage=function(){location.reload()};s.onerror=function(){s.close();setTimeout(function(){location.reload()},2000)};})();
</script>`
        : "";

      const linkTags = linkStyles
        .map((item) => `<link rel="stylesheet" href="${item.href}" />`)
        .join("");

      const scriptsHeadTags = scriptsInHead
        .map((item) => `<script src="${item.src}"></script>`)
        .join("");

      const scriptsBodyTags = scriptsInBody
        .map((item) => `<script src="${item.src}"></script>`)
        .join("");

      const ejsData = {
        req: res.req,
        ...res.locals,
        ...options,
        metaTags: { ...props, ...options.metaTags }
      };

      let childHtml = "";
      try {
        childHtml = ejs.render(templateStr, ejsData, {
          cache: !props.debug,
          filename: filePath || undefined
        });
      } catch (err) {
        logger.error(`Error compiling child EJS template: ${err.message}`);
        throw err;
      }

      const layoutPath = path.join(__dirname, "frontend", "layout.ejs");
      let layoutStr = "";
      if (fs.existsSync(layoutPath)) {
        layoutStr = fs.readFileSync(layoutPath, "utf-8");
      } else {
        layoutStr = `<!DOCTYPE html><html lang="<%= langHtml %>"><head><title><%= title %></title><%- headOptions %><%- linkStyles %><%- scriptsHead %></head><body class="<%= classBody %>"><%- body %><%- scriptsBody %></body></html>`;
      }

      const layoutData = {
        ...ejsData,
        body: childHtml,
        langHtml: options.langHtml || res.locals.lang || "en",
        title,
        description,
        keywords,
        author,
        canonicalUrl,
        classBody,
        headOptions: headOptions + ogTags + hotReloadScript,
        linkStyles: linkTags,
        scriptsHead: scriptsHeadTags,
        scriptsBody: scriptsBodyTags
      };

      let finalHtml = "";
      try {
        finalHtml = ejs.render(layoutStr, layoutData, {
          cache: !props.debug,
          filename: layoutPath
        });
      } catch (err) {
        logger.error(`Error compiling layout EJS template: ${err.message}`);
        throw err;
      }

      finalHtml = this.minifyHtml(finalHtml);

      if (cache && !props.debug) {
        CACHE_TEMPLATE[finalCacheKey] = {
          html: finalHtml,
          expiry: cacheLife > 0 ? Date.now() + cacheLife * 1000 : 0,
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
   * @static
   * @param {string} [key] - Specific cache key to clear. If omitted, clears all cached templates.
   *
   * @example
   * Template.clearCache();
   *
   * @example
   * Template.clearCache("html:landing|/|Home|Welcome|_|_");
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
   * @static
   * @returns {string[]} Array of cache key strings.
   *
   * @example
   * const keys = Template.getCacheKeys();
   */
  static getCacheKeys() {
    return Object.keys(CACHE_TEMPLATE);
  }

  /**
   * Removes HTML comments and collapses whitespace for smaller payloads.
   * @static
   * @param {string} html
   * @returns {string}
   */
  static minifyHtml(html) {
    return html
      .replace(/<!--(?!\[if).*?-->/gs, "")
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /**
   * Escapes HTML special characters to prevent XSS in template injection.
   * @static
   * @param {string} [str=""]
   * @returns {string}
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
