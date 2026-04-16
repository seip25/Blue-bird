import Config from "./config.js";

const props = Config.props();

/**
 * SEO utility class for generating sitemaps and robots.txt files.
 */
class SEO {
  /**
   * Generates a sitemap.xml string based on a provided routes configuration.
   *
   * @static
   * @method generateSitemap
   * @param {Array<Object>} routesConfig - The SEO routes configuration array.
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.languages=[]] - List of supported languages.
   * @param {string} [options.defaultLanguage="en"] - The default language.
   * @returns {string} The generated XML sitemap.
   * @example
   * const sitemap = SEO.generateSitemap(routes);
   */
  static generateSitemap(routesConfig, options = {}) {
    const { languages = [], defaultLanguage = "en" } = options;
    const host = props.host || "http://localhost";
    const date = new Date().toISOString().split("T")[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    routesConfig.forEach((route) => {
      const { path } = route;
      const detectedLanguages =
        languages.length > 0
          ? languages
          : Object.keys(route).filter((key) => key.length === 2);

      xml += `
        <url>
            <loc>${host}${path}</loc>
            <lastmod>${date}</lastmod>
            <priority>${path === "/" ? "1.0" : "0.8"}</priority>
        </url>`;

      detectedLanguages.forEach((lang) => {
        if (lang !== defaultLanguage) {
          const langPath = `/${lang}${path === "/" ? "" : path}`;
          xml += `
        <url>
            <loc>${host}${langPath}</loc>
            <lastmod>${date}</lastmod>
            <priority>0.7</priority>
        </url>`;
        }
      });
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
   * @example
   * const robots = SEO.generateRobots();
   */
  static generateRobots() {
    const host = props.host || "http://localhost";
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
