import express from "express"
import cors from "cors"
import path from "path"
import chalk from "chalk"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import xss from "xss"
import helmet from "helmet"
import Config from "./config.js"
import Logger from "./logger.js"
import Debug from "./debug.js"
import Swagger from "./swagger.js"

const __dirname = Config.dirname()
const props = Config.props()

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
     * @param {boolean|Object} [options.helmet=true] - Enable Helmet security headers.
     * @param {boolean} [options.xssClean=true] - Enable XSS body sanitization.
     * @param {boolean|Object} [options.swagger=false] - Enable swagger
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
     *          helmet:true,
     *          xssClean:true,
     *          swagger:{
     *          info: {
     *             title: "Blue Bird API",
     *             version: "1.0.0",
     *             description: "Blue Bird Framework API Documentation"
     *            },
     *           url : "http://localhost:8000"
     *          }
     * });
     */
    constructor(options = {
        routes: [],
        cors: {},
        middlewares: [],
        port: null,
        host: null,
        logger: true,
        notFound: true,
        json: true,
        urlencoded: true,
        static: {
            path: null,
            options: {}
        },
        cookieParser: true,
        rateLimit: false,
        helmet: false,
        xssClean: true,
        swagger: false

    }) {
        this.app = express()
        this.routes = options.routes || []
        this.cors = options.cors || {}
        this.middlewares = options.middlewares || []
        this.port = options.port || props.port
        this.host = options.host || props.host
        this.logger = options.logger ?? true
        this.notFound = options.notFound ?? true
        this.json = options.json ?? true
        this.urlencoded = options.urlencoded ?? true
        this.static = options.static || props.static
        this.cookieParser = options.cookieParser ?? true
        this.rateLimit = options.rateLimit ?? false
        this.helmet = options.helmet ?? true
        this.xssClean = options.xssClean ?? true
        this.swagger = options.swagger ?? false
        this.dispatch()

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
        this.app.use(record)
    }
    /**
     * Sets a configuration value in the Express application.
     * @param {string} key - The configuration key.
     * @param {*} value - The value to set for the configuration key.
     * @example
     * app.set("port", 3000);
     */
    set(key, value) {
        this.app.set(key, value)
    }

    /**
     * Bootstraps the application by configuring global middlewares and routes.
     * Sets up JSON parsing, URL encoding, CORS, and custom middlewares.
     */
    dispatch() {
        if (this.json) this.app.use(express.json())
        if (this.urlencoded) this.app.use(express.urlencoded({ extended: true }))
        if (this.cookieParser) this.app.use(cookieParser())
        if (this.static.path) this.app.use(express.static(path.join(__dirname, this.static.path), this.static.options))

        this.app.use(cors(this.cors))
        if (this.rateLimit) {
            if (!this.app.get('trust proxy')) {
                this.app.set('trust proxy', 1);
            }
            const defaultRateLimit = {
                windowMs: 15 * 60 * 1000,
                max: 100,
                standardHeaders: true,
                legacyHeaders: false,
                message: {
                    success: false,
                    message: "Too many requests, please try again later."
                }
            };
            const optionsRateLimiter = {
                ...defaultRateLimit,
                ...(typeof this.rateLimit === "object" ? this.rateLimit : {})
            };

            if (props.debug) {
                optionsRateLimiter.skip = (req) =>
                    req.path.startsWith("/debug");
            }

            const limiter = rateLimit(optionsRateLimiter);

            this.app.use(limiter);
        }
        if (this.helmet) {

            const defaultHelmetOptions = {
                contentSecurityPolicy: props.debug
                    ? false
                    : undefined
            };

            const helmetOptions = {
                ...defaultHelmetOptions,
                ...(typeof this.helmet === "object" ? this.helmet : {})
            };

            this.app.use(helmet(helmetOptions));
        }

        if (this.xssClean) {
            this.app.use(this.xssMiddleware());
        }
        this.middlewares.map(middleware => {
            this.app.use(middleware)
        })

        if (this.logger) this.middlewareLogger()

        this.app.use((req, res, next) => {
            res.setHeader('X-Powered-By', 'Blue Bird');
            next();
        });

        if (props.debug) {
            Debug.middlewareMetrics(this.app);
        }
        this.errorHandler();

        if (this.swagger) {

            const defaultSwaggerOptions = {
                info: {
                    title: "Blue Bird API",
                    version: "1.0.0",
                    description: "Blue Bird Framework API Documentation"
                },
                url: `${this.host}:${this.port}`,
                route: "/docs"
            };

            const swaggerOptions = {
                ...defaultSwaggerOptions,
                ...(typeof this.swagger === "object" ? this.swagger : {})
            };

            Swagger.init(this.app, swaggerOptions);
        }

        this.dispatchRoutes()

        if (this.notFound) this.notFoundDefault()
    }


    /**
     * Middleware that logs incoming HTTP requests to the console and to a log file.
     */
    middlewareLogger() {
        this.app.use((req, res, next) => {
            const method = req.method
            const url = req.url.replace(/(password|token|authorization)=([^&]+)/gi, "$1=***")
            const params = Object.keys(req.params).length > 0 ? ` ${JSON.stringify(req.params)}` : ""
            const ip = req.ip
            const now = new Date().toISOString()
            const time = `${now.split("T")[0]} ${now.split("T")[1].split(".")[0]}`
            let message = ` ${time} -${ip} -[${method}] ${url} ${params}`
            const logger = new Logger()
            logger.info(message)
            if (props.debug) {
                message = `${chalk.bold.green(time)} - ${chalk.bold.cyan(ip)} -[${chalk.bold.red(method)}] ${chalk.bold.blue(url)} ${chalk.bold.yellow(params)}`
                console.log(message)
            }
            next()
        })
    }
    errorHandler() {
        this.app.use((err, req, res, next) => {
            const logger = new Logger();
            logger.error(err.stack || err.message);

            if (props.debug) {
                return res.status(err.status || 500).json({
                    success: false,
                    message: err.message,
                    stack: err.stack
                });
            }

            return res.status(err.status || 500).json({
                success: false
            });
        });
    }

    sanitizeObject(obj) {
        if (typeof obj === "string") return xss(obj);

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        if (typeof obj === "object" && obj !== null) {
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = this.sanitizeObject(obj[key]);
            }
            return sanitized;
        }

        return obj;
    }

    xssMiddleware() {
        return (req, res, next) => {

            if (req.body && typeof req.body === "object") {
                this.mutateSanitized(req.body);
            }

            if (req.query && typeof req.query === "object") {
                this.mutateSanitized(req.query);
            }

            if (req.params && typeof req.params === "object") {
                this.mutateSanitized(req.params);
            }

            next();
        };
    }
    mutateSanitized(obj) {
        for (const key in obj) {
            if (typeof obj[key] === "string") {
                obj[key] = xss(obj[key]);
            } else if (typeof obj[key] === "object" && obj[key] !== null) {
                this.mutateSanitized(obj[key]);
            }
        }
    }
    /**
     * Iterates through the stored routes and attaches them to the Express application instance.
     */
    dispatchRoutes() {
        if (props.debug) {
            const debug = new Debug();
            const debugRouter = debug.getRouter();
            this.app.use(debugRouter.path, debugRouter.router);
        }
        this.routes.map(route => {
            this.app.use(route.path, route.router)
        })


    }
    /**
     * Default 404 handler for unmatched routes.
     * Returns a JSON response with a "Not Found" message.
     */
    notFoundDefault() {
        this.app.use((req, res) => {
            return res.status(404).json({ message: "Not Found" })
        });
    }
    /**
     * Starts the HTTP server and begins listening for incoming connections.
     */
    run() {
        this.app.listen(this.port, () => {
            console.log(
                chalk.bold.blue('Blue Bird Server Online\n') +
                chalk.bold.cyan('Host: ') + chalk.green(`${this.host}:${this.port}`) + '\n' +
                chalk.gray('────────────────────────────────')
            );
        });
    }
}

export default App

