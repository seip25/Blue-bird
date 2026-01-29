import express from "express"
import cors from "cors"
import path from "path"
import chalk from "chalk"
import cookieParser from "cookie-parser"
import Config from "./config.js"
import Logger from "./logger.js"

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

    }) {
        this.app = express()
        this.routes = options.routes || []
        this.cors = options.cors || {}
        this.middlewares = options.middlewares || []
        this.port = options.port || props.port
        this.host = options.host || props.host
        this.logger = options.logger || true
        this.notFound = options.notFound || true
        this.json = options.json || true
        this.urlencoded = options.urlencoded || true
        this.static = options.static || props.static
        this.cookieParser = options.cookieParser || true
        this.dispatch()

    }

    /**
     * Registers a custom middleware or module in the Express application.
     * @param {Function|import('express').Router} record - The middleware function or Express router to register.
     */
    use(record) {
        this.app.use(record)
    }
    /**
     * Sets a configuration value in the Express application.
     * @param {string} key - The configuration key.
     * @param {*} value - The value to set for the configuration key.
     */
    set (key, value) {
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
        this.middlewares.map(middleware => {
            this.app.use(middleware)
        })
        if (this.logger) this.middlewareLogger()
        this.app.use((req, res, next) => {
            res.setHeader('X-Powered-By', 'Blue Bird');
            next();
        });
        this.dispatchRoutes()

        if (this.notFound) this.notFoundDefault()
    }


    /**
     * Middleware that logs incoming HTTP requests to the console and to a log file.
     */
    middlewareLogger() {
        this.app.use((req, res, next) => {
            const method = req.method
            const url = req.url
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

    /**
     * Iterates through the stored routes and attaches them to the Express application instance.
     */
    dispatchRoutes() {
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

