import crypto from "node:crypto";
import { getRedisClient } from "./cache.js";

let mysqlPromise = null;
try {
  mysqlPromise = await import("mysql2/promise");
} catch (err) {
  console.error(
    "[DATABASE ERROR] mysql2 package is not installed. Database wrapper is disabled.",
  );
}

/**
 * Database class wrapping mysql2 with reconnection retries, connection pool, and query caching.
 */
class Database {
  /**
   * Initializes config from DATABASE_URL or DB_* environment variables.
   */
  constructor(connectionLimit = 10, queueLimit = 0) {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "root",
      database: process.env.DB_NAME || "blue_bird",
      port: parseInt(process.env.DB_PORT) || 3306,
      charset: "utf8mb4",
      waitForConnections: true,
      connectionLimit: connectionLimit,
      queueLimit: queueLimit,
    };

    if (
      process.env.DATABASE_URL &&
      process.env.DATABASE_URL.startsWith("mysql://")
    ) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        this.config.host = url.hostname;
        this.config.port = parseInt(url.port) || 3306;
        this.config.user = url.username;
        this.config.password = url.password;
        this.config.database = url.pathname.substring(1);
      } catch (err) {
        console.error(
          "[DATABASE ERROR] Failed to parse DATABASE_URL:",
          err.message,
        );
      }
    }
  }

  /**
   * Creates the MySQL connection pool with 3 retry attempts on failure.
   * @param {number} [retries=3] - Number of connection attempts.
   * @returns {Promise<boolean>} True if connection pool was created.
   */
  async init(retries = 3) {
    if (!mysqlPromise) return false;
    if (this.pool) return true;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.pool = mysqlPromise.createPool(this.config);
        await this.pool.query("SELECT 1");
        return true;
      } catch (err) {
        this.pool = null;
        if (attempt === retries) {
          console.error(
            `[DATABASE ERROR] Connection failed after ${retries} attempts:`,
            err.message,
          );
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return false;
  }

  /**
   * Runs a SQL query with parameters and formatting options.
   *
   * @param {string} sql - SQL query string.
   * @param {Array} [params=[]] - Query parameter array.
   * @param {Object|string} [options={}] - Query options. Supports 'return_row', 'return_rows', and 'cache' (seconds).
   * @returns {Promise<*>} Formatted query result or false on error.
   */
  async query(sql, params = [], options = {}) {
    if (!mysqlPromise) return false;
    if (!this.pool) {
      const initialized = await this.init();
      if (!initialized) return false;
    }

    const queryOptions =
      typeof options === "string" ? { [options]: true } : options;
    const cleanSql = sql.trim();
    const isSelect = cleanSql.toLowerCase().startsWith("select");
    const isInsert = cleanSql.toLowerCase().startsWith("insert");

    const redisClient = getRedisClient();
    let cacheKey = null;

    if (isSelect && queryOptions.cache && redisClient) {
      const hash = crypto
        .createHash("md5")
        .update(cleanSql + JSON.stringify(params))
        .digest("hex");
      cacheKey = `db:${hash}`;
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error(
          "[DATABASE ERROR] Failed to get cached data:",
          err.message,
        );
      }
    }

    try {
      const [results] = await this.pool.execute(cleanSql, params);

      if (isSelect) {
        const rows = Array.isArray(results) ? results : [];
        if (cacheKey && queryOptions.cache && redisClient) {
          await redisClient
            .set(cacheKey, JSON.stringify(rows), {
              EX: parseInt(queryOptions.cache),
            })
            .catch(() => {});
        }
        if (queryOptions.return_row) {
          return rows.length > 0 ? rows[0] : null;
        }
        return rows;
      }

      if (isInsert) {
        return results.insertId || results;
      }

      return results;
    } catch (err) {
      console.error("[DATABASE ERROR] Query execution failed:", err.message);
      throw err;
    }
  }
}

const connection = new Database();
export default connection;
export { Database };
