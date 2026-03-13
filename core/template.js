import path from "node:path";
import fs from "node:fs";
import Config from "./config.js";
import Logger from "./logger.js";

const __dirname = Config.dirname();
const props = Config.props();

const TEMPLATE_PATH = path.join(__dirname, "frontend", "index.html");
const BASE_TEMPLATE = fs.readFileSync(TEMPLATE_PATH, "utf-8");
let CACHE_TEMPLATE = {};

/**
 * Lightweight HTML template renderer optimized for SPA environments.
 */
class Template {

    /**
 * Renders the base HTML template for a React application using
 * string placeholder replacement and optional in-memory caching.
 *
 * This method injects:
 * - The root React component name
 * - Serialized component props
 * - SEO meta tags
 * - Custom <head> tags
 * - Stylesheets
 * - Scripts (head and body)
 * - Vite assets
 *
 * It supports basic HTML escaping, optional minification,
 * and template caching per component.
 *
 * @static
 * @method renderReact
 *
 * @param {import('express').Response} res
 * Express response object used to send the generated HTML.
 *
 * @param {string} [component="App"]
 * The root React component name to bootstrap on the client.
 * This value replaces the `__COMPONENT__` placeholder in the template.
 *
 * @param {Object<string, any>} [componentProps={}]
 * Props passed to the root React component.
 * These are serialized and injected into the template
 * via the `__PROPS__` placeholder.
 *
 * @param {Object} [options={}]
 * Rendering configuration options.
 *
 * @param {string} [options.langHtml="en"]
 * Value for the `<html lang="">` attribute.
 * Falls back to metaTags.langMeta if available.
 *
 * @param {string} [options.classBody="body"]
 * CSS class applied to the `<body>` tag.
 *
 * @param {Array<{tag:string, attrs:Object<string,string>}>} [options.head=[]]
 * Additional custom tags injected into `<head>`.
 * Example:
 * `{ tag: "meta", attrs: { name: "description", content: "Example" } }`
 *
 * @param {Array<{href:string}>} [options.linkStyles=[]]
 * Stylesheets injected as `<link rel="stylesheet" />` tags.
 *
 * @param {Array<{src:string}>} [options.scriptsInHead=[]]
 * Script files injected inside `<head>`.
 *
 * @param {Array<{src:string}>} [options.scriptsInBody=[]]
 * Script files injected before `</body>`.
 *
 * @param {boolean} [options.cache=true]
 * Enables in-memory caching of the generated HTML
 * per component name to improve performance.
 *
 * @param {Object} [options.metaTags]
 * SEO metadata configuration.
 *
 * @param {string} [options.metaTags.titleMeta]
 * Content for the `<title>` tag.
 *
 * @param {string} [options.metaTags.descriptionMeta]
 * Content for `<meta name="description">`.
 *
 * @param {string} [options.metaTags.keywordsMeta]
 * Content for `<meta name="keywords">`.
 *
 * @param {string} [options.metaTags.authorMeta]
 * Content for `<meta name="author">`.
 *
 * @param {string} [options.metaTags.langMeta]
 * Alternative language metadata value.
 *
 * @returns {void}
 * Sends a complete HTML response to the client.
 *
 * @throws {Error}
 * If template rendering fails, a 500 response is returned.
 *
 * @example
 * const options = {
 *   cache: true,
 *   classBody: "bg-gray-100",
 *   head: [
 *     { tag: "meta", attrs: { name: "robots", content: "index, follow" } }
 *   ],
 *   linkStyles: [
 *     { href: "/css/style.css" }
 *   ],
 *   scriptsInHead: [
 *     { src: "/js/head.js" }
 *   ],
 *   scriptsInBody: [
 *     { src: "/js/body.js" }
 *   ],
 *   metaTags: {
 *     titleMeta: "Example Title",
 *     descriptionMeta: "Example description",
 *     keywordsMeta: "express, react, framework",
 *     authorMeta: "Blue Bird",
 *     langMeta: "en"
 *   }
 * };
 *
 * Template.renderReact(res, "App", { title: "Hello World" }, options);
 */
    static renderReact(res, component = "App", componentProps = {}, options = {}) {
        try {
            let {
                langHtml = options.langHtml || props.langMeta || "en",
                classBody = "body",
                head = [],
                linkStyles = [],
                scriptsInHead = [],
                scriptsInBody = [],
                cache = true,
                metaTags
            } = options;
            const metaTagsDefault = {
                titleMeta: props.titleMeta,
                descriptionMeta: props.descriptionMeta,
                keywordsMeta: props.keywordsMeta,
                authorMeta: props.authorMeta,
                langMeta: props.langMeta,
            }
            metaTags = {
                ...metaTagsDefault,
                ...metaTags
            }

            if (metaTags.langMeta && !options.langHtml) {
                langHtml = metaTags.langMeta;
            }

            res.type("text/html");
            res.status(200);
            const cacheKey = `${component}_${metaTags.titleMeta}`;
            if (cache && CACHE_TEMPLATE[cacheKey]) {
                return res.send(CACHE_TEMPLATE[cacheKey]);
            }

            const title = this.escapeHtml(metaTags.titleMeta || "");
            const description = this.escapeHtml(metaTags.descriptionMeta || "");
            const keywords = this.escapeHtml(metaTags.keywordsMeta || "");
            const author = this.escapeHtml(metaTags.authorMeta || "");

            const headOptions = head
                .map(item => `<${item.tag} ${Object.entries(item.attrs).map(([k, v]) => `${k}="${v}"`).join(" ")} />`)
                .join("");

            const linkTags = linkStyles
                .map(item => `<link rel="stylesheet" href="${item.href}" />`)
                .join("");

            const scriptsHeadTags = scriptsInHead
                .map(item => `<script src="${item.src}"></script>`)
                .join("");

            const scriptsBodyTags = scriptsInBody
                .map(item => `<script src="${item.src}"></script>`)
                .join("");

            const propsJson = JSON.stringify(componentProps).replace(/'/g, "&#39;");

            let html = BASE_TEMPLATE
                .replace(/__LANG__/g, this.escapeHtml(langHtml))
                .replace(/__TITLE__/g, title)
                .replace(/__DESCRIPTION__/g, description)
                .replace(/__KEYWORDS__/g, keywords)
                .replace(/__AUTHOR__/g, author)
                .replace(/__HEAD_OPTIONS__/g, headOptions)
                .replace(/__LINK_STYLES__/g, linkTags)
                .replace(/__SCRIPTS_HEAD__/g, scriptsHeadTags)
                .replace(/__CLASS_BODY__/g, classBody)
                .replace(/__COMPONENT__/g, component)
                .replace(/__PROPS__/g, propsJson)
                .replace(/__VITE_ASSETS__/g, this.vite_assets())
                .replace(/__SCRIPTS_BODY__/g, scriptsBodyTags);

            html = this.minifyHtml(html);
            CACHE_TEMPLATE[cacheKey] = html;
            return res.send(html);

        } catch (error) {
            const logger = new Logger();
            logger.error(`Template render error: ${error.message}`);

            if (props.debug) {
                console.log(error)
                return res.status(500).send(`<pre>${error.stack}</pre>`);
            }

            return res.status(500).send("Internal Server Error");
        }
    }

    /**
     * Generates Vite asset tags depending on environment.
     * @returns {string}
     */
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

        if (!fs.existsSync(manifestPath)) {
            manifestPath = path.join(buildPath, ".vite", "manifest.json");
        }

        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
            const entry = manifest["Main.jsx"];

            if (entry) {
                const file = entry.file;
                const css = entry.css || [];

                let html = "";
                css.forEach(cssFile => {
                    html += `<link rel="stylesheet" href="/build/${cssFile}">`;
                });
                html += `<script type="module" src="/build/${file}"></script>`;
                return html;
            }
        }

        return "";
    }

    /**
     * Minifies HTML output.
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
     * Escapes HTML special characters.
     * @param {string} str
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
