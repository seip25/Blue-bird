import crypto from "node:crypto";
import { getRedisClient } from "./cache.js";

const DB_ORM = (process.env.DB_ORM || "native").toLowerCase();
let DB_TYPE = (process.env.DB_TYPE || "").toLowerCase();

if (
  !DB_TYPE &&
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.startsWith("#")
) {
  if (
    process.env.DATABASE_URL.startsWith("postgres://") ||
    process.env.DATABASE_URL.startsWith("postgresql://")
  ) {
    DB_TYPE = "postgres";
  } else if (process.env.DATABASE_URL.startsWith("mysql://")) {
    DB_TYPE = "mysql";
  }
}
if (!DB_TYPE) {
  DB_TYPE = "mysql";
}

let mysqlPromise = null;
let pgPromise = null;
let prismaClientInstance = null;

if (DB_ORM === "prisma") {
  try {
    const { PrismaClient } = await import("@prisma/client");
    if (DB_TYPE === "postgres") {
      try {
        const { PrismaPg } = await import("@prisma/adapter-pg");
        const { default: pg } = await import("pg");
        const pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
        });
        const adapter = new PrismaPg(pool);
        prismaClientInstance = new PrismaClient({ adapter });
      } catch (adapterErr) {
        prismaClientInstance = new PrismaClient();
      }
    } else {
      prismaClientInstance = new PrismaClient();
    }
  } catch (err) {
    console.error(
      "[DATABASE ERROR] Prisma package is not installed or configured correctly:",
      err.message,
    );
  }
} else if (DB_TYPE === "postgres") {
  try {
    pgPromise = await import("pg");
  } catch (err) {
    console.error(
      "[DATABASE ERROR] pg package is not installed. Database wrapper is disabled.",
    );
  }
} else {
  try {
    mysqlPromise = await import("mysql2/promise");
  } catch (err) {
    console.error(
      "[DATABASE ERROR] mysql2 package is not installed. Database wrapper is disabled.",
    );
  }
}

/**
 * Database class wrapping mysql2, pg, and Prisma ORM with reconnection retries, connection pool, and query caching.
 */
