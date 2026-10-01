import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getRedisClient } from "./cache.js";

const rawDbType = (process.env.DB_TYPE || "").toLowerCase().trim();
let DB_TYPE = "";

if (
  rawDbType === "sqlite" ||
  rawDbType === "sqlite3" ||
  rawDbType === "sql" ||
  rawDbType === "better-sqlite3" ||
  rawDbType === "better-sqlite" ||
  rawDbType === "lite"
) {
  DB_TYPE = "sqlite";
} else if (
  rawDbType === "postgres" ||
  rawDbType === "postgresql" ||
  rawDbType === "pg" ||
  rawDbType === "psql" ||
  rawDbType === "pgsql" ||
  rawDbType === "postgre" ||
  rawDbType === "postgr" ||
  rawDbType === "psgr"
) {
  DB_TYPE = "postgres";
} else if (
  rawDbType === "mysql" ||
  rawDbType === "mariadb" ||
  rawDbType === "maria" ||
  rawDbType === "my"
) {
  DB_TYPE = "mysql";
} else if (
  rawDbType === "none" ||
  rawDbType === "no" ||
  rawDbType === "false" ||
  rawDbType === "null" ||
  rawDbType === "0"
) {
  DB_TYPE = "none";
}

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
  } else if (
    process.env.DATABASE_URL.startsWith("sqlite://") ||
    process.env.DATABASE_URL.startsWith("sqlite:")
  ) {
    DB_TYPE = "sqlite";
  }
}
if (!DB_TYPE) {
  DB_TYPE = "sqlite";
}

let mysqlPromise = null;
let pgPromise = null;
let sqlitePromise = null;

if (DB_TYPE === "postgres") {
  try {
    pgPromise = await import("pg");
  } catch (err) {
    console.error(
      "[DATABASE ERROR] pg package is not installed. Database wrapper is disabled.",
    );
  }
} else if (DB_TYPE === "mysql") {
  try {
    mysqlPromise = await import("mysql2/promise");
  } catch (err) {
    console.error(
      "[DATABASE ERROR] mysql2 package is not installed. Database wrapper is disabled.",
    );
  }
} else if (DB_TYPE === "sqlite") {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const _test = new DatabaseSync(":memory:");
    _test.close();
    sqlitePromise = { source: "node:sqlite", DatabaseSync };
  } catch {
    try {
      const mod = await import("better-sqlite3");
      sqlitePromise = { source: "better-sqlite3", BetterSqlite: mod.default || mod };
    } catch {
      console.error(
        "[DATABASE] No SQLite driver available. Node.js 22+ required for node:sqlite, or install better-sqlite3."
      );
    }
  }
}

/**
 * Database class wrapping better-sqlite3, mysql2, and pg with reconnection retries, connection pooling, and query caching.
 */
class Database {
  /**
   * Initializes config from DATABASE_URL or DB_* environment variables.
   * For default Database use .env DB_HOST, DB_USER, DB_PASSWORD... or DB_FILE for SQLite.
   * @param {number} [connectionLimit=10] - Maximum number of connections in the pool (MySQL/Postgres).
   * @param {number} [queueLimit=0] - Maximum number of queued connections (MySQL/Postgres).
   * @param {Object} [config={}] - Additional configuration options: DB_FILE, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_TYPE.
   * @example const connection = new Database(10, 0, { DB_TYPE: "sqlite", DB_FILE: "database/blue_bird.db" });
   * @example const connection = new Database(10, 0, { DB_HOST: "localhost", DB_USER: "root", DB_PASSWORD: "password", DB_NAME: "blue_bird", DB_PORT: 3306, DB_TYPE: "mysql" });
   */
  constructor(connectionLimit = 10, queueLimit = 0, config = {}) {
    this.pool = null;
    this.db = null;
    this.type = config.DB_TYPE || DB_TYPE;

    let defaultSqliteFile = process.env.DB_FILE || "database/blue_bird.db";
    let busyTimeout = 5000;
    let journalMode = "WAL";
    let synchronous = "NORMAL";

    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("#")) {
      try {
        if (
          process.env.DATABASE_URL.startsWith("sqlite://") ||
          process.env.DATABASE_URL.startsWith("sqlite:")
        ) {
          const rawUrl = process.env.DATABASE_URL;
          const cleanUrl = rawUrl.replace(/^sqlite:\/\/|^sqlite:/, "");
          const [filePath, queryStr] = cleanUrl.split("?");
          if (filePath) {
            defaultSqliteFile = filePath;
          }
          if (queryStr) {
            const params = new URLSearchParams(queryStr);
            if (params.has("busy_timeout")) {
              busyTimeout =
                parseInt(params.get("busy_timeout"), 10) || busyTimeout;
            }
            if (params.has("journal_mode")) {
              journalMode = params.get("journal_mode").toUpperCase();
            }
            if (params.has("synchronous")) {
              synchronous = params.get("synchronous").toUpperCase();
            }
          }
        }
      } catch (err) {
        console.error(
          "[DATABASE ERROR] Failed to parse SQLite DATABASE_URL:",
          err.message,
        );
      }
    }

