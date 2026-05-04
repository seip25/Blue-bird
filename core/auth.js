import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Auth class to handle JWT generation, verification and protection.
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
     * Generates a JWT token.
     * @param {Object} payload - The data to store in the token.
     * @param {string} [secret=process.env.JWT_SECRET] - The secret key.
     * @param {string|number} [expiresIn='24h'] - Expiration time.
     * @returns {string} The generated token.
     * @example
     * const token = Auth.generateToken({ id: 1 });
     * console.log(token);
     * 
     */
    static generateToken(payload, secret = process.env.JWT_SECRET, expiresIn = '24h',encrypted=true) {
        if (!secret) throw new Error("FATAL: JWT_SECRET environment variable is not defined.");
        try{
            const jwtPayload = encrypted ? { data: this.encrypt(payload, secret) } : payload;
            return jwt.sign(jwtPayload, secret, { expiresIn });
        }catch(error){
            console.log("ERROR:JWT_TOKEN_GENERATION_FAILED ",error);
            return null;
        }
    }

    /**
     * Verifies a JWT token.
     * @param {string} token - The token to verify.
     * @param {string} [secret=process.env.JWT_SECRET] - The secret key.
     * @returns {Object|null} The decoded payload or null if invalid.
     * @example
     * const token = Auth.generateToken({ id: 1 });
     * const decoded = Auth.verifyToken(token);
     * console.log(decoded);
     */
    static verifyToken(token, secret = process.env.JWT_SECRET,encrypted=true) {
        if (!secret) throw new Error("FATAL: JWT_SECRET environment variable is not defined.");
        try {
            let decoded = jwt.verify(token, secret);
            return encrypted ? this.decrypt(decoded.data, secret) : decoded;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    /**
     * Middleware to protect routes. Checks for token in Cookies or Authorization header.
     * @param {Object} options - Options for protection.
     * @param {string} [options.redirect] - URL to redirect if not authenticated (for web routes).
     * @returns {Function} Express middleware.
     * @example
     * app.use(Auth.protect({ redirect: "/login" }));
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
