import express from "express";
import cors from "cors";
import path from "path";
import chalk from "chalk";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import compression from "compression";
import Config from "./config.js";
import Logger from "./logger.js";
import Debug from "./debug.js";

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
   * @param {boolean|Object} [options.swagger=false] - Enable swagger
   * @param {boolean} [options.compression=true] - Enable Gzip compression.
   * @example
   * const app = new App({
   *     routes: [],
   *     cors: {}, // { origin: "https://domain:port" }
   *     middlewares: [],
   *     port: 3000,
   *     host: "http://localhost",
   *     logger: true,
   *     notFound: true,
   *     json: true,
   *     urlencoded: true,
   *     static: {
   *         path: "public",
   *         options: {}
   *     },
   *      cookieParser: true,
   *      rateLimit: {
   *       windowMs: 10 * 60 * 1000,
   *        max: 50
   *         },
   *          swagger:{
   *          info: {
   *             title: "Blue Bird API",
   *             version: "1.0.0",
   *             description: "Blue Bird Framework API Documentation"
   *            },
   *           url : "http://localhost:8000"
   *          },
   *          compression: true
   * });
   */
  constructor(options = {}) {
    this.app = express();
    this.routes = options.routes || [];
    this.cors = options.cors || {};
    this.middlewares = options.middlewares || [];
    this.port = options.port || props.port;
    this.host = options.host || props.host;
    this.logger = options.logger ?? false;
    this.notFound = options.notFound ?? true;
    this.json = options.json ?? true;
    this.urlencoded = options.urlencoded ?? true;
    this.static = options.static || props.static;
    this.cookieParser = options.cookieParser ?? true;
    this.rateLimit = options.rateLimit ?? false;
    this.swagger = options.swagger ?? false;
    this.compression = options.compression ?? true;
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
   * @example
   * app.set("port", 3000);
   */
  set(key, value) {
    this.app.set(key, value);
  }

  /**
   * Bootstraps the application by configuring global middlewares and routes.
   * Sets up JSON parsing, URL encoding, CORS, and custom middlewares.
   * @private
   */
  async _dispatch() {
    if (this.compression) this.app.use(compression());
    if (this.json) this.app.use(express.json());
    if (this.urlencoded) this.app.use(express.urlencoded({ extended: true }));
    if (this.cookieParser) this.app.use(cookieParser());
    if (this.static.path)
      this.app.use(
        express.static(
          path.join(__dirname, this.static.path),
          this.static.options,
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

    if (this.logger) this._middlewareLogger();

    this.app.use((req, res, next) => {
      res.setHeader("X-Powered-By", "Blue Bird");
      next();
    });

    if (props.debug) {
      Debug.middlewareMetrics(this.app);
    }

    if (this.swagger) {
      const { default: Swagger } = await import("./swagger.js");
      const defaultSwaggerOptions = {
        info: {
          title: "Blue Bird API",
          version: "1.0.0",
          description: "Blue Bird Framework API Documentation",
        },
        url: `${this.host}:${this.port}`,
        route: "/docs",
      };

      const swaggerOptions = {
        ...defaultSwaggerOptions,
        ...(typeof this.swagger === "object" ? this.swagger : {}),
      };

      Swagger.init(this.app, swaggerOptions);
    }

    this._dispatchRoutes();

    if (this.notFound) this._notFoundDefault();

    this._errorHandler();
  }

  /**
   * Middleware that logs incoming HTTP requests to the console and to a log file.
   * @private
   */
  _middlewareLogger() {
    const logger = new Logger();
    this.app.use((req, res, next) => {
      const method = req.method;
      const url = req.url.replace(
        /(password|token|authorization)=([^&]+)/gi,
        "$1=***",
      );
      const params =
        Object.keys(req.params).length > 0
          ? ` ${JSON.stringify(req.params)}`
          : "";
      const ip = req.ip;
      const now = new Date().toISOString();
      const time = `${now.split("T")[0]} ${now.split("T")[1].split(".")[0]}`;
      let message = ` ${time} -${ip} -[${method}] ${url} ${params}`;

      logger.info(message);
      if (props.debug) {
        message = `${chalk.bold.green(time)} - ${chalk.bold.cyan(ip)} -[${chalk.bold.red(method)}] ${chalk.bold.blue(url)} ${chalk.bold.yellow(params)}`;
        console.log(message);
      }
      next();
    });
  }

  /**
   * Global error handler for the application.
   * Catches all errors and responds with a standardized JSON structure.
   * @private
   */
  _errorHandler() {
    this.app.use((err, req, res, next) => {
      const logger = new Logger();
      const status = err.status || 500;
      const message = err.message || "Internal Server Error";

      logger.error(`[${status}] ${message} - ${err.stack}`);

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
   * Returns a JSON response with a "Not Found" message.
   * @private
   */
  _notFoundDefault() {
    this.app.use((req, res) => {
      return res.status(404).json({ message: "Not Found" });
    });
  }
  /**
   * Starts the HTTP server and begins listening for incoming connections.
   * Waits for dispatch to complete before starting.
   */
  run() {
    this._ready
      .then(() => {
        this.app.listen(this.port, () => {
          console.log(
            chalk.bold.blue("Blue Bird Server Online\n") +
              chalk.bold.cyan("Host: ") +
              chalk.green(`${this.host}:${this.port}`) +
              "\n" +
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
