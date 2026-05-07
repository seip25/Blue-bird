import path from "node:path";
import fs from "node:fs";
import Config from "./config.js";
import Logger from "./logger.js";

const __dirname = Config.dirname();
const props = Config.props();
const logger = new Logger();

const TEMPLATE_PATH = path.join(__dirname, "frontend", "index.html");
let BASE_TEMPLATE = null;
let CACHE_TEMPLATE = {};

/**
 * Loads the base HTML template lazily on first use.
 * Prevents crash at boot if frontend/index.html doesn't exist yet.
 * @returns {string} The base HTML template contents.
 */
function getBaseTemplate() {
  if (BASE_TEMPLATE === null) {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      logger.error(
        `Template file not found: ${TEMPLATE_PATH}. Run 'npm run create-react-app' to create it.`,
      );
      return "";
    }
    BASE_TEMPLATE = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  }
  return BASE_TEMPLATE;
}

/**
 * Checks if the current request is a frontend SPA navigation request.
 * @param {import('express').Response} res - Express response object.
 * @returns {boolean}
 */
function isSPARequest(res) {
  const req = res.req;
  if (!req) return false;
  return (
    req.query?.source === "frontend" ||
    req.headers?.["x-blue-bird-spa"] === "true"
  );
}

/**
 * Generates a stable cache key from parts, filtering out empty values.
 * @param {string} prefix - Cache key prefix.
 * @param {Object} metaTags - The meta tags object.
 * @param {string} [extra=""] - Extra data to differentiate the cache (e.g., URL).
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
 * Lightweight HTML template renderer optimized for SPA environments.
 */
