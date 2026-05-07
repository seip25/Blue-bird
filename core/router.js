import express from "express";
import Config from "./config.js";
import Template from "./template.js";
import SEO from "./seo.js";

const __dirname = Config.dirname();
const props = Config.props();

/**
 * Router wrapper class for handling Express routing logic.
 */
class Router {
  /**
   * Creates a new Router instance.
   * @param {string} [path="/"] - The base path for this router.
   * @example
   * const router = new Router("/api")
   * router.get("/", (req, res) => {
   *     res.json({ message: "Hello World!" })
   * })
   */
  constructor(path = "/") {
    this.router = express.Router();
    this.path = path;
  }

  /**
   * Registers a middleware on this router.
   * @param {...Function} middleware - Middleware functions.
   * @example
   * router.use(Auth.protect());
   * router.use(App.helmet());
   */
  use(...middleware) {
    this.router.use(...middleware);
  }

  /**
   * Registers a GET route handler.
   * @param {string} path - The relative path for the GET route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.get("/users", (req, res) => {
   *     const users = [
   *         {
   *             name: "John Doe",
   *             email: "john.doe@example.com",
   *         },
   *         {
   *             name: "Jane Doe2",
   *             email: "jane.doe2@example.com",
   *         },
   *     ]
   *     res.json(users)
   * })
   */
  get(path, ...callback) {
    if (path === "/*" || path === "*") {
      path = /.*/;
    }
    this.router.get(path, callback);
  }

  /**
   * Registers a POST route handler.
   * @param {string} path - The relative path for the POST route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.post("/users", (req, res) => {
   *  return res.json({ message: "User created successfully" })
   * })
   */
  post(path, ...callback) {
    if (path === "/*" || path === "*") {
      path = /.*/;
    }
    this.router.post(path, callback);
  }

  /**
   * Registers a PUT route handler.
   * @param {string} path - The relative path for the PUT route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.put("/users", (req, res) => {
   *  return res.json({ message: "User updated successfully" })
   * })
   */
  put(path, ...callback) {
    this.router.put(path, callback);
  }

  /**
   * Registers a DELETE route handler.
   * @param {string} path - The relative path for the DELETE route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.delete("/users", (req, res) => {
   *  return res.json({ message: "User deleted successfully" })
   * })
   */
  delete(path, ...callback) {
    this.router.delete(path, callback);
  }

  /**
   * Registers a PATCH route handler.
   * @param {string} path - The relative path for the PATCH route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.patch("/users", (req, res) => {
   *  return res.json({ message: "User patched successfully" })
   * })
   */
  patch(path, ...callback) {
    this.router.patch(path, callback);
  }

  /**
   * Registers an OPTIONS route handler.
   * @param {string} path - The relative path for the OPTIONS route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.options("/users", (req, res) => {
   *  return res.json({ message: "User options successfully" })
   * })
   */
  options(path, ...callback) {
    this.router.options(path, callback);
  }

  /**
   * Returns the underlying Express router instance.
   * @returns {import('express').Router} The Express router object.
   */
  getRouter() {
    return this.router;
  }

  /**
   * Returns the base path associated with this router.
   * @returns {string} The router path.
   */
  getPath() {
    return this.path;
  }

  /**
   * Resolves meta tags for a route, supporting simple meta, inline multilingual, or external seoData.
   *
   * @private
   * @param {Object} route - The route configuration.
   * @param {string} lang - Target language.
   * @param {Object} [seoData=null] - External SEO data object.
   * @param {Array<string>} [languages=[]] - Available languages.
   * @returns {Object} Resolved meta tags object.
   */
  _resolveMeta(route, lang, seoData = null, languages = []) {
    const { meta = {}, seoKey } = route;

    if (seoKey && seoData && seoData[seoKey]) {
      const seoEntry = seoData[seoKey];
      return seoEntry[lang] || seoEntry[Object.keys(seoEntry)[0]] || {};
    }

    const hasLangKeys = languages.some(
      (l) => meta[l] && typeof meta[l] === "object",
    );
    if (hasLangKeys) {
      return meta[lang] || meta[Object.keys(meta).find((k) => meta[k])] || {};
    }

    return meta;
  }

