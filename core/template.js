import ejs from "ejs";
import path from "node:path";
import fs from "node:fs";
import Config from "./config.js";
import Logger from "./logger.js";

const __dirname = Config.dirname();
const props = Config.props();

/**
 * Template engine wrapper using EJS, providing helper functions and React island support.
 */
class Template {
    /**
     * Renders an EJS template with the provided context and helper functions.
     * @param {string} template - The template name (without .ejs extension).
     * @param {Object} [context={}] - Data to pass to the template.
     * @param {import('express').Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    static async render(template, context = {}, res) {
        try {
            const templatePath = path.join(__dirname, "templates", `${template}.ejs`);

            const helpers = {
                asset: (file) => this.asset(file),
                url: (p = "") => this.url(p),
                react: (component, props = {}) => this.react(component, props),
                vite_assets: () => this.vite_assets()
            };

            const fullContext = {
                ...props,
                ...helpers,
                ...context
            };

            const html = await ejs.renderFile(templatePath, fullContext);
            const minifiedHtml = this.minifyHtml(html);

            res.send(minifiedHtml);
        } catch (error) {
            const logger = new Logger();
            logger.error(`Template render error: ${error.message}`);

            if (props.debug) {
                res.status(500).send(`<pre>${error.stack}</pre>`);
            } else {
                res.status(500).send("Internal Server Error");
            }
        }
    }

    /**
     * Generates a URL for a static asset.
     * @param {string} file - The asset path.
     * @returns {string} The full asset URL.
     */
    static asset(file) {
        return `${props.host}:${props.port}/public/${file.replace(/^\//, "")}`;
    }

    /**
     * Generates a full URL for the given path.
     * @param {string} [p=""] - The relative path.
     * @returns {string} The full URL.
     */
    static url(p = "") {
        const cleanPath = p.replace(/^\//, "");
        return `${props.host}:${props.port}/${cleanPath}`;
    }

    /**
     * Renders a React component as an HTML string.
     * @param {string} component - The React component name.
     * @param {Object} [componentProps={}] - Props to pass to the component.
     * @options {Object} options - Options for the template.
     * @returns {string} The HTML string of the React component.
     * @example
     * const options = {
     *     head: [
     *         { tag: "meta", attrs: { name: "description", content: "Description" } },
     *         { tag: "link", attrs: { rel: "stylesheet", href: "style.css" } }
     *     ],
     *     classBody: "bg-gray-100",
     *     linkStyles: [
     *         { href: "style.css" }
     *     ],
     *     scriptScripts: [
     *         { src: "script.js" }
     *     ]
     * };
     * 
     * Template.renderReact(res, "App", { title: "Example title" }, options);
     */
    static renderReact(res, component = "App", propsReact = {}, options = {}) {
        const optionsHead = options.head || [];
        const classBody = options.classBody || "";
        const linkStyles = options.linkStyles || [];
        const scriptScripts = options.scriptScripts || [];
        const html = `
<!DOCTYPE html>
<html lang="${this.escapeHtml(props.langMeta)}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeHtml(props.titleMeta)}</title>
    <link rel="icon" href="favicon.ico" />
    <meta name="description" content="${this.escapeHtml(props.descriptionMeta)}"/>
    <meta name="keywords" content="${this.escapeHtml(props.keywordsMeta)}"/>
    <meta name="author" content="${this.escapeHtml(props.authorMeta)}"/>
    ${linkStyles.map(item => `<link rel="stylesheet" href="${item.href}" />`).join("")}
    ${scriptScripts.map(item => `<script src="${item.src}"></script>`).join("")}
    ${optionsHead.map(item => `<${item.tag} ${Object.entries(item.attrs).map(([key, value]) => `${key}="${value}"`).join(" ")} />`).join("")}
</head>
<body class="${classBody}">
    ${this.react(component, propsReact)}
    ${this.vite_assets()}
</body>
</html>
        `
        res.type("text/html");
        res.status(200);
        res.setHeader("Content-Type", "text/html");
        return res.send(this.minifyHtml(html));
    }

    /**
     * Generates a container for a React island component.
     * @param {string} component - The React component name.
     * @param {Object} [componentProps={}] - Props to pass to the component.
     * @returns {string} The HTML container with data attributes for hydration.
     */
    static react(component, componentProps = {}, divId = "root") {
        const id = divId || `react-${Math.random().toString(36).substr(2, 9)}`;
        const propsJson = JSON.stringify(componentProps).replace(/'/g, "&apos;");
        return `<div id="${id}" data-react-component="${component}" data-props='${propsJson}'></div>`;
    }

    /**
     * Generates script and link tags for Vite-managed assets.
     * Handles both development (Vite dev server) and production (manifest.json) modes.
     * @returns {string} The HTML tags for scripts and styles.
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
            try {
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
            } catch (e) {
                return `<!-- Error parsing Vite manifest: ${e.message} -->`;
            }
        }

        return `<!-- Vite Manifest not found at ${manifestPath} -->`;
    }



    /**
     * Minifies the HTML output by removing comments and excessive whitespace.
     * @param {string} html - The raw HTML string.
     * @returns {string} The minified HTML string.
     */
    static minifyHtml(html) {
        return html
            .replace(/<!--(?!\[if).*?-->/gs, "")
            .replace(/>\s+</g, "><")
            .replace(/\s{2,}/g, " ")
            .trim();
    }
    /**
    * Escapes HTML special characters in a string to prevent XSS attacks.
    * @param {string} str - The input string.
    * @returns {string} The escaped string.
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