class Template {
  /**
   * Renders the base HTML template for a React application.
   * Supports SPA mode: when `?source=frontend` is detected, returns JSON with meta/props.
   *
   * @static
   * @method renderReact
   * @param {import('express').Response} res - Express response object.
   * @param {string} [component="App"] - Root React component name.
   * @param {Object} [componentProps={}] - Props for the React component.
   * @param {Object} [options={}] - Rendering configuration.
   */
  static renderReact(
    res,
    component = "App",
    componentProps = {},
    options = {},
  ) {
    try {
      let {
        langHtml = options.langHtml || props.langMeta || "en",
        classBody = "body",
        head = [],
        linkStyles = [],
        scriptsInHead = [],
        scriptsInBody = [],
        cache = true,
        revalidate = false,
        cacheKey = null,
        metaTags = {},
        skeleton = true,
      } = options;

      const metaTagsDefault = {
        titleMeta: props.titleMeta,
        descriptionMeta: props.descriptionMeta,
        keywordsMeta: props.keywordsMeta,
        authorMeta: props.authorMeta,
        langMeta: props.langMeta,
        ogImage: "",
        ogType: "website",
        twitterCard: "summary_large_image",
      };

      metaTags = { ...metaTagsDefault, ...metaTags };

      if (metaTags.langMeta && !options.langHtml) {
        langHtml = metaTags.langMeta;
      }

      if (isSPARequest(res)) {
        return res.json({
          meta: {
            titleMeta: metaTags.titleMeta || "",
            descriptionMeta: metaTags.descriptionMeta || "",
            keywordsMeta: metaTags.keywordsMeta || "",
            authorMeta: metaTags.authorMeta || "",
            ogImage: metaTags.ogImage || "",
            ogType: metaTags.ogType || "website",
            twitterCard: metaTags.twitterCard || "summary_large_image",
          },
          props: componentProps.props || componentProps,
          component: component,
          lang: langHtml,
        });
      }

      res.type("text/html");
      res.status(200);

      const extraKey = res.req ? res.req.originalUrl : "";
      const finalCacheKey = cacheKey || buildCacheKey(`react:${component}`, metaTags, extraKey);

      if (!props.debug && cache && !revalidate && CACHE_TEMPLATE[finalCacheKey]) {
        return res.send(CACHE_TEMPLATE[finalCacheKey]);
      }

      const baseTemplate = getBaseTemplate();
      if (!baseTemplate) {
        return res.status(500).send("Template not found");
      }

      const title = this.escapeHtml(metaTags.titleMeta || "");
      const description = this.escapeHtml(metaTags.descriptionMeta || "");
      const keywords = this.escapeHtml(metaTags.keywordsMeta || "");
      const author = this.escapeHtml(metaTags.authorMeta || "");
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

      const linkTags = linkStyles
        .map((item) => `<link rel="stylesheet" href="${item.href}" />`)
        .join("");

      const scriptsHeadTags = scriptsInHead
        .map((item) => `<script src="${item.src}"></script>`)
        .join("");

      const scriptsBodyTags = scriptsInBody
        .map((item) => `<script src="${item.src}"></script>`)
        .join("");

      const propsJson = JSON.stringify(componentProps).replace(/'/g, "&#39;");
      const stylesSkeleton = skeleton
        ? `<style>${this.skeletonStyles()}</style>`
        : "";
      const skeletonHtml = skeleton ? this.skeletonHtml() : "";

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

      let html = baseTemplate
        .replace(/__LANG__/g, this.escapeHtml(langHtml))
        .replace(/__TITLE__/g, title)
        .replace(/__DESCRIPTION__/g, description)
        .replace(/__KEYWORDS__/g, keywords)
        .replace(/__AUTHOR__/g, author)
        .replace(/__HEAD_OPTIONS__/g, headOptions + ogTags)
        .replace(/__LINK_STYLES__/g, linkTags)
        .replace(/__SCRIPTS_HEAD__/g, scriptsHeadTags)
        .replace(/__CLASS_BODY__/g, classBody)
        .replace(/__COMPONENT__/g, component)
        .replace(/__PROPS__/g, propsJson)
        .replace(/__VITE_ASSETS__/g, this.vite_assets())
        .replace(/__SCRIPTS_BODY__/g, scriptsBodyTags)
        .replace(/__STYLES_SKELETON__/g, stylesSkeleton)
        .replace(/__SKELETON__/g, skeletonHtml);

      html = this.minifyHtml(html);
      if (cache && !props.debug) CACHE_TEMPLATE[finalCacheKey] = html;
      return res.send(html);
    } catch (error) {
      logger.error(`Template render error: ${error.message}`);
      return res.status(500).send("Internal Server Error");
    }
  }

  /**
   * Renders an HTML file or raw content with SEO support and caching.
   * Supports SPA mode: when `?source=frontend` is detected, returns JSON.
   *
   * @static
   * @method renderHtml
   * @param {import('express').Response} res - Express response object.
   * @param {string} templateOrContent - File name (in frontend/) or HTML string.
   * @param {Object} [options={}] - Configuration options.
   */
  static renderHtml(res, templateOrContent = "", options = {}) {
    try {
      const {
        langHtml = "en",
        classBody = "body",
        head = [],
        linkStyles = [],
        scriptsInHead = [],
        scriptsInBody = [],
        cache = true,
        revalidate = false,
        cacheKey = null,
        metaTags = {},
        withAssets = false,
        replace = true,
      } = options;

      if (isSPARequest(res)) {
        return res.json({
          meta: {
            titleMeta: metaTags.titleMeta || props.titleMeta || "",
            descriptionMeta:
              metaTags.descriptionMeta || props.descriptionMeta || "",
            keywordsMeta: metaTags.keywordsMeta || props.keywordsMeta || "",
            authorMeta: metaTags.authorMeta || props.authorMeta || "",
          },
          props: {},
          component: null,
          lang: langHtml,
        });
      }

      let html = "";
      const isFile =
        !templateOrContent.includes("<") && templateOrContent.length < 100;

      if (isFile) {
        const filePath = path.join(
          __dirname,
          "frontend",
          `${templateOrContent}.html`,
        );
        const fileCacheKey = `file:${templateOrContent}`;
        if (cache && CACHE_TEMPLATE[fileCacheKey]) {
          html = CACHE_TEMPLATE[fileCacheKey];
        } else if (fs.existsSync(filePath)) {
          html = fs.readFileSync(filePath, "utf-8");
          if (cache) CACHE_TEMPLATE[fileCacheKey] = html;
        } else {
          html = templateOrContent;
        }
      } else {
        html = templateOrContent;
      }

      res.type("text/html");

      const extraKey = res.req ? res.req.originalUrl : "";
      const finalCacheKey = cacheKey || buildCacheKey(
        `html:${templateOrContent}`,
        metaTags,
        extraKey
      );

      if (!props.debug && cache && !revalidate && CACHE_TEMPLATE[finalCacheKey]) {
        return res.send(CACHE_TEMPLATE[finalCacheKey]);
      }

      if (replace) {
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

        html = html
          .replace(/__LANG__/g, this.escapeHtml(langHtml))
          .replace(/__TITLE__/g, title)
          .replace(/__DESCRIPTION__/g, description)
          .replace(/__KEYWORDS__/g, keywords)
          .replace(/__AUTHOR__/g, author)
          .replace(/__HEAD_OPTIONS__/g, headOptions + ogTags)
          .replace(/__CLASS_BODY__/g, classBody)
          .replace(/__VITE_ASSETS__/g, withAssets ? this.vite_assets() : "")
          .replace(/__STYLES_SKELETON__/g, "");

        if (html.includes("__LINK_STYLES__")) {
          const linkTags = linkStyles
            .map((item) => `<link rel="stylesheet" href="${item.href}" />`)
            .join("");
          html = html.replace(/__LINK_STYLES__/g, linkTags);
        }
        if (html.includes("__SCRIPTS_HEAD__")) {
          const scriptsHeadTags = scriptsInHead
            .map((item) => `<script src="${item.src}"></script>`)
            .join("");
          html = html.replace(/__SCRIPTS_HEAD__/g, scriptsHeadTags);
        }
        if (html.includes("__SCRIPTS_BODY__")) {
          const scriptsBodyTags = scriptsInBody
            .map((item) => `<script src="${item.src}"></script>`)
            .join("");
          html = html.replace(/__SCRIPTS_BODY__/g, scriptsBodyTags);
        }
      }

      html = this.minifyHtml(html);
      if (cache && !props.debug) CACHE_TEMPLATE[finalCacheKey] = html;
      res.send(html);
    } catch (error) {
      logger.error(`Error rendering HTML template: ${error.message}`);
      res.status(500).send("Internal Server Error");
    }
  }

  static vite_assets() {
    if (props.debug) {
      return `
<script type="module">
import RefreshRuntime from "http://localhost:5173/build/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script>
<script type="module" src="http://localhost:5173/build/@vite/client"></script>
<script type="module" src="http://localhost:5173/build/Main.jsx"></script>`;
    }

    const buildPath = path.join(__dirname, props.static.path, "build");
    let manifestPath = path.join(buildPath, "manifest.json");
    if (!fs.existsSync(manifestPath))
      manifestPath = path.join(buildPath, ".vite", "manifest.json");

    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const entry = manifest["Main.jsx"];
      if (entry) {
        let html = "";
        (entry.css || []).forEach((cssFile) => {
          html += `<link rel="stylesheet" href="/build/${cssFile}">`;
        });
        html += `<script type="module" src="/build/${entry.file}"></script>`;
        return html;
      }
    }
    return "";
  }

