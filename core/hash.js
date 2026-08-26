import crypto from "node:crypto";

let bcryptModule = null;
try {
  bcryptModule = (await import("bcrypt")).default || (await import("bcrypt"));
} catch {
  // bcrypt not installed, scrypt native is used
}

/**
 * High-performance Password Hashing class.
 * Uses native node:crypto scrypt by default (zero npm dependencies, NIST recommended),
 * with seamless support for bcrypt when installed or verifying bcrypt hashes.
 */
class Hash {
  /**
   * Hashes a plain text password using scrypt (default) or bcrypt.
   * @param {string} password - The plain text password.
   * @param {Object} [options={}] - Hashing options.
   * @param {string} [options.driver="scrypt"] - Hashing driver ('scrypt' or 'bcrypt').
   * @param {number} [options.rounds=10] - Salt rounds for bcrypt (if driver is 'bcrypt').
   * @param {number} [options.N=16384] - CPU/memory cost parameter for scrypt.
   * @param {number} [options.r=8] - Block size for scrypt.
   * @param {number} [options.p=1] - Parallelization parameter for scrypt.
   * @returns {Promise<string>} Formatted password hash string.
   * @example
   * const hash = await Hash.make("mySecretPassword");
   * // Using bcrypt:
   * const bcryptHash = await Hash.make("mySecretPassword", { driver: "bcrypt" });
   */
  static async make(password, options = {}) {
    if (typeof password !== "string" || !password) {
      throw new Error("[HASH ERROR] Password must be a non-empty string.");
    }

    const driver = (options.driver || "scrypt").toLowerCase();

    if (driver === "bcrypt") {
      if (!bcryptModule) {
        throw new Error(
          "[HASH ERROR] 'bcrypt' package is not installed. Run 'npm install bcrypt' or 'npx blue-bird add bcrypt', or use the default scrypt driver.",
        );
      }
      const rounds = options.rounds || 10;
      return bcryptModule.hash(password, rounds);
    }

    // Default: native scrypt with random salt
    const N = options.N || 16384;
    const r = options.r || 8;
    const p = options.p || 1;
    const keylen = 64;
    const salt = crypto.randomBytes(16);

    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        keylen,
        { N, r, p, maxmem: 32 * 1024 * 1024 },
        (err, derivedKey) => {
          if (err) return reject(err);
          const hashString = `$scrypt$N=${N},r=${r},p=${p}$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
          resolve(hashString);
        },
      );
    });
  }

  /**
   * Alias for make().
   * @param {string} password - The plain text password.
   * @param {Object} [options={}] - Options.
   * @returns {Promise<string>}
   */
  static async hash(password, options = {}) {
    return this.make(password, options);
  }

  /**
   * Verifies a plain text password against a hash string.
   * Automatically detects scrypt or bcrypt hash formats.
   * Uses timing-safe comparison to protect against side-channel attacks.
   *
   * @param {string} password - The plain text password to check.
   * @param {string} hash - The stored hash string.
   * @returns {Promise<boolean>} True if password matches, false otherwise.
   * @example
   * const isValid = await Hash.verify("mySecretPassword", storedHash);
   */
  static async verify(password, hash) {
    if (
      typeof password !== "string" ||
      !password ||
      typeof hash !== "string" ||
      !hash
    ) {
      return false;
    }

    // 1. Detect bcrypt hash format ($2a$, $2b$, $2y$)
    if (/^\$2[aby]\$\d{2}\$/.test(hash)) {
      if (!bcryptModule) {
        console.error(
          "[HASH ERROR] A bcrypt hash was detected, but the 'bcrypt' package is not installed. Run 'npm install bcrypt' or 'npx blue-bird add bcrypt'.",
        );
        return false;
      }
      try {
        return await bcryptModule.compare(password, hash);
      } catch {
        return false;
      }
    }

    // 2. Detect native scrypt format ($scrypt$N=...,r=...,p=...$salt$hash)
    if (hash.startsWith("$scrypt$")) {
      const parts = hash.split("$");
      // Format: ["", "scrypt", "N=16384,r=8,p=1", "saltHex", "hashHex"]
      if (parts.length !== 5) return false;

      const paramsStr = parts[2];
      const saltHex = parts[3];
      const originalHashHex = parts[4];

      if (!paramsStr || !saltHex || !originalHashHex) return false;

      let N = 16384,
        r = 8,
        p = 1;
      paramsStr.split(",").forEach((param) => {
        const [k, v] = param.split("=");
        if (k === "N") N = parseInt(v, 10) || N;
        if (k === "r") r = parseInt(v, 10) || r;
        if (k === "p") p = parseInt(v, 10) || p;
      });

      const salt = Buffer.from(saltHex, "hex");
      const originalHash = Buffer.from(originalHashHex, "hex");

      return new Promise((resolve) => {
        crypto.scrypt(
          password,
          salt,
          originalHash.length,
          { N, r, p, maxmem: 32 * 1024 * 1024 },
          (err, derivedKey) => {
            if (err) return resolve(false);
            try {
              const matches = crypto.timingSafeEqual(originalHash, derivedKey);
              resolve(matches);
            } catch {
              resolve(false);
            }
          },
        );
      });
    }

    return false;
  }

  /**
   * Alias for verify().
   * @param {string} password - The plain text password.
   * @param {string} hash - The stored hash string.
   * @returns {Promise<boolean>}
   */
  static async check(password, hash) {
    return this.verify(password, hash);
  }

  /**
   * Checks if a given hash needs to be rehashed to match updated security parameters.
   * @param {string} hash - The stored hash string.
   * @param {Object} [options={}] - Target options.
   * @returns {boolean} True if the hash should be regenerated.
   */
  static needsRehash(hash, options = {}) {
    if (!hash || typeof hash !== "string") return true;
    const targetDriver = (options.driver || "scrypt").toLowerCase();

    if (targetDriver === "bcrypt") {
      return !/^\$2[aby]\$\d{2}\$/.test(hash);
    }

    if (!hash.startsWith("$scrypt$")) return true;

    const parts = hash.split("$");
    if (parts.length !== 5) return true;

    const paramsStr = parts[2];
    const targetN = options.N || 16384;
    const targetR = options.r || 8;
    const targetP = options.p || 1;

    return !paramsStr.includes(`N=${targetN},r=${targetR},p=${targetP}`);
  }
}

export default Hash;
