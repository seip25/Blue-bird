import express from "express";
import cors from "cors";
import path from "path";
import fs from "node:fs";
import chalk from "chalk";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import compression from "compression";
import Config from "./config.js";
import Logger from "./logger.js";
import Debug from "./debug.js";
import Template from "./template.js";
import SEO from "./seo.js";

const __dirname = Config.dirname();
const props = Config.props();

/**
 * Main Application class to manage Express server, routes, and middlewares.
 */
class App {
  /**
   * Initializes the App instance with the provided options.
   * @param {Object} [options] - Configuration options for the application.
   * @param {Array<{path: string, router: import('express').Router}>} [options.routes=[]] - Array of route objects containing path and router components.
   * @param {Object} [options.cors={}] - CORS configuration options.
   * @param {Array<Function>} [options.middlewares=[]] - Array of middleware functions to be applied.
   * @param {number|string} [options.port=3000] - Server port.
   * @param {string} [options.host="http://localhost"] - Server host URL.
   * @param {boolean} [options.logger=true] - Whether to enable the request logger.
   * @param {boolean} [options.notFound=true] - Whether to enable the default 404 handler.
   * @param {boolean} [options.json=true] - Whether to enable JSON body parsing.
   * @param {boolean} [options.urlencoded=true] - Whether to enable URL-encoded body parsing.
   * @param {Object} [options.static={path: null, options: {}}] - Static file configuration.
   * @param {boolean} [options.cookieParser=true] - Whether to enable cookie parsing.
   * @param {boolean|Object} [options.rateLimit=false] - Enable global rate limiting.
   * @param {boolean|Object} [options.swagger=false] - Enable swagger.
   * @param {boolean} [options.compression=true] - Enable Gzip compression.
   * @example
   * const app = new App({
   *     routes: [],
   *     cors: {},
   *     middlewares: [],
   *     port: 3000,
   *     host: "http://localhost",
   *     logger: true,
   *     notFound: true,
   *     json: true,
   *     urlencoded: true,
   *     static: { path: "public", options: {} },
   *     cookieParser: true,
   *     rateLimit: { windowMs: 10 * 60 * 1000, max: 50 },
   *     swagger: {
   *         info: { title: "Blue Bird API", version: "1.0.0", description: "API Documentation" },
   *         url: "http://localhost:8000"
   *     },
   *     compression: true
   * });
   */
  constructor(options = {}) {
    this.app = express();
    this.routes = options.routes || [];
    this.cors = options.cors || {};
    this.middlewares = options.middlewares || [];
    this.port = options.port || props.port;
    this.host = options.host || props.host;
    this.appUrl = options.appUrl || props.appUrl;
    this.logger = options.logger ?? false;
    this.notFound = options.notFound ?? true;
    this.json = options.json ?? true;
    this.urlencoded = options.urlencoded ?? true;
    this.static = options.static || props.static;
    this.cookieParser = options.cookieParser ?? true;
    this.rateLimit = options.rateLimit ?? false;
    this.swagger = options.swagger ?? false;
    this.compression = options.compression ?? true;
    this.loggerInstance = new Logger();
    /** @type {Set<import('http').ServerResponse>} */
    this._hotReloadClients = new Set();
    this._ready = this._dispatch();
  }

  /**
   * Registers a custom middleware or module in the Express application.
   * @param {Function|import('express').Router} record - The middleware function or Express router to register.
   * @example
   * app.use((req, res, next) => {
   *     console.log("Middleware");
   *     next();
   * });
   */
  use(record) {
    this.app.use(record);
  }

  /**
   * Sets a configuration value in the Express application.
   * @param {string} key - The configuration key.
   * @param {*} value - The value to set for the configuration key.
   */
  set(key, value) {
    this.app.set(key, value);
  }

  /**
   * Bootstraps the application by configuring global middlewares and routes.
   * @private
   */
  async _dispatch() {
    if (this.compression) this.app.use(compression());
    if (this.json) this.app.use(express.json());
    if (this.urlencoded) this.app.use(express.urlencoded({ extended: true }));
    if (this.cookieParser) this.app.use(cookieParser());

    this.app.use((req, res, next) => {
      req.lang = req.query?.lang || req.body?.lang || req.cookies?.lang || "en";
      res.locals.lang = req.lang;
      next();
    });

    if (this.static.path)
      this.app.use(
        express.static(
          path.join(__dirname, this.static.path),
          { ...this.static.options, setHeaders: (res) => {
            res.setHeader("X-Powered-By", "Blue Bird"); 
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }},
        ),
      );

    this.app.use(cors(this.cors));
    if (this.rateLimit) {
      if (!this.app.get("trust proxy")) {
        this.app.set("trust proxy", 1);
      }
      const defaultRateLimit = {
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message: "Too many requests, please try again later.",
        },
      };
      const optionsRateLimiter = {
        ...defaultRateLimit,
        ...(typeof this.rateLimit === "object" ? this.rateLimit : {}),
      };

      if (props.debug) {
        optionsRateLimiter.skip = (req) => req.path.startsWith("/debug");
      }

      const limiter = rateLimit(optionsRateLimiter);
      this.app.use(limiter);
    }

    this.middlewares.forEach((middleware) => {
      this.app.use(middleware);
    });

    if (this.logger || props.debug) this._middlewareLogger(this.logger);

    this.app.use((req, res, next) => {
      res.setHeader("X-Powered-By", "Blue Bird"); 
       next();
    });

    if (props.debug) {
      Debug.middlewareMetrics(this.app);
      this._setupHotReload();
    }

