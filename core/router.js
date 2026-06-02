import express from "express";
import Config from "./config.js";
import SEO from "./seo.js";

const props = Config.props();

/**
 * Router wrapper class for handling Express routing logic.
 * When created with { seo: true }, all GET routes registered on this router
 * are automatically included in the generated sitemap.xml and robots.txt.
 */
class Router {
  /**
   * Creates a new Router instance.
   * @param {string} [path="/"] - The base path for this router.
   * @param {Object} [options={}] - Router configuration options.
   * @param {boolean} [options.seo=false] - When true, GET routes on this router are included in sitemap/robots.txt.
   * @param {string[]} [options.languages=[]] - Language prefixes for SEO route generation (e.g., ["en", "es"]).
   * @example
   * const router = new Router("/", { seo: true, languages: ["en", "es"] });
   * router.get("/", (req, res) => {
   *     Template.render(res, "index", { metaTags: { titleMeta: "Home" } });
   * });
   */
  constructor(path = "/", options = {}) {
    this.router = express.Router();
    this.path = path;
    this._seo = options.seo ?? false;
    this._languages = options.languages || [];
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
   * If this router was created with { seo: true }, the route path is automatically
   * registered for sitemap.xml and robots.txt generation.
   * @param {string} path - The relative path for the GET route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.get("/about", (req, res) => {
   *     Template.render(res, "about", {
   *         metaTags: { titleMeta: "About Us" }
   *     });
   * });
   */
  get(path, ...callback) {
    if (path === "/*" || path === "*") {
      path = /.*/;
    }
    if (this._seo && typeof path === "string") {
      const fullPath = this.path === "/" ? path : `${this.path}${path}`;
      const normalizedPath = fullPath === "//" ? "/" : fullPath.replace(/\/+/g, "/");
      SEO.addRoute(normalizedPath, this._languages);
    }
    this.router.get(path, callback);
  }

  /**
   * Registers a POST route handler.
   * @param {string} path - The relative path for the POST route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   * @example
   * router.post("/users", (req, res) => {
   *     res.json({ message: "User created successfully" })
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
   * router.put("/users/:id", (req, res) => {
   *     res.json({ message: "User updated successfully" })
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
   * router.delete("/users/:id", (req, res) => {
   *     res.json({ message: "User deleted successfully" })
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
   * router.patch("/users/:id", (req, res) => {
   *     res.json({ message: "User patched successfully" })
   * })
   */
  patch(path, ...callback) {
    this.router.patch(path, callback);
  }

  /**
   * Registers an OPTIONS route handler.
   * @param {string} path - The relative path for the OPTIONS route.
   * @param {...Function} callback - One or more handler functions (middlewares and controller).
   */
  options(path, ...callback) {
    this.router.options(path, callback);
  }

  /**
   * Returns the underlying Express router instance.
   * @returns {import('express').Router}
   */
  getRouter() {
    return this.router;
  }

  /**
   * Returns the base path associated with this router.
   * @returns {string}
   */
  getPath() {
    return this.path;
  }
}
export default Router;
