import express from "express";
import Config from "./config.js";
import Template from "./template.js";

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
   * Registers multiple routes based on an SEO configuration array.
   * Supports both multi-language (e.g., en, es keys) and single-language (meta key) formats.
   *
   * @param {Array<Object>} routesConfig - Array of route objects.
   * @param {Object} [options={}] - Configuration options.
   * @param {Array<string>} [options.languages] - List of languages to register (e.g., ["en", "es"]).
   * @param {string} [options.defaultLanguage="en"] - The default language for the base path.
   * @param {Function} [options.templateRenderer] - Optional custom template renderer (defaults to Template.renderReact).
   *
   * @example
   * router.seo([
   *  {
   *      path: "/",
   *      component: "Home",
   *      meta: { titleMeta: "Home - Blue Bird", descriptionMeta: "Welcome to Blue Bird" },
   *      props: { id: 1, name: "Name 1" }
   *  },
   *  {
   *      path: "/about",
   *      component: "About",
   *      meta: { titleMeta: "About - Blue Bird", descriptionMeta: "About blue bird" },
   *      props: { id: 2, name: "Name 2" }
   *  }
   * ], { languages: ["en", "es"], defaultLanguage: "en" });
   */
  seo(routesConfig, options = {}) {
    const {
      languages = [],
      defaultLanguage = "en",
      templateRenderer,
    } = options;

    const render =
      templateRenderer ||
      ((res, component, props, renderOptions) => {
        return Template.renderReact(res, component, props, renderOptions);
      });

    routesConfig.forEach((route) => {
      const { path, component, props = {}, meta = {} } = route;

      const detectedLanguages =
        languages.length > 0
          ? languages
          : Object.keys(route).filter((key) => key.length === 2);

      if (detectedLanguages.length > 0) {
        const pathsToRegister = [];
        const langMap = {};

        if (Object.keys(meta).length > 0 || route.titleMeta) {
          pathsToRegister.push(path);
          langMap[defaultLanguage] = {
            title: route.titleMeta || meta.title,
            desc: route.descriptionMeta || meta.description || meta.desc,
            keywords: route.keywordsMeta || meta.keywords,
          };
        }

        detectedLanguages.forEach((lang) => {
          if (typeof route[lang] === "object") {
            const isDefault = lang === defaultLanguage;
            const langPath = isDefault
              ? path
              : `/${lang}${path === "/" ? "" : path}`;
            if (!pathsToRegister.includes(langPath)) {
              pathsToRegister.push(langPath);
            }
            langMap[lang] = route[lang];
          }
        });

        if (pathsToRegister.length > 0) {
          this.get(pathsToRegister, (req, res) => {
            let currentLang = defaultLanguage;
            const pathParts = req.path.split("/");
            if (
              pathParts.length > 1 &&
              pathParts[1].length === 2 &&
              detectedLanguages.includes(pathParts[1])
            ) {
              currentLang = pathParts[1];
            }

            const langData =
              langMap[currentLang] || langMap[defaultLanguage] || {};

            const dynamicProps = {
              props: {
                ...props,
                params: req.params,
                query: req.query,
              },
            };

            return render(res, component, dynamicProps, {
              metaTags: {
                titleMeta:
                  langData.title || langData.titleMeta || meta.titleMeta,
                descriptionMeta:
                  langData.desc ||
                  langData.description ||
                  langData.descriptionMeta ||
                  meta.descriptionMeta,
                keywordsMeta:
                  langData.keywords ||
                  langData.keywordsMeta ||
                  meta.keywordsMeta,
                langMeta: currentLang,
              },
            });
          });
        }
      } else {
        if (Object.keys(meta).length > 0 || route.titleMeta) {
          this.get(path, (req, res) => {
            const dynamicProps = {
              props: {
                ...props,
                params: req.params,
                query: req.query,
              },
            };
            return render(res, component, dynamicProps, {
              metaTags: meta.titleMeta
                ? meta
                : {
                    titleMeta: route.titleMeta || meta.title,
                    descriptionMeta:
                      route.descriptionMeta || meta.description || meta.desc,
                    keywordsMeta: route.keywordsMeta || meta.keywords,
                  },
            });
          });
        }
      }
    });
  }
}
export default Router;