    this.sqliteConfig = {
      filename: config.DB_FILE || defaultSqliteFile,
      busyTimeout: config.busyTimeout || busyTimeout,
      journalMode: config.journalMode || journalMode,
      synchronous: config.synchronous || synchronous,
    };

    this.config = {
      ...config,
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
   * Creates the database connection pool or SQLite instance with retries on failure.
   * @param {number} [retries=3] - Number of connection attempts.
   * @returns {Promise<boolean>} True if connection was created.
   */
  async init(retries = 3) {
    if (!mysqlPromise && !pgPromise && !sqlitePromise) return false;
    if (this.pool || this.db) return true;

    if (this.type === "sqlite" && sqlitePromise) {
      try {
        const dbFilePath = path.isAbsolute(this.sqliteConfig.filename)
          ? this.sqliteConfig.filename
          : path.resolve(process.cwd(), this.sqliteConfig.filename);

        const dir = path.dirname(dbFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (sqlitePromise.source === "node:sqlite") {
          const { DatabaseSync } = sqlitePromise;
          this.db = new DatabaseSync(dbFilePath);
          this._sqliteDriver = "node:sqlite";
          this.db.exec(`PRAGMA journal_mode = ${this.sqliteConfig.journalMode};`);
          this.db.exec(`PRAGMA synchronous = ${this.sqliteConfig.synchronous};`);
          this.db.exec(`PRAGMA busy_timeout = ${this.sqliteConfig.busyTimeout};`);
          this.db.exec("PRAGMA foreign_keys = ON;");
          this.db.exec("PRAGMA temp_store = MEMORY;");
          this.db.exec("PRAGMA cache_size = -8000;");
          this.db.exec("PRAGMA mmap_size = 268435456;");
        } else {
          const { BetterSqlite } = sqlitePromise;
          this.db = new BetterSqlite(dbFilePath, { timeout: this.sqliteConfig.busyTimeout });
          this._sqliteDriver = "better-sqlite3";
          this.db.pragma(`journal_mode = ${this.sqliteConfig.journalMode}`);
          this.db.pragma(`synchronous = ${this.sqliteConfig.synchronous}`);
          this.db.pragma("foreign_keys = ON");
          this.db.pragma(`busy_timeout = ${this.sqliteConfig.busyTimeout}`);
          this.db.pragma("temp_store = MEMORY");
          this.db.pragma("cache_size = -8000");
          this.db.pragma("mmap_size = 268435456");
        }

        return true;
      } catch (err) {
        console.error(
          "[DATABASE] Failed to initialize SQLite database:",
          err.message,
        );
        this.db = null;
        return false;
      }
    }

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
   * Supports SQLite, MySQL, and PostgreSQL (converting ? to $1, $2 for Postgres automatically).
   *
   * @param {string} sql - SQL query string.
   * @param {Array} [params=[]] - Query parameter array.
   * @param {Object|string} [options={}] - Query options. Supports 'return_row', 'return_rows', and 'cache' (seconds).
   * @returns {Promise<*>| int | boolean} Formatted query result or false on error, or insert id of insert query.
   * @example const result = await connection.query("SELECT * FROM users WHERE id = ?", [1], "return_row");
   * @example const result = await connection.query("SELECT * FROM users WHERE id = ?", [1], { cache: 60 });
   * @example const result = await connection.query("SELECT * FROM users WHERE id = ?", [1], { debug: true });
   * @example const insert_id = await connection.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", ["John Doe", "john@example.com", "password"]);
   */
  async query(sql, params = [], options = {}) {
    if (!mysqlPromise && !pgPromise && !sqlitePromise) return false;
    if (!this.pool && !this.db) {
      const initialized = await this.init();
      if (!initialized) return false;
    }

    const queryOptions =
      typeof options === "string" ? { [options]: true } : options;
    const cleanSql = sql.trim();
    const isSelect = /^(select|pragma|explain)/i.test(cleanSql);
    const isInsert = /^insert/i.test(cleanSql);

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
          console.log("[DATABASE DEBUG][Redis] CACHE KEY:", cacheKey);
        }
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          if (isDebug) {
            console.log("[DATABASE DEBUG][Redis] CACHE HIT");
          }
          return JSON.parse(cached);
        } else {
          if (isDebug) {
            console.log("[DATABASE DEBUG][Redis] CACHE MISS");
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
      if (this.type === "sqlite" && this.db) {
        const stmt = this.db.prepare(cleanSql);

        if (isSelect) {
          if (queryOptions.return_row) {
            const row = stmt.get(...params);
            const result = row || null;
            if (cacheKey && queryOptions.cache && redisClient) {
              await redisClient
                .set(cacheKey, JSON.stringify(result), {
                  EX: parseInt(queryOptions.cache),
                })
                .catch(() => {});
            }
            return result;
          }

          const rows = stmt.all(...params);
          if (cacheKey && queryOptions.cache && redisClient) {
            await redisClient
              .set(cacheKey, JSON.stringify(rows), {
                EX: parseInt(queryOptions.cache),
              })
              .catch(() => {});
          }
          return rows;
        }

        if (isInsert) {
          const info = stmt.run(...params);
          return Number(info.lastInsertRowid);
        }

        const info = stmt.run(...params);
        return info.changes;
      } else if (this.type === "postgres" && pgPromise) {
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

  /**
   * Executes a paginated SQL query.
   * Runs an automatic count query to calculate total records and pages, then appends LIMIT and OFFSET.
   *
   * @param {string} sql - SQL query string.
   * @param {Array} [params=[]] - Query parameters.
   * @param {Object} [options={}] - Pagination options: page, limit, cache.
   * @returns {Promise<{data: Array, total: number, page: number, limit: number, totalPages: number}>}
   * @example const result = await connection.paginate("SELECT * FROM users WHERE status = ?", ["active"], { page: 1, limit: 10 });
   */
  async paginate(sql, params = [], options = {}) {
    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.max(1, parseInt(options.limit) || 10);
    const offset = (page - 1) * limit;

    const cleanSql = sql.trim().replace(/;$/, "");
    const countSql = `SELECT COUNT(*) as total FROM (${cleanSql}) as _count_subquery`;

    const countResult = await this.query(countSql, params, { return_row: true });
    const total = Number(countResult?.total || countResult?.count || 0);
    const totalPages = Math.ceil(total / limit);

    const paginatedSql = `${cleanSql} LIMIT ${limit} OFFSET ${offset}`;
    const rows = await this.query(paginatedSql, params, options);

    return {
      data: Array.isArray(rows) ? rows : [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Executes a database transaction with automatic commit and rollback.
   * @param {Function} callback - Async function receiving transaction client: async (tx) => { ... }
   * @returns {Promise<*>} Value returned from callback.
   * @example
   * const userId = await connection.transaction(async (tx) => {
   *   const id = await tx.query("INSERT INTO users (name) VALUES (?)", ["Alice"]);
   *   await tx.query("INSERT INTO profiles (user_id) VALUES (?)", [id]);
   *   return id;
   * });
   */
  async transaction(callback) {
    if (!mysqlPromise && !pgPromise && !sqlitePromise) throw new Error("[DATABASE ERROR] No database driver available.");
    if (!this.pool && !this.db) {
      const initialized = await this.init();
      if (!initialized) throw new Error("[DATABASE ERROR] Failed to initialize database pool.");
    }

    if (this.type === "sqlite" && this.db) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const tx = {
          query: async (sql, params = [], options = {}) => {
            const queryOptions = typeof options === "string" ? { [options]: true } : options;
            const cleanSql = sql.trim();
            const isSelect = /^(select|pragma|explain)/i.test(cleanSql);
            const isInsert = /^insert/i.test(cleanSql);

            const stmt = this.db.prepare(cleanSql);
            if (isSelect) {
              if (queryOptions.return_row) {
                const row = stmt.get(...params);
                return row || null;
              }
              return stmt.all(...params);
            }
            if (isInsert) {
              const info = stmt.run(...params);
              return Number(info.lastInsertRowid);
            }
            const info = stmt.run(...params);
            return info.changes;
          }
        };

        const result = await callback(tx);
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        console.error("[DATABASE ERROR] Transaction rolled back:", err.message);
        throw err;
      }
    } else if (this.type === "postgres" && pgPromise) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");

        const tx = {
          query: async (sql, params = [], options = {}) => {
            const queryOptions = typeof options === "string" ? { [options]: true } : options;
            const cleanSql = sql.trim();
            const isSelect = cleanSql.toLowerCase().startsWith("select");
            const isInsert = cleanSql.toLowerCase().startsWith("insert");

            let paramIndex = 1;
            const pgSql = cleanSql.replace(/\?/g, () => `$${paramIndex++}`);
            const res = await client.query(pgSql, params);

            if (isSelect) {
              const rows = res.rows || [];
              return queryOptions.return_row ? (rows[0] || null) : rows;
            }
            if (isInsert) {
              if (res.rows && res.rows.length > 0) return res.rows[0].id || res.rows[0];
              return res.rowCount;
            }
            return res.rowCount;
          }
        };

        const result = await callback(tx);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("[DATABASE ERROR] Transaction rolled back:", err.message);
        throw err;
      } finally {
        client.release();
      }
    } else {
      const connection = await this.pool.getConnection();
      try {
        await connection.beginTransaction();

        const tx = {
          query: async (sql, params = [], options = {}) => {
            const queryOptions = typeof options === "string" ? { [options]: true } : options;
            const cleanSql = sql.trim();
            const isSelect = cleanSql.toLowerCase().startsWith("select");
            const isInsert = cleanSql.toLowerCase().startsWith("insert");

            const [results] = await connection.execute(cleanSql, params);

            if (isSelect) {
              const rows = Array.isArray(results) ? results : [];
              return queryOptions.return_row ? (rows[0] || null) : rows;
            }
            if (isInsert) {
              return results.insertId || results;
            }
            return results;
          }
        };

        const result = await callback(tx);
        await connection.commit();
        return result;
      } catch (err) {
        await connection.rollback().catch(() => {});
        console.error("[DATABASE ERROR] Transaction rolled back:", err.message);
        throw err;
      } finally {
        connection.release();
      }
    }
  }

  /**
   * Alias for transaction().
   * @param {Function} callback
   */
  async executeTransaction(callback) {
    return this.transaction(callback);
  }

  /**
   * Closes the database connection pool or SQLite instance.
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.pool) {
      if (typeof this.pool.end === "function") {
        await this.pool.end();
      }
      this.pool = null;
    }
  }
}

export { Database, DB_TYPE };