  static minifyHtml(html) {
    return html
      .replace(/<!--(?!\[if).*?-->/gs, "")
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  static escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  static skeletonStyles() {
    return `
            @keyframes sk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .sk-animate-pulse { animation: sk-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            .sk-container { min-height: 100vh; width: 100%; background-color: #f9fafb; padding: 1rem; box-sizing: border-box; }
            .sk-inner { display: flex; flex-direction: column; gap: 1.5rem; }
            .sk-header { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 1rem; }
            .sk-btn-text { height: 2.5rem; width: 8rem; background-color: #d1d5db; border-radius: 0.5rem; }
            .sk-avatar { height: 2.5rem; width: 2.5rem; background-color: #d1d5db; border-radius: 9999px; }
            .sk-btn { height: 2.5rem; width: 6rem; background-color: #d1d5db; border-radius: 0.5rem; }
            .sk-hero { height: 12rem; width: 100%; background-color: #d1d5db; border-radius: 1rem; }
            .sk-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
            .sk-card { display: flex; flex-direction: column; gap: 0.75rem; }
            .sk-card-img { height: 10rem; width: 100%; background-color: #d1d5db; border-radius: 0.75rem; }
            .sk-footer { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
            .sk-text-full { height: 1rem; width: 100%; background-color: #e5e7eb; border-radius: 0.25rem; }
            @media (min-width: 768px) { .sk-grid { grid-template-columns: repeat(3, 1fr); } .sk-hero { height: 16rem; } }
            html.dark .sk-container { background-color: #0b0f19; }
            html.dark .sk-btn-text, html.dark .sk-avatar, html.dark .sk-btn, html.dark .sk-hero, html.dark .sk-card-img { background-color: #374151; }
            html.dark .sk-text-full { background-color: #1f2937; }
        `;
  }

  static skeletonHtml() {
    return `
            <div class="sk-container">
                <div class="sk-inner sk-animate-pulse">
                    <div class="sk-header"><div class="sk-btn-text"></div><div class="flex gap-4"><div class="sk-avatar"></div><div class="sk-btn"></div></div></div>
                    <div class="sk-hero"></div>
                    <div class="sk-grid">
                        <div class="sk-card"><div class="sk-card-img"></div><div class="sk-text-full"></div></div>
                        <div class="sk-card"><div class="sk-card-img"></div><div class="sk-text-full"></div></div>
                        <div class="sk-card"><div class="sk-card-img"></div><div class="sk-text-full"></div></div>
                    </div>
                </div>
            </div>
        `;
  }
}

export default Template;