class Database {
  /**
   * Initializes config from DATABASE_URL or DB_* environment variables.
   */
  constructor(connectionLimit = 10, queueLimit = 0) {
    this.pool = null;
    this.prisma = prismaClientInstance || null;
    this.type = DB_TYPE;
    this.orm = DB_ORM;

    this.config = {
      host: process.env.DB_HOST || "localhost",
      user:
        process.env.DB_USER || (this.type === "postgres" ? "postgres" : "root"),
      password: process.env.DB_PASSWORD || "root",
      database: process.env.DB_NAME || "blue_bird",
      port:
        parseInt(process.env.DB_PORT) ||
        (this.type === "postgres" ? 5432 : 3306),
      charset: "utf8mb4",
      waitForConnections: true,
      connectionLimit: connectionLimit,
      queueLimit: queueLimit,
      max: connectionLimit,
    };

    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("#")) {
      try {
        if (
          process.env.DATABASE_URL.startsWith("mysql://") ||
          process.env.DATABASE_URL.startsWith("postgres://") ||
          process.env.DATABASE_URL.startsWith("postgresql://")
        ) {
          const url = new URL(process.env.DATABASE_URL);
          this.config.host = url.hostname;
          this.config.port =
            parseInt(url.port) || (this.type === "postgres" ? 5432 : 3306);
          this.config.user = url.username;
          this.config.password = url.password;
          this.config.database = url.pathname.substring(1);
          this.config.connectionString = process.env.DATABASE_URL;
        }
      } catch (err) {
        console.error(
          "[DATABASE ERROR] Failed to parse DATABASE_URL:",
          err.message,
        );
      }
    }
  }

  /**
   * Creates the database connection pool with 3 retry attempts on failure.
   * @param {number} [retries=3] - Number of connection attempts.
   * @returns {Promise<boolean>} True if connection pool was created.
   */
  async init(retries = 3) {
    if (this.orm === "prisma") {
      if (!this.prisma) return false;
      try {
        await this.prisma.$connect();
        return true;
      } catch (err) {
        console.error(
          "[DATABASE ERROR] Prisma connection failed:",
          err.message,
        );
        return false;
      }
    }

    if (!mysqlPromise && !pgPromise) return false;
    if (this.pool) return true;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (this.type === "postgres" && pgPromise) {
          const pg = pgPromise.default || pgPromise;
          this.pool = new pg.Pool(this.config);
          await this.pool.query("SELECT 1");
        } else if (mysqlPromise) {
          const { max, connectionString, ...mysqlConfig } = this.config;
          this.pool = mysqlPromise.createPool(mysqlConfig);
          await this.pool.query("SELECT 1");
        }
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
   * Supports both MySQL and PostgreSQL (converting ? to $1, $2 for Postgres automatically).
   * If Prisma ORM is enabled, runs $queryRawUnsafe or delegates to native pool.
   *
   * @param {string} sql - SQL query string.
   * @param {Array} [params=[]] - Query parameter array.
   * @param {Object|string} [options={}] - Query options. Supports 'return_row', 'return_rows', and 'cache' (seconds).
   * @returns {Promise<*>| int | boolean} Formatted query result or false on error, or insert id of insert query.
   * @example const result await connection.query("SELECT * FROM users WHERE id = ?", [1], "return_row");
   * @example const result = await connection.query("SELECT * FROM users WHERE id = ?", [1], { cache: 60 });
   * @example const result = await connection.query("SELECT * FROM users WHERE id = ?", [1], { debug: true });
   * @example const insert_id = await connection.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", ["John Doe", "[EMAIL_ADDRESS]", "password"]);
   */
  async query(sql, params = [], options = {}) {
    if (this.orm === "prisma" && this.prisma) {
      const queryOptions =
        typeof options === "string" ? { [options]: true } : options;
      const cleanSql = sql.trim();
      const isSelect = cleanSql.toLowerCase().startsWith("select");
      try {
        let formattedSql = cleanSql;
        if (this.type === "postgres") {
          let paramIndex = 1;
          formattedSql = cleanSql.replace(/\?/g, () => `$${paramIndex++}`);
        }
        const results = await this.prisma.$queryRawUnsafe(
          formattedSql,
          ...params,
        );
        if (isSelect) {
          const rows = Array.isArray(results) ? results : [];
          if (queryOptions.return_row) {
            return rows.length > 0 ? rows[0] : null;
          }
          return rows;
        }
        return results;
      } catch (err) {
        console.error(
          "[DATABASE ERROR] Prisma raw query execution failed:",
          err.message,
        );
        throw err;
      }
    }

    if (!mysqlPromise && !pgPromise) return false;
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
    const isDebug = queryOptions.debug ?? false;
    if (isDebug) {
      console.log("[DATABASE DEBUG] SQL:", sql);
      console.log("[DATABASE DEBUG] PARAMS:", params);
      console.log("[DATABASE DEBUG] OPTIONS:", options);
    }

    if (isSelect && queryOptions.cache && redisClient) {
      const hash = crypto
        .createHash("md5")
        .update(cleanSql + JSON.stringify(params))
        .digest("hex");
      cacheKey = `db:${hash}`;
      try {
        if (isDebug) {
          console.log("[DATABASE DEBUG ][Redis] CACHE KEY:", cacheKey);
        }
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          if (isDebug) {
            console.log("[DATABASE DEBUG ][Redis] CACHE HIT");
          }
          return JSON.parse(cached);
        } else {
          if (isDebug) {
            console.log("[DATABASE DEBUG ][Redis] CACHE MISS");
          }
        }
      } catch (err) {
        console.error(
          "[DATABASE ERROR] Failed to get cached data:",
          err.message,
        );
      }
    }

    try {
      if (this.type === "postgres" && pgPromise) {
        let paramIndex = 1;
        const pgSql = cleanSql.replace(/\?/g, () => `$${paramIndex++}`);
        const res = await this.pool.query(pgSql, params);

        if (isSelect) {
          const rows = res.rows || [];
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
          if (res.rows && res.rows.length > 0) {
            return res.rows[0].id || res.rows[0];
          }
          return res.rowCount;
        }

        return res.rowCount;
      } else {
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
      }
    } catch (err) {
      console.error("[DATABASE ERROR] Query execution failed:", err.message);
      throw err;
    }
  }
}

export { Database, DB_TYPE, DB_ORM };
