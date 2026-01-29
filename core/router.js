import express from "express";
import Config from "./config.js";

const __dirname = Config.dirname()
const props = Config.props()

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
        this.router = express.Router()
        this.path = path
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
            path = /.*/
        }
        this.router.get(path, callback)
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
            path = /.*/
        }
        this.router.post(path, callback)
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
        this.router.put(path, callback)
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
        this.router.delete(path, callback)
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
        this.router.patch(path, callback)
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
        this.router.options(path, callback)
    }

    /**
     * Returns the underlying Express router instance.
     * @returns {import('express').Router} The Express router object.
     */
    getRouter() {
        return this.router
    }

    /**
     * Returns the base path associated with this router.
     * @returns {string} The router path.
     */
    getPath() {
        return this.path
    }
}
export default Router;