  /**
   * Registers a single SEO route with Template.renderReact.
   *
   * @private
   * @param {string} routePath - Express route path.
   * @param {string} component - React component name.
   * @param {Object} props - Props to pass to the component.
   * @param {Object} metaData - Resolved meta data.
   * @param {string} lang - Language code.
   */
  _registerSeoRoute(routePath, component, props, metaData, lang, options = {}) {
    const { seoData, languages } = options;

    this.get(routePath, (req, res) => {
      let activeLang = lang;

      const isDefaultRoute = !languages.some(l => req.path.startsWith(`/${l}`));
      if (isDefaultRoute && req.cookies?.blue_bird_lang && languages?.includes(req.cookies.blue_bird_lang)) {
        activeLang = req.cookies.blue_bird_lang;
      }
      if (req.query.source === "frontend" && req.query.lang && languages?.includes(req.query.lang)) {
        activeLang = req.query.lang;
        res.cookie("blue_bird_lang", activeLang, {
          maxAge: 31536000000,
          httpOnly: false,
          path: "/",
        });
      }

      let activeMeta = metaData;
      if (activeLang !== lang) {
        activeMeta = this._resolveMeta(
          { meta: metaData, seoKey: options.seoKey },
          activeLang,
          seoData,
          languages,
        );
      }

      const dynamicProps = {
        props: {
          ...props,
          params: req.params,
          query: req.query,
          lang: activeLang,
        },
      };

      const metaTags = {
        titleMeta: activeMeta.titleMeta || activeMeta.title || "",
        descriptionMeta: activeMeta.descriptionMeta || activeMeta.description || "",
        keywordsMeta: activeMeta.keywordsMeta || activeMeta.keywords || "",
        ogImage: activeMeta.ogImage || "",
        ogType: activeMeta.ogType || "website",
        twitterCard: activeMeta.twitterCard || "summary_large_image",
        langMeta: activeLang,
      };

      return Template.renderReact(res, component, dynamicProps, { metaTags });
    });
  }

  /**
   * Registers multiple routes based on an SEO configuration array.
   * Supports simple meta, inline multilingual meta, and external seoData files.
   * Automatically generates language-prefixed routes and registers sitemap.xml and robots.txt.
   *
   * @param {Array<Object>} routesConfig - Array of route objects.
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.languages=[]] - Languages to register (e.g., ["en", "es"]).
   * @param {string} [options.defaultLanguage="en"] - The default language for unprefixed paths.
   * @param {Object} [options.seoData=null] - External SEO data object (like seo.php pattern).
   *
   * @example
   * // Simple (no i18n)
   * router.seo([
   *   {
   *     path: "/",
   *     component: "Home",
   *     meta: { titleMeta: "Home", descriptionMeta: "Welcome" },
   *     props: { id: 1 }
   *   }
   * ]);
   *
   * @example
   * // Multilingual (inline)
   * router.seo([
   *   {
   *     path: "/",
   *     component: "Home",
   *     meta: {
   *       en: { titleMeta: "Home", descriptionMeta: "Welcome" },
   *       es: { titleMeta: "Inicio", descriptionMeta: "Bienvenido" }
   *     }
   *   }
   * ], { languages: ["en", "es"], defaultLanguage: "en" });
   *
   * @example
   * // Multilingual (external seoData file)
   * import seoData from "./seo.js";
   * router.seo([
   *   { path: "/", component: "Home", seoKey: "home" }
   * ], { languages: ["en", "es"], defaultLanguage: "en", seoData });
   */
  seo(routesConfig, options = {}) {
    const { languages = [], defaultLanguage = null, seoData = null } = options;
     
    const defaultLanguageOption = defaultLanguage || props.langMeta || "en";
     
      
     SEO.registerRoutes(this.router, routesConfig, options);

    routesConfig.forEach((route) => {
      const { path: routePath, component, props = {}, seoKey } = route;

      if (languages.length > 0) {
        languages.forEach((lang) => {
          const langMeta = this._resolveMeta(route, lang, seoData, languages);
          const langPath = `/${lang}${routePath === "/" ? "" : routePath}`;
          this._registerSeoRoute(
            langPath,
            component,
            props,
            langMeta,
            lang,
            { seoData, languages, seoKey },
          );
        });
 
        const defaultMeta = this._resolveMeta(
          route,
          defaultLanguageOption,
          seoData,
          languages,
        );
        this._registerSeoRoute(
          routePath,
          component,
          props,
          defaultMeta,
          defaultLanguageOption,
          { seoData, languages, seoKey },
        );
      } else {
        const meta = this._resolveMeta(route, defaultLanguageOption, seoData, []);
        this._registerSeoRoute(
          routePath,
          component,
          props,
          meta,
          defaultLanguageOption,
          { seoData, languages: [], seoKey },
        );
      }
    });
  }
}
export default Router;
