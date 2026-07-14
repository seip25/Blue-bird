import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import Config from "./config.js";
import { getRedisClient } from "./cache.js";

const propsConfig = Config.props();
const jwtSecret = propsConfig.jwtSecret;
const production = !propsConfig.debug;
/**
 * Auth class to handle JWT generation, verification and protection with AES-256-GCM encryption.
 */
class Auth {
  /**
   * Encrypts a payload using AES-256-GCM.
   * @param {Object} payload - The data to encrypt.
   * @param {string} secret - The secret key for encryption.
   * @returns {string} The encrypted string in format iv:tag:encrypted.
   */
  static encrypt(payload, secret) {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash("sha256").update(secret).digest();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${tag}:${encrypted}`;
  }

  /**
   * Decrypts a payload using AES-256-GCM.
   * @param {string} data - The encrypted string in format iv:tag:encrypted.
   * @param {string} secret - The secret key for decryption.
   * @returns {Object|null} The decrypted object or null if failed.
   */
  static decrypt(data, secret) {
    try {
      const [ivHex, tagHex, encryptedHex] = data.split(":");
      if (!ivHex || !tagHex || !encryptedHex) return null;

      const iv = Buffer.from(ivHex, "hex");
      const tag = Buffer.from(tagHex, "hex");
      const key = crypto.createHash("sha256").update(secret).digest();
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generates an encrypted JWT token.
   * @param {Object} payload - The data to store in the token.
   * @param {string} [secret=process.env.JWT_SECRET] - The secret key .
   * @param {string} [expiresIn="24h"] - Expiration time.
   * @returns {string} The generated token.
   */
  static generateToken(payload, secret = jwtSecret, expiresIn = "24h") {
    if (!secret)
      throw new Error("FATAL: JWT_SECRET environment variable is not defined.");
    const encrypted = this.encrypt(payload, secret);
    return jwt.sign({ data: encrypted }, secret, { expiresIn });
  }

  /**
   * Verifies and decrypts a JWT token.
   * @param {string} token - The token to verify.
   * @param {string} [secret=process.env.JWT_SECRET] - The secret key.
   * @returns {Object|null} The decoded and decrypted payload or null if invalid.
   */
  static verifyToken(token, secret = jwtSecret) {
    if (!secret)
      throw new Error("FATAL: JWT_SECRET environment variable is not defined.");
    try {
      const decoded = jwt.verify(token, secret);
      if (!decoded || !decoded.data) return null;
      return this.decrypt(decoded.data, secret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Middleware to protect routes. Checks for token in Cookies or Authorization header.
   * @param {Object} [options={}] - Options for protection.
   * @param {string} [options.redirect=null] - URL to redirect if not authenticated.
   * @param {string} [options.key="user"] - Key to store the decoded token in the request.
   * @param {string} [options.cookieKey="auth"] - The cookie key to look for the token.
   * @returns {Function} Express middleware.
   * @example
   * router.get("/profile", Auth.protect(), (req, res) => { ... });
   * // Or with custom cookie key:
   * router.get("/admin", Auth.protect({ cookieKey: "admin_session" }), (req, res) => { ... });
   */
  static protect(options = {}) {
    const { redirect = null, key = "user", cookieKey = "auth" } = options;

    return async (req, res, next) => {
      const token =
        req.cookies?.[cookieKey] || req.headers.authorization?.split(" ")[1];

      const isContentTypeJson =
        req.headers["content-type"] === "application/json";

      if (!token) {
        if (redirect && !isContentTypeJson) return res.redirect(redirect);
        return isContentTypeJson
          ? res.status(401).json({ message: "Unauthorized" })
          : res.status(401).send();
      }

      const decoded = this.verifyToken(token);
      if (!decoded) {
        if (redirect && !isContentTypeJson) return res.redirect(redirect);
        return isContentTypeJson
          ? res.status(401).json({ message: "Unauthorized" })
          : res.status(401).send();
      }

      const redisClient = getRedisClient();
      if (redisClient && decoded._sessionId) {
        try {
          const sessionData = await redisClient.get(
            `session:${decoded._sessionId}`,
          );
          if (!sessionData) {
            if (redirect && !isContentTypeJson) return res.redirect(redirect);
            return isContentTypeJson
              ? res.status(401).json({ message: "Unauthorized" })
              : res.status(401).send();
          }
          req[key || "user"] = JSON.parse(sessionData);
          return next();
        } catch (err) {
          console.error(
            "[AUTH ERROR] Failed to get session data from Redis:",
            err.message,
          );
          if (redirect && !isContentTypeJson) return res.redirect(redirect);
          return isContentTypeJson
            ? res.status(401).json({ message: "Unauthorized" })
            : res.status(401).send();
        }
      }

      req[key || "user"] = decoded;
      next();
    };
  }

  /**
   * Logs in a user by setting an authentication cookie.
   * @param {import('express').Response} res - The response object.
   * @param {Object} data - The data to store in the token.
   * @param {string} [key="auth"] - The key for the cookie.
   * @param {Object} [options={}] - Options for the cookie and token.
   * @param {string} [options.expiresIn="24h"] - Token expiration (e.g., "1h", "7d").
   * @param {import('express').CookieOptions} [options.cookie] - Express cookie options.
   * @returns {Promise<string>} The generated token.
   * @example
   * await Auth.login(res, { id: 1, name: "Admin" });
   */
  static async login(res, data, key = "auth", options = {}) {
    const { expiresIn = "24h", cookie = {} } = options;
    const sessionId = crypto.randomUUID();
    const tokenPayload = { ...data, _sessionId: sessionId };

    const token = this.generateToken(tokenPayload, jwtSecret, expiresIn);

    const defaultCookieOptions = {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/",
    };

    const finalCookieOptions = { ...defaultCookieOptions, ...cookie };

    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        let ttl = 86400;
        if (typeof expiresIn === "string") {
          const match = expiresIn.match(/^(\d+)([smhd])$/);
          if (match) {
            const val = parseInt(match[1]);
            const unit = match[2];
            if (unit === "s") ttl = val;
            else if (unit === "m") ttl = val * 60;
            else if (unit === "h") ttl = val * 3600;
            else if (unit === "d") ttl = val * 86400;
          }
        } else if (typeof expiresIn === "number") {
          ttl = expiresIn;
        }
        await redisClient.set(`session:${sessionId}`, JSON.stringify(data), {
          EX: ttl,
        });
      } catch (err) {
        console.error(
          "[AUTH ERROR] Failed to store session in Redis:",
          err.message,
        );
      }
    }

    res.cookie(key, token, finalCookieOptions);
    return token;
  }

  /**
   * Logs out a user by clearing the authentication cookie.
   * @param {import('express').Response} res - The response object.
   * @param {string} [key="auth"] - The key for the cookie.
   * @param {import('express').CookieOptions} [options={}] - Options for clearing the cookie.
   * @param {import('express').Request} [req=null] - The request object.
   * @returns {Promise<boolean>} True if the cookie was cleared successfully.
   * @example
   * await Auth.logout(res);
   */
  static async logout(res, key = "auth", options = {}, req = null) {
    const defaultOptions = {
      path: "/",
    };

    if (req) {
      const token =
        req.cookies?.[key] || req.headers.authorization?.split(" ")[1];
      if (token) {
        const decoded = this.verifyToken(token);
        if (decoded && decoded._sessionId) {
          const redisClient = getRedisClient();
          if (redisClient) {
            try {
              await redisClient.del(`session:${decoded._sessionId}`);
            } catch (err) {
              console.error(
                "[AUTH ERROR] Failed to delete session from Redis:",
                err.message,
              );
            }
          }
        }
      }
    }

    res.clearCookie(key, { ...defaultOptions, ...options });
    return true;
  }
}

export default Auth;