    if (this.swagger) {
      const { default: Swagger } = await import("./swagger.js");
      const defaultSwaggerOptions = {
        info: {
          title: "Blue Bird API",
          version: "1.0.0",
          description: "Blue Bird Framework API Documentation",
        },
        url: this.appUrl ? this.appUrl : `${this.host}:${this.port}`,
        route: "/docs",
      };

      const swaggerOptions = {
        ...defaultSwaggerOptions,
        ...(typeof this.swagger === "object" ? this.swagger : {}),
      };

      Swagger.init(this.app, swaggerOptions);
    }

    this._dispatchRoutes();

    SEO.registerEndpoints(this.app);

    if (this.notFound) this._notFoundDefault();

    this._errorHandler();
  }

  /**
   * Sets up hot-reload using Server-Sent Events (SSE).
   * Watches the frontend/ directory for .html, .css, .js file changes and notifies connected browsers.
   * Also clears the Template cache on file changes so fresh content is served.
   * Only active when DEBUG=true in .env.
   * @private
   */
  _setupHotReload() {
    this.app.get("/__hot-reload", (req, res) => {
      res.setHeader("x-no-compression", "true");
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write("data: connected\n\n");
      if (typeof res.flush === "function") {
        res.flush();
      }
      this._hotReloadClients.add(res);
      req.on("close", () => {
        this._hotReloadClients.delete(res);
      });
    });

    const frontendPath = path.join(__dirname, "frontend");
    let debounceTimer = null;

    const notifyClients = () => {
      this._hotReloadClients.forEach((client) => {
        try {
          client.write("data: reload\n\n");
          if (typeof client.flush === "function") {
            client.flush();
          }
        } catch (_) {
          this._hotReloadClients.delete(client);
        }
      });
    };

    try {
      fs.watch(frontendPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        if (/\.(html|css|js)$/i.test(filename)) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log(chalk.magenta(`[Hot Reload] ${filename} changed`));
            Template.clearCache();
            notifyClients();
          }, 200);
        }
      });
    } catch (_) {
      console.log(chalk.yellow("[Hot Reload] Could not watch frontend/ directory"));
    }
  }

  /**
   * Middleware that logs incoming HTTP requests to the console and to a log file.
   * @private
   * @param {boolean} [logger=false]
   */
  _middlewareLogger(logger = false) {
    this.app.use((req, res, next) => {
      const method = req.method;
      const url = req.url.replace(
        /(password|token|authorization)=([^&]+)/gi,
        "$1=***",
      );
      if (url.includes("chrome")) return;
      const params =
        Object.keys(req.params).length > 0
          ? ` ${JSON.stringify(req.params)}`
          : "";
      const ip = req.ip;
      const now = new Date().toISOString();
      const time = `${now.split("T")[0]} ${now.split("T")[1].split(".")[0]}`;
      let message = ` ${time} -${ip} -[${method}] ${url} ${params}`;

      if (logger) this.loggerInstance.info(message);

      if (props.debug) {
        message = `${chalk.bold.green(time)} - ${chalk.bold.cyan(ip)} -[${chalk.bold.red(method)}] ${chalk.bold.blue(url)} ${chalk.bold.yellow(params)}`;
        console.log(message);
      }
      next();
    });
  }

  /**
   * Global error handler for the application.
   * @private
   */
  _errorHandler() {
    this.app.use((err, req, res, next) => {
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";

      this.loggerInstance.error(`[${status}] ${message} - ${err.stack}`);

      if (props.debug) {
        return res.status(status).json({
          success: false,
          error: true,
          message: message,
          stack: err.stack,
        });
      }

      return res.status(status).json({
        success: false,
        error: true,
        message: status === 500 ? "Internal Server Error" : message,
      });
    });
  }

  /**
   * Iterates through the stored routes and attaches them to the Express application instance.
   * @private
   */
  _dispatchRoutes() {
    if (props.debug) {
      const debug = new Debug();
      const debugRouter = debug.getRouter();
      this.app.use(debugRouter.path, debugRouter.router);
    }
    this.routes.forEach((route) => {
      this.app.use(route.path, route.router);
    });
  }

  /**
   * Default 404 handler for unmatched routes.
   * @private
   */
  _notFoundDefault() {
    this.app.use((req, res) => {
      return res.status(404).json({ message: "Not Found" });
    });
  }

  /**
   * Starts the HTTP server and begins listening for incoming connections.
   */

  run() {
    this._ready
      .then(() => {
        this.app.listen(this.port, () => {
          console.log(
            chalk.bold.blue("Blue Bird Server Online\n") +
            chalk.bold.cyan("App URL: ") +
            chalk.green(`${this.appUrl}`) +
            "\n" +
            chalk.bold.cyan("Internal: ") +
            chalk.green(`${this.host}:${this.port}`) +
            "\n" +
            (props.debug ? chalk.bold.magenta("Hot Reload: enabled\n") : "") +
            chalk.gray("────────────────────────────────"),
          );
        });
      })
      .catch((err) => {
        console.error(
          chalk.bold.red("Failed to start Blue Bird:"),
          err.message,
        );
        process.exit(1);
      });
  }

  /**
   * Returns a pre-configured Helmet middleware for use on specific routers.
   * @param {Object} [options={}] - Helmet options to override defaults.
   * @returns {Function} Helmet middleware function.
   * @example
   * const router = new Router("/web");
   * router.use(App.helmet({ contentSecurityPolicy: false }));
   */
  static helmet(options = {}) {
    const defaultOptions = {
      contentSecurityPolicy: props.debug ? false : undefined,
    };
    return helmet({ ...defaultOptions, ...options });
  }
}

export default App;
