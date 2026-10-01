import { createHmac, timingSafeEqual, createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import Config from "./config.js";
import { getRedisClient } from "./cache.js";

const propsConfig = Config.props();
const jwtSecret = propsConfig.jwtSecret;
const production = !propsConfig.debug;

const aesKey = createHash("sha256").update(jwtSecret || "default").digest();

/**
 * Converts duration strings like "24h", "7d", "30m", "60s" to seconds.
 * @param {string|number} duration
 * @returns {number} Seconds.
 */
function parseDuration(duration) {
  if (typeof duration === "number") return duration;
  const match = String(duration).match(/^(\d+)([smhd])$/);
  if (!match) return 86400;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "s") return val;
  if (unit === "m") return val * 60;
  if (unit === "h") return val * 3600;
  if (unit === "d") return val * 86400;
  return 86400;
}

/**
 * Auth class for JWT generation and verification using native node:crypto.
 * Tokens are signed with HMAC-HS256 and the payload is encrypted with AES-256-GCM.
 */
class Auth {
  /**
   * Encrypts a payload using AES-256-GCM.
   * @param {Object} payload - The data to encrypt.
   * @param {string} secret - The secret key for encryption.
   * @returns {string} Encrypted string in format iv:tag:encrypted.
   */
  static encrypt(payload, secret) {
    const iv = randomBytes(12);
    const key = secret === jwtSecret ? aesKey : createHash("sha256").update(secret).digest();
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${tag}:${encrypted}`;
  }

  /**
   * Decrypts a payload using AES-256-GCM.
   * @param {string} data - Encrypted string in format iv:tag:encrypted.
   * @param {string} secret - The secret key for decryption.
   * @returns {Object|null} Decrypted object or null if decryption failed.
   */
  static decrypt(data, secret) {
    try {
      const [ivHex, tagHex, encryptedHex] = data.split(":");
      if (!ivHex || !tagHex || !encryptedHex) return null;

      const iv = Buffer.from(ivHex, "hex");
      const tag = Buffer.from(tagHex, "hex");
      const key = secret === jwtSecret ? aesKey : createHash("sha256").update(secret).digest();
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Generates a signed JWT token with an AES-256-GCM encrypted payload.
   * The token is signed with HMAC-HS256 using native node:crypto.
   * @param {Object} payload - The data to store in the token.
   * @param {string} [secret] - The secret key (defaults to JWT_SECRET env var).
   * @param {string|number} [expiresIn="24h"] - Expiration duration string or seconds.
   * @returns {string} Signed JWT token string.
   */
  static generateToken(payload, secret = jwtSecret, expiresIn = "24h") {
    if (!secret) throw new Error("FATAL: JWT_SECRET environment variable is not defined.");

    const encrypted = this.encrypt(payload, secret);
    const now = Math.floor(Date.now() / 1000);
    const ttl = parseDuration(expiresIn);

    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ data: encrypted, iat: now, exp: now + ttl })).toString("base64url");

    const signature = createHmac("sha256", secret)
      .update(`${header}.${body}`)
      .digest("base64url");

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verifies a JWT token signature and decrypts its payload.
   * @param {string} token - The token to verify.
   * @param {string} [secret] - The secret key (defaults to JWT_SECRET env var).
   * @returns {Object|null} Decrypted payload or null if invalid or expired.
   */
  static verifyToken(token, secret = jwtSecret) {
    if (!secret) throw new Error("FATAL: JWT_SECRET environment variable is not defined.");
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;

      const expected = createHmac("sha256", secret)
        .update(`${header}.${body}`)
        .digest("base64url");

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return null;
      if (!timingSafeEqual(sigBuf, expBuf)) return null;

      const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      if (!decoded || !decoded.data) return null;
      if (Math.floor(Date.now() / 1000) > decoded.exp) return null;

      return this.decrypt(decoded.data, secret);
    } catch {
      return null;
    }
  }

  /**
   * Middleware to protect routes. Reads token from cookie or Authorization header.
   * Falls back to JWT payload when Redis is temporarily unreachable.
   * @param {Object} [options={}] - Protection options.
   * @param {string|null} [options.redirect=null] - URL to redirect on failure (for web routes).
   * @param {string} [options.key="user"] - Property name to attach decoded payload to req.
   * @param {string} [options.cookieKey="auth"] - Cookie name to read the token from.
   * @returns {Function} Express middleware.
   */
  static protect(options = {}) {
    const { redirect = null, key = "user", cookieKey = "auth" } = options;

    return async (req, res, next) => {
      const token = req.cookies?.[cookieKey] || req.headers.authorization?.split(" ")[1];

      const expectsJson =
        req.xhr ||
        req.headers.accept?.includes("application/json") ||
        req.path.startsWith("/api");

      if (!token) {
        if (redirect && !expectsJson) return res.redirect(redirect);
        return expectsJson
          ? res.status(401).json({ message: "Unauthorized" })
          : res.status(401).send();
      }

      const decoded = this.verifyToken(token);
      if (!decoded) {
        if (redirect && !expectsJson) return res.redirect(redirect);
        return expectsJson
          ? res.status(401).json({ message: "Unauthorized" })
          : res.status(401).send();
      }

      const redisClient = getRedisClient();
      if (redisClient && decoded._sessionId) {
        try {
          const sessionData = await redisClient.get(`session:${decoded._sessionId}`);
          if (!sessionData) {
            if (redirect && !expectsJson) return res.redirect(redirect);
            return expectsJson
              ? res.status(401).json({ message: "Unauthorized" })
              : res.status(401).send();
          }
          req[key] = JSON.parse(sessionData);
          return next();
        } catch {
          console.warn("[AUTH] Redis unreachable during session lookup — falling back to JWT payload.");
          req[key] = decoded;
          return next();
        }
      }

      req[key] = decoded;
      next();
    };
  }

  /**
   * Logs in a user by signing a JWT, storing the session in Redis if available,
   * and setting an HttpOnly authentication cookie.
   * @param {import('express').Response} res - The Express response object.
   * @param {Object} data - The data to store in the token and session.
   * @param {string} [key="auth"] - Cookie name to set.
   * @param {Object} [options={}] - Additional options.
   * @param {string|number} [options.expiresIn="24h"] - Token and session TTL.
   * @param {import('express').CookieOptions} [options.cookie] - Express cookie options override.
   * @returns {Promise<string>} The generated token string.
   */
  static async login(res, data, key = "auth", options = {}) {
    const { expiresIn = "24h", cookie = {} } = options;
    const sessionId = randomUUID();
    const tokenPayload = { ...data, _sessionId: sessionId };
    const token = this.generateToken(tokenPayload, jwtSecret, expiresIn);
    const ttl = parseDuration(expiresIn);

    const defaultCookieOptions = {
      maxAge: ttl * 1000,
      httpOnly: production,
      secure: production,
      sameSite: production ? "lax" : "strict",
      path: "/",
    };

    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        await redisClient.set(`session:${sessionId}`, JSON.stringify(data), { EX: ttl });
      } catch (err) {
        console.error("[AUTH] Failed to store session in Redis:", err.message);
      }
    }

    res.cookie(key, token, { ...defaultCookieOptions, ...cookie });
    return token;
  }

  /**
   * Logs out a user by clearing the authentication cookie and removing the Redis session.
   * @param {import('express').Response} res - The Express response object.
   * @param {string} [key="auth"] - Cookie name to clear.
   * @param {import('express').CookieOptions} [options={}] - Cookie options for clearing.
   * @param {import('express').Request|null} [req=null] - Request object used to extract and revoke the session.
   * @returns {Promise<boolean>}
   */
  static async logout(res, key = "auth", options = {}, req = null) {
    if (req) {
      const token = req.cookies?.[key] || req.headers.authorization?.split(" ")[1];
      if (token) {
        const decoded = this.verifyToken(token);
        if (decoded?._sessionId) {
          const redisClient = getRedisClient();
          if (redisClient) {
            try {
              await redisClient.del(`session:${decoded._sessionId}`);
            } catch (err) {
              console.error("[AUTH] Failed to delete session from Redis:", err.message);
            }
          }
        }
      }
    }

    res.clearCookie(key, { path: "/", ...options });
    return true;
  }
}

export default Auth;
