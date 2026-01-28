import Auth from "./auth.js";

/**
 * Common middlewares for the Blue Bird framework.
 */
const Middleware = {
    /**
     * Authentication protection middleware.
     * @type {Function}
     */
    auth: Auth.protect(),

    /**
     * Web authentication protection middleware (redirects to home if fails).
     * @type {Function}
     */
    webAuth: Auth.protect({ redirect: "/" }),

    /**
     * Logging middleware (can be extended).
     */
    logger: (req, res, next) => {
        next();
    }
};

export default Middleware;
