import Config from "./config.js";

const props = Config.props();

/**
 * SEO utility class for generating sitemaps and robots.txt files.
 */
class SEO {
  /**
   * Generates a sitemap.xml string based on a provided routes configuration.
   * Supports multilingual routes with language-prefixed paths.
   *
   * @static
   * @method generateSitemap
   * @param {Array<Object>} routesConfig - The SEO routes configuration array.
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.languages=[]] - List of supported languages.
   * @param {string} [options.defaultLanguage="en"] - The default language.
   * @returns {string} The generated XML sitemap.
   */
  static generateSitemap(routesConfig, options = {}) {
    const { languages = [], defaultLanguage = "en" } = options;
    const host = (props.appUrl || "http://localhost").replace(/\/$/, "");
    const baseUrl = `${host}`;
    const date = new Date().toISOString().split("T")[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml +=
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';

    routesConfig.forEach((route) => {
      const { path: routePath } = route;

      xml += `
        <url>
            <loc>${baseUrl}${routePath}</loc>
            <lastmod>${date}</lastmod>
            <priority>${routePath === "/" ? "1.0" : "0.8"}</priority>
        </url>`;
      if (languages.length > 0) {
        languages.forEach((lang) => {
          const langPath = `/${lang}${routePath === "/" ? "" : routePath}`;
          xml += `
        <url>
            <loc>${baseUrl}${langPath}</loc>
            <lastmod>${date}</lastmod>
            <priority>0.8</priority>
        </url>`;
        });
      }
    });

    xml += "\n</urlset>";
    return xml.trim();
  }

  /**
   * Generates a robots.txt string.
   *
   * @static
   * @method generateRobots
   * @returns {string} The generated robots.txt content.
   */
  static generateRobots() {
    const host = (props.appUrl || "http://localhost").replace(/\/$/, "");
    return `User-agent: *
Allow: /

Sitemap: ${host}/sitemap.xml
`;
  }

  /**
   * Registers sitemap.xml and robots.txt routes in the given Express router.
   *
   * @static
   * @method registerRoutes
   * @param {import('express').Router} expressRouter - The Express router instance.
   * @param {Array<Object>} routesConfig - The SEO routes configuration array.
   * @param {Object} [options={}] - Configuration options for sitemap generation.
   */
  static registerRoutes(expressRouter, routesConfig, options = {}) {
    expressRouter.get("/sitemap.xml", (req, res) => {
      res.header("Content-Type", "application/xml");
      res.send(this.generateSitemap(routesConfig, options));
    });

    expressRouter.get("/robots.txt", (req, res) => {
      res.header("Content-Type", "text/plain");
      res.send(this.generateRobots());
    });
  }
}

export default SEO;
