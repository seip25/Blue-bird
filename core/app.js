import http from "node:http";
import express from "express";
import cors from "cors";
import path from "path";
import chalk from "chalk";
import cookieParser from "cookie-parser";
import compression from "compression";
import Config from "./config.js";
import Logger from "./logger.js";
import Debug from "./debug.js";
import WebSocketManager from "./ws.js";

const __dirname = Config.dirname();
const props = Config.props();

/**
 * Generates a middleware that applies security response headers without external dependencies.
 * Covers X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy,
 * and Permissions-Policy. Content-Security-Policy is opt-in via options.
 * @param {Object} [options={}] - Options to override header values.
 * @param {string|false} [options.csp=false] - Content-Security-Policy header value. Set to false to disable.
 * @returns {Function} Express middleware.
 */
function securityHeaders(options = {}) {
  return (req, res, next) => {
    res.setHeader("X-Frame-Options", options.frameOptions ?? "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", options.referrerPolicy ?? "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      options.permissionsPolicy ?? "camera=(), microphone=(), geolocation=()"
    );
    if (options.csp) {
      res.setHeader("Content-Security-Policy", options.csp);
    }
    next();
  };
}

/**
 * Main Application class to manage Express server, routes, and middlewares.
 */
class App {
  /**
   * Initializes the App instance with the provided options.
   * @param {Object} [options={}] - Configuration options for the application.
   * @param {Array<{path: string, router: import('express').Router}>} [options.routes=[]] - Route objects.
   * @param {Object} [options.cors={}] - CORS configuration options.
   * @param {Array<Function>} [options.middlewares=[]] - Global middleware functions.
   * @param {number|string} [options.port=3000] - Server port.
   * @param {string} [options.host="http://localhost"] - Server host URL.
   * @param {boolean} [options.logger=false] - Whether to enable the request logger.
   * @param {boolean} [options.notFound=true] - Whether to enable the default 404 handler.
   * @param {boolean} [options.json=true] - Whether to enable JSON body parsing.
   * @param {boolean} [options.urlencoded=true] - Whether to enable URL-encoded body parsing.
   * @param {Object} [options.static] - Static file configuration for public/ directory.
   * @param {boolean} [options.cookieParser=true] - Whether to enable cookie parsing.
   * @param {boolean} [options.swagger=false] - Enable Swagger documentation.
   * @param {boolean} [options.compression=true] - Enable gzip/brotli compression.
   * @param {boolean|Object} [options.security=true] - Enable built-in security headers middleware.
   */
  constructor(options = {}) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wsManager = null;
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
    this.swagger = options.swagger ?? false;
    this.compression = options.compression ?? true;
    this.security = options.security ?? true;
    this.loggerInstance = new Logger();
    /** @type {Set<import('http').ServerResponse>} */
    this._hotReloadClients = new Set();
    this._ready = this._dispatch();
  }

  /**
   * Registers a custom middleware or module in the Express application.
   * @param {Function|import('express').Router} record - Middleware function or Express router.
   */
  use(record) {
    this.app.use(record);
  }

  /**
   * Sets a configuration value in the Express application.
   * @param {string} key - Configuration key.
   * @param {*} value - Configuration value.
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
    if (this.security) {
      this.app.use(securityHeaders(typeof this.security === "object" ? this.security : {}));
    }

    this.app.use(cors(this.cors));

    this.app.use((req, res, next) => {
      req.lang = req.query?.lang || req.body?.lang || req.cookies?.lang || "en";
      res.locals.lang = req.lang;

      res.success = (data = null, message = "Success", statusCode = 200) =>
        res.status(statusCode).json({ status: "success", message, data });

      res.error = (message = "Error", statusCode = 400, errors = []) =>
        res.status(statusCode).json({ status: "error", message, errors });

      res.ok = (data = null, message = "Success") => res.success(data, message, 200);

      res.created = (data = null, message = "Created") => res.success(data, message, 201);

      res.badRequest = (message = "Bad Request", errors = []) => res.error(message, 400, errors);

      res.unauthorized = (message = "Unauthorized") => res.error(message, 401);

      res.forbidden = (message = "Forbidden") => res.error(message, 403);

      res.notFound = (message = "Not Found") => res.error(message, 404);

      res.serverError = (message = "Internal Server Error", errors = []) => res.error(message, 500, errors);

      res.paginate = (data = [], pagination = {}, message = "Success") => {
        const page = Number(pagination.page) || 1;
        const limit = Number(pagination.limit) || data.length;
        const total = Number(pagination.total) || data.length;
        const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
        return res.status(200).json({ status: "success", message, data, pagination: { page, limit, total, totalPages } });
      };

      res.setHeader("X-Powered-By", "Blue Bird");
      next();
    });

    this.app.get("/api/health", (req, res) =>
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: props.debug ? "development" : "production",
        memory: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        },
      })
    );

    const staticPath = this.static?.path || "public";
    const staticOptions = this.static?.options || {};
    const isDebug = props.debug;

    this.app.use(
      express.static(path.join(__dirname, staticPath), {
        ...staticOptions,
        setHeaders: (res) => {
          res.setHeader("X-Powered-By", "Blue Bird");
          res.setHeader(
            "Cache-Control",
            isDebug ? "no-cache" : "public, max-age=2592000, immutable"
          );
        },
      })
    );

    this.middlewares.forEach((middleware) => {
      this.app.use(middleware);
    });

    if (this.logger || props.debug) this._middlewareLogger(this.logger);

    if (props.debug) {
      Debug.middlewareMetrics(this.app);
    }

    if (this.swagger) {
      const { default: Swagger } = await import("./swagger.js");
      const defaultSwaggerOptions = {
        info: { title: "Blue Bird API", version: "1.0.0", description: "Blue Bird Framework API Documentation" },
        url: this.appUrl ? this.appUrl : `${this.host}:${this.port}`,
        route: "/docs",
      };
      Swagger.init(this.app, {
        ...defaultSwaggerOptions,
        ...(typeof this.swagger === "object" ? this.swagger : {}),
      });
    }

    this._dispatchRoutes();

    if (this.notFound) this._notFoundDefault();

    this._errorHandler();
  }

  /**
   * Middleware that logs incoming HTTP requests.
   * @private
   * @param {boolean} [logger=false]
   */
  _middlewareLogger(logger = false) {
    this.app.use((req, res, next) => {
      const method = req.method;
      const url = req.url.replace(/(password|token|authorization)=([^&]+)/gi, "$1=***");
      if (url.includes("chrome")) return next();
      const params = Object.keys(req.params).length > 0 ? ` ${JSON.stringify(req.params)}` : "";
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
      const statusCode = err.statusCode || err.status || 500;
      const message = err.message || "Internal Server Error";
      const errors = err.errors || [];

      this.loggerInstance.error(`[${statusCode}] ${message} - ${err.stack}`);

      const payload = {
        status: "error",
        message: statusCode === 500 && !props.debug ? "Internal Server Error" : message,
        errors,
      };

      if (props.debug && err.stack) payload.stack = err.stack;

      return res.status(statusCode).json(payload);
    });
  }

  /**
   * Attaches all registered routes to the Express application.
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
      const expectsHtml = req.headers.accept?.includes("text/html") && !req.path.startsWith("/api");
      if (expectsHtml) return res.status(404).send("<h1>404 Not Found</h1>");
      return res.status(404).json({ message: "Not Found" });
    });
  }

  /**
   * Starts the HTTP server and listens for incoming connections.
   */
  run() {
    this._ready
      .then(() => {
        this.server.listen(this.port, () => {
          console.log(
            chalk.bold.blue("Blue Bird Server Online\n") +
            chalk.bold.cyan("App URL: ") +
            chalk.green(`${this.appUrl}`) +
            "\n" +
            chalk.bold.cyan("Internal: ") +
            chalk.green(`${this.host}:${this.port}`) +
            "\n" +
            (props.debug ? chalk.bold.magenta("Hot Reload: enabled\n") : "") +
            chalk.gray("────────────────────────────────")
          );
        });
      })
      .catch((err) => {
        console.error(chalk.bold.red("Failed to start Blue Bird:"), err.message);
        process.exit(1);
      });
  }

  /**
   * Closes the running HTTP server.
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  }

  /**
   * Initializes and returns the WebSocket manager attached to the HTTP server.
   * @param {Function|Object} [options] - Connection callback or options object.
   * @returns {WebSocketManager}
   */
  websocket(options = {}) {
    const handler = typeof options === "function" ? options : null;
    const wsOptions = typeof options === "object" && options !== null ? options : {};

    if (!this.wsManager) {
      this.wsManager = new WebSocketManager(this.server, wsOptions);
    }
    if (handler) {
      this.wsManager.onConnection(handler);
    }
    return this.wsManager;
  }

  /**
   * Returns a pre-configured Helmet middleware for use on specific routers.
   * Requires helmet to be installed: npx blue-bird add helmet
   * @param {Object} [options={}] - Helmet options.
   * @returns {Function} Helmet middleware.
   */
  static async helmet(options = {}) {
    try {
      const { default: helmet } = await import("helmet");
      const defaultOptions = { contentSecurityPolicy: props.debug ? false : undefined, hidePoweredBy: false };
      return helmet({ ...defaultOptions, ...options });
    } catch {
      throw new Error("[APP] helmet is not installed. Run: npx blue-bird add helmet");
    }
  }

  /**
   * Returns the built-in security headers middleware without requiring helmet.
   * @param {Object} [options={}] - Options for header values.
   * @returns {Function} Express middleware.
   */
  static securityHeaders(options = {}) {
    return securityHeaders(options);
  }
}

/**
 * Operational application error class for standardizing custom API errors.
 */
export class AppError extends Error {
  /**
   * Creates an AppError instance.
   * @param {string} message - Error message.
   * @param {number} [statusCode=500] - HTTP status code.
   * @param {Array|Object} [errors=[]] - Detailed error list.
   */
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default App;
