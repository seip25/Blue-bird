import jwt from "jsonwebtoken";
import crypto from "node:crypto";

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
   * @param {string} [secret=process.env.JWT_SECRET] - The secret key.
   * @param {string} [expiresIn="24h"] - Expiration time.
   * @returns {string} The generated token.
   */
  static generateToken(
    payload,
    secret = process.env.JWT_SECRET,
    expiresIn = "24h"
  ) {
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
  static verifyToken(token, secret = process.env.JWT_SECRET) {
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
   * @param {Object} options - Options for protection.
   * @param {string} [options.redirect=null] - URL to redirect if not authenticated.
   * @param {string} [options.key="user"] - Key to store the decoded token in the request.
   * @returns {Function} Express middleware.
   */
  static protect(options = { redirect: null, key: "user" }) {
    return (req, res, next) => {
      const token =
        req.cookies?.auth || req.headers.authorization?.split(" ")[1];

      if (!token) {
        if (options.redirect) return res.redirect(options.redirect);
        return res.status(401).json({ message: "Unauthorized" });
      }

      const decoded = this.verifyToken(token);
      if (!decoded) {
        if (options.redirect) return res.redirect(options.redirect);
        return res.status(401).json({ message: "Unauthorized" });
      }

      req[options.key || "user"] = decoded;
      next();
    };
  }
}

export default Auth;
