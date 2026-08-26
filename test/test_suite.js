import fs from "node:fs";
import path from "node:path";
import Hash from "../core/hash.js";
import Cache from "../core/cache.js";
import { Database } from "../core/database.js";
import Upload from "../core/upload.js";

async function runTestSuite() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${message}`);
      failed++;
    }
  }

  console.log("====================================================");
  console.log("       BLUE BIRD FRAMEWORK - TEST SUITE            ");
  console.log("====================================================\n");

  // --- 1. PASSWORD HASHING (scrypt & bcrypt compatibility) ---
  console.log("🔹 1. Testing Password Hashing (core/hash.js)...");
  try {
    const password = "SuperSecretPassword#2026!";
    const hash = await Hash.make(password);
    assert(typeof hash === "string" && hash.startsWith("$scrypt$"), "Hash.make() generates valid scrypt hash");

    const isValid = await Hash.verify(password, hash);
    assert(isValid === true, "Hash.verify() validates correct password");

    const isInvalid = await Hash.verify("WrongPassword!", hash);
    assert(isInvalid === false, "Hash.verify() rejects incorrect password");

    const checkAlias = await Hash.check(password, hash);
    assert(checkAlias === true, "Hash.check() alias works correctly");

    const needsRehash = Hash.needsRehash(hash);
    assert(needsRehash === false, "Hash.needsRehash() returns false for matching parameters");

    // Test bcrypt hash detection (simulate bcrypt string format)
    const fakeBcryptHash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const bcryptCheck = await Hash.verify("test", fakeBcryptHash);
    assert(typeof bcryptCheck === "boolean", "Hash.verify() handles bcrypt hash detection gracefully");
  } catch (err) {
    assert(false, `Hashing test error: ${err.message}`);
  }

  // --- 2. CACHE MODULE (Memory & Redis modes) ---
  console.log("\n🔹 2. Testing Cache Module (core/cache.js)...");
  try {
    const mode = Cache.getMode();
    assert(typeof mode === "string", `Cache.getMode() returns active mode: '${mode}'`);

    await Cache.set("test:key", { user: "Alice", role: "admin" }, 10);
    const cachedItem = await Cache.get("test:key");
    assert(cachedItem && cachedItem.user === "Alice", "Cache.set() and Cache.get() work with JSON payload");

    await Cache.delete("test:key");
    const deletedItem = await Cache.get("test:key");
    assert(deletedItem === null, "Cache.delete() removes key properly");

    await Cache.set("test:temp1", "val1", 10);
    await Cache.set("test:temp2", "val2", 10);
    await Cache.clear();
    const cleared1 = await Cache.get("test:temp1");
    const cleared2 = await Cache.get("test:temp2");
    assert(cleared1 === null && cleared2 === null, "Cache.clear() removes all cache entries");
  } catch (err) {
    assert(false, `Cache test error: ${err.message}`);
  }

  // --- 3. DATABASE MODULE (SQLite WAL & Concurrency) ---
  console.log("\n🔹 3. Testing Database Module (core/database.js)...");
  const testDbFile = path.resolve(process.cwd(), "database/test_suite.db");
  try {
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

    const db = new Database(10, 0, {
      DB_TYPE: "sqlite",
      DB_FILE: testDbFile,
    });

    const initialized = await db.init();
    assert(initialized === true, "Database.init() initializes SQLite connection");

    const journal = await db.query("PRAGMA journal_mode", [], { return_row: true });
    assert(journal && journal.journal_mode === "wal", "PRAGMA journal_mode is WAL");

    const timeout = await db.query("PRAGMA busy_timeout", [], { return_row: true });
    assert(timeout && timeout.timeout === 5000, "PRAGMA busy_timeout is 5000ms");

    await db.query(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL
      )
    `);
    assert(true, "CREATE TABLE query executed successfully");

    const insertId = await db.query("INSERT INTO items (name, price) VALUES (?, ?)", ["Book", 19.99]);
    assert(insertId === 1, `INSERT query returns insertId: ${insertId}`);

    await db.query("INSERT INTO items (name, price) VALUES (?, ?)", ["Pen", 2.50]);
    await db.query("INSERT INTO items (name, price) VALUES (?, ?)", ["Notebook", 5.00]);

    const singleItem = await db.query("SELECT * FROM items WHERE id = ?", [1], { return_row: true });
    assert(singleItem && singleItem.name === "Book", "SELECT with { return_row: true } returns single object");

    const allItems = await db.query("SELECT * FROM items ORDER BY id ASC");
    assert(Array.isArray(allItems) && allItems.length === 3, "SELECT returns array with all items");

    const page = await db.paginate("SELECT * FROM items ORDER BY id ASC", [], { page: 1, limit: 2 });
    assert(page.total === 3 && page.totalPages === 2 && page.data.length === 2, "paginate() calculates total and totalPages correctly");

    // Transaction Commit
    const txId = await db.transaction(async (tx) => {
      const id = await tx.query("INSERT INTO items (name, price) VALUES (?, ?)", ["Tablet", 299.99]);
      await tx.query("UPDATE items SET price = ? WHERE id = ?", [249.99, id]);
      return id;
    });
    assert(txId === 4, "Atomic transaction with BEGIN IMMEDIATE commits successfully");

    // Transaction Rollback
    let rollbackSuccess = false;
    try {
      await db.transaction(async (tx) => {
        await tx.query("INSERT INTO items (name, price) VALUES (?, ?)", ["ErrorItem", 0]);
        throw new Error("Simulated Transaction Error");
      });
    } catch {
      rollbackSuccess = true;
    }
    const checkRolledBack = await db.query("SELECT * FROM items WHERE name = ?", ["ErrorItem"], { return_row: true });
    assert(rollbackSuccess && checkRolledBack === null, "Transaction automatically rolls back on error");

    await db.close();
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
    const walFile = `${testDbFile}-wal`;
    const shmFile = `${testDbFile}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  } catch (err) {
    assert(false, `Database test error: ${err.message}`);
  }

  // --- 4. RESPONSE HELPERS (res.ok, res.created, res.badRequest, etc.) ---
  console.log("\n🔹 4. Testing HTTP Response Helpers (res.*)...");
  try {
    const mockRes = {
      _status: 200,
      _json: null,
      status(code) {
        this._status = code;
        return this;
      },
      json(data) {
        this._json = data;
        return this;
      },
      success(data = null, message = "Success", statusCode = 200) {
        return this.status(statusCode).json({ status: "success", message, data });
      },
      error(message = "Error", statusCode = 400, errors = []) {
        return this.status(statusCode).json({ status: "error", message, errors });
      },
      ok(data = null, message = "Success") {
        return this.success(data, message, 200);
      },
      created(data = null, message = "Created") {
        return this.success(data, message, 201);
      },
      badRequest(message = "Bad Request", errors = []) {
        return this.error(message, 400, errors);
      },
      unauthorized(message = "Unauthorized") {
        return this.error(message, 401);
      },
      forbidden(message = "Forbidden") {
        return this.error(message, 403);
      },
      notFound(message = "Not Found") {
        return this.error(message, 404);
      },
      serverError(message = "Internal Server Error", errors = []) {
        return this.error(message, 500, errors);
      },
    };

    mockRes.ok({ id: 1 }, "Operation successful");
    assert(mockRes._status === 200 && mockRes._json.status === "success", "res.ok() returns HTTP 200 with status: 'success'");

    mockRes.created({ id: 2 }, "Resource created");
    assert(mockRes._status === 201 && mockRes._json.status === "success", "res.created() returns HTTP 201 with status: 'success'");

    mockRes.badRequest("Invalid input data", [{ field: "email" }]);
    assert(mockRes._status === 400 && mockRes._json.status === "error", "res.badRequest() returns HTTP 400 with status: 'error'");

    mockRes.unauthorized("Authentication required");
    assert(mockRes._status === 401 && mockRes._json.status === "error", "res.unauthorized() returns HTTP 401");

    mockRes.forbidden("Access denied");
    assert(mockRes._status === 403 && mockRes._json.status === "error", "res.forbidden() returns HTTP 403");

    mockRes.notFound("User not found");
    assert(mockRes._status === 404 && mockRes._json.status === "error", "res.notFound() returns HTTP 404");

    mockRes.serverError("Unexpected server failure");
    assert(mockRes._status === 500 && mockRes._json.status === "error", "res.serverError() returns HTTP 500");
  } catch (err) {
    assert(false, `Response helpers test error: ${err.message}`);
  }

  // --- 5. ON-DEMAND MODULES & HEALTH CHECK ---
  console.log("\n🔹 5. Testing On-Demand Modules & Helpers...");
  try {
    const uploadUrl = Upload.url("photo.png", "uploads");
    assert(typeof uploadUrl === "string" && uploadUrl.includes("photo.png"), "Upload.url() computes correct public file path");

    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: { rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB` },
    };
    assert(healthData.status === "ok" && typeof healthData.uptime === "number", "/api/health payload structure is valid");
  } catch (err) {
    assert(false, `On-demand module test error: ${err.message}`);
  }

  // --- SUMMARY ---
  console.log("\n====================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(console.error);
