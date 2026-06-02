import Config from "./config.js";

const props = Config.props();

/** @type {Array<{path: string, languages: string[]}>} */
const _seoRoutes = [];

/**
 * SEO utility class for generating sitemaps and robots.txt files.
 * Routes are automatically registered from Router instances created with { seo: true }.
 */
class SEO {
  /**
   * Registers a route path for sitemap generation.
   * Called internally by Router when seo option is enabled.
   * @static
   * @param {string} routePath - The route path to register.
   * @param {string[]} [languages=[]] - Language prefixes for this route.
   */
  static addRoute(routePath, languages = []) {
    const exists = _seoRoutes.find(r => r.path === routePath);
    if (!exists) {
      _seoRoutes.push({ path: routePath, languages });
    }
  }

  /**
   * Returns all registered SEO routes.
   * @static
   * @returns {Array<{path: string, languages: string[]}>}
   */
  static getRoutes() {
    return _seoRoutes;
  }

  /**
   * Clears all registered SEO routes.
   * @static
   */
  static clearRoutes() {
    _seoRoutes.length = 0;
  }

  /**
   * Generates a sitemap.xml string from all registered SEO routes.
   * @static
   * @returns {string} The generated XML sitemap.
   */
  static generateSitemap() {
    const host = (props.appUrl || `${props.host}:${props.port}`).replace(/\/$/, "");
    const date = new Date().toISOString().split("T")[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml +=
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';

    _seoRoutes.forEach((route) => {
      xml += `
        <url>
            <loc>${host}${route.path}</loc>
            <lastmod>${date}</lastmod>
            <priority>${route.path === "/" ? "1.0" : "0.8"}</priority>
        </url>`;
      if (route.languages && route.languages.length > 0) {
        route.languages.forEach((lang) => {
          const langPath = `/${lang}${route.path === "/" ? "" : route.path}`;
          xml += `
        <url>
            <loc>${host}${langPath}</loc>
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
   * @static
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
   * Registers /sitemap.xml and /robots.txt routes on the given Express router.
   * @static
   * @param {import('express').Router} expressRouter - The Express router instance.
   */
  static registerEndpoints(expressRouter) {
    expressRouter.get("/sitemap.xml", (req, res) => {
      res.header("Content-Type", "application/xml");
      res.send(SEO.generateSitemap());
    });

    expressRouter.get("/robots.txt", (req, res) => {
      res.header("Content-Type", "text/plain");
      res.send(SEO.generateRobots());
    });
  }
}

export default SEO;
