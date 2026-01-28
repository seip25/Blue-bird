import jwt from "jsonwebtoken";

/**
 * Auth class to handle JWT generation, verification and protection.
 */
class Auth {
    /**
     * Generates a JWT token.
     * @param {Object} payload - The data to store in the token.
     * @param {string} [secret=process.env.JWT_SECRET] - The secret key.
     * @param {string|number} [expiresIn='24h'] - Expiration time.
     * @returns {string} The generated token.
     */
    static generateToken(payload, secret = process.env.JWT_SECRET || 'blue-bird-secret', expiresIn = '24h') {
        return jwt.sign(payload, secret, { expiresIn });
    }

    /**
     * Verifies a JWT token.
     * @param {string} token - The token to verify.
     * @param {string} [secret=process.env.JWT_SECRET] - The secret key.
     * @returns {Object|null} The decoded payload or null if invalid.
     */
    static verifyToken(token, secret = process.env.JWT_SECRET || 'blue-bird-secret') {
        try {
            return jwt.verify(token, secret);
        } catch (error) {
            return null;
        }
    }

    /**
     * Middleware to protect routes. Checks for token in Cookies or Authorization header.
     * @param {Object} options - Options for protection.
     * @param {string} [options.redirect] - URL to redirect if not authenticated (for web routes).
     * @returns {Function} Express middleware.
     */
    static protect(options = { redirect: null }) {
        return (req, res, next) => {
            const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

            if (!token) {
                if (options.redirect) return res.redirect(options.redirect);
                return res.status(401).json({ message: "Unauthorized: No token provided" });
            }

            const decoded = this.verifyToken(token);
            if (!decoded) {
                if (options.redirect) return res.redirect(options.redirect);
                return res.status(401).json({ message: "Unauthorized: Invalid token" });
            }

            req.user = decoded;
            next();
        };
    }
}

export default Auth;
