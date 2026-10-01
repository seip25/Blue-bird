#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Database, DB_TYPE } from "../database.js";

/**
 * Generates current timestamp string in YYYYMMDD_HHMMSS format.
 * @returns {string}
 */
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const mins = pad(now.getMinutes());
  const secs = pad(now.getSeconds());
  return `${year}${month}${day}_${hours}${mins}${secs}`;
}

/**
 * Creates a new migration file in database/migrations/.
 * @param {string} name
 */
function makeMigration(name) {
  if (!name) {
    console.log(chalk.red("[ERROR] Missing migration name."));
    console.log("Usage: npx blue-bird make:migration <name>");
    process.exit(1);
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const filename = `${getTimestamp()}_${cleanName}.sql`;
  const migrationsDir = path.resolve(process.cwd(), "database/migrations");

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const filePath = path.join(migrationsDir, filename);

  const template = `-- =============================================================
-- Migration: ${cleanName}
-- Created At: ${new Date().toISOString()}
-- Driver Compatibility: SQLite / MySQL / PostgreSQL
-- =============================================================

CREATE TABLE IF NOT EXISTS ${cleanName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

  fs.writeFileSync(filePath, template, "utf-8");
  console.log(chalk.green(`[OK] Migration created: database/migrations/${filename}`));
}

/**
 * Creates a new seed file in database/seeds/.
 * @param {string} name
 */
function makeSeed(name) {
  if (!name) {
    console.log(chalk.red("[ERROR] Missing seed name."));
    console.log("Usage: npx blue-bird make:seed <name>");
    process.exit(1);
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const filename = `${cleanName}.sql`;
  const seedsDir = path.resolve(process.cwd(), "database/seeds");

  if (!fs.existsSync(seedsDir)) {
    fs.mkdirSync(seedsDir, { recursive: true });
  }

  const filePath = path.join(seedsDir, filename);

  const template = `-- =============================================================
-- Seed: ${cleanName}
-- Created At: ${new Date().toISOString()}
-- =============================================================

-- INSERT INTO table_name (name) VALUES ('Sample Item 1');
`;

  fs.writeFileSync(filePath, template, "utf-8");
  console.log(chalk.green(`[OK] Seed file created: database/seeds/${filename}`));
}

/**
 * Ensures migrations tracking table exists.
 * @param {Database} db
 */
async function ensureMigrationsTable(db) {
  let ddl = "";
  if (DB_TYPE === "postgres") {
    ddl = `CREATE TABLE IF NOT EXISTS _bluebird_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      batch INT NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
  } else if (DB_TYPE === "mysql") {
    ddl = `CREATE TABLE IF NOT EXISTS _bluebird_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      batch INT NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
  } else {
    ddl = `CREATE TABLE IF NOT EXISTS _bluebird_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      batch INTEGER NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
  }

  await db.query(ddl);
}

/**
 * Executes pending database migrations.
 */
async function runMigrations() {
  const migrationsDir = path.resolve(process.cwd(), "database/migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("[INFO] No 'database/migrations' directory found. Nothing to migrate."));
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") || f.endsWith(".js"))
    .sort();

  if (files.length === 0) {
    console.log(chalk.yellow("[INFO] No migration files found in 'database/migrations'."));
    return;
  }

  let db;
  try {
    db = new Database(5);
    await ensureMigrationsTable(db);
  } catch (err) {
    console.error(chalk.red("[ERROR] Could not connect to database to run migrations:"), err.message);
    process.exit(1);
  }

  const appliedRows = (await db.query("SELECT name, batch FROM _bluebird_migrations ORDER BY id ASC")) || [];
  const appliedSet = new Set(appliedRows.map((r) => r.name));

  const maxBatchRow = await db.query("SELECT MAX(batch) as max_batch FROM _bluebird_migrations", [], "return_row");
  const currentBatch = ((maxBatchRow && maxBatchRow.max_batch) || 0) + 1;

  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log(chalk.green("[INFO] Database is up to date. No pending migrations."));
    process.exit(0);
  }

  console.log(chalk.cyan(`[INFO] Running ${pending.length} pending migration(s) (Batch #${currentBatch})...\n`));

  for (const file of pending) {
    const filePath = path.join(migrationsDir, file);
    try {
      if (file.endsWith(".sql")) {
        const sql = fs.readFileSync(filePath, "utf-8");
        const statements = sql
          .split(/;\s*$/m)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        await db.transaction(async (tx) => {
          for (const stmt of statements) {
            await tx.query(stmt);
          }
          await tx.query(
            "INSERT INTO _bluebird_migrations (name, batch) VALUES (?, ?)",
            [file, currentBatch]
          );
        });
      } else if (file.endsWith(".js")) {
        const modulePath = `file://${filePath}`;
        const migrationModule = await import(modulePath);
        if (typeof migrationModule.up === "function") {
          await db.transaction(async (tx) => {
            await migrationModule.up(tx);
            await tx.query(
              "INSERT INTO _bluebird_migrations (name, batch) VALUES (?, ?)",
              [file, currentBatch]
            );
          });
        }
      }

      console.log(chalk.green(`  [MIGRATED] ${file}`));
    } catch (err) {
      console.error(chalk.red(`  [FAILED]   ${file}: ${err.message}`));
      process.exit(1);
    }
  }

  console.log(chalk.bold.green("\n[OK] All pending migrations executed successfully."));
  process.exit(0);
}

/**
 * Shows migration status list.
 */
async function showMigrationStatus() {
  const migrationsDir = path.resolve(process.cwd(), "database/migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("[INFO] No 'database/migrations' directory found."));
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") || f.endsWith(".js"))
    .sort();

  let db;
  try {
    db = new Database(5);
    await ensureMigrationsTable(db);
  } catch (err) {
    console.error(chalk.red("[ERROR] Could not connect to database:"), err.message);
    process.exit(1);
  }

  const appliedRows = (await db.query("SELECT name, batch, executed_at FROM _bluebird_migrations ORDER BY id ASC")) || [];
  const appliedMap = new Map(appliedRows.map((r) => [r.name, r]));

  console.log(chalk.bold.cyan("\n============================================================="));
  console.log(chalk.bold.cyan(" Database Migrations Status"));
  console.log(chalk.bold.cyan("=============================================================\n"));

  for (const file of files) {
    if (appliedMap.has(file)) {
      const record = appliedMap.get(file);
      console.log(`  ${chalk.green("[APPLIED]")}  ${file.padEnd(40)} (Batch: ${record.batch}, At: ${record.executed_at})`);
    } else {
      console.log(`  ${chalk.yellow("[PENDING]")}  ${file}`);
    }
  }

  console.log("");
  process.exit(0);
}

/**
 * Runs seed scripts from database/seeds/.
 */
async function runSeeds() {
  const seedsDir = path.resolve(process.cwd(), "database/seeds");
  if (!fs.existsSync(seedsDir)) {
    console.log(chalk.yellow("[INFO] No 'database/seeds' directory found. Nothing to seed."));
    return;
  }

  const files = fs
    .readdirSync(seedsDir)
    .filter((f) => f.endsWith(".sql") || f.endsWith(".js"))
    .sort();

  if (files.length === 0) {
    console.log(chalk.yellow("[INFO] No seed files found in 'database/seeds'."));
    return;
  }

  let db;
  try {
    db = new Database(5);
  } catch (err) {
    console.error(chalk.red("[ERROR] Could not connect to database to run seeds:"), err.message);
    process.exit(1);
  }

  console.log(chalk.cyan(`[INFO] Running ${files.length} seed file(s)...\n`));

  for (const file of files) {
    const filePath = path.join(seedsDir, file);
    try {
      if (file.endsWith(".sql")) {
        const sql = fs.readFileSync(filePath, "utf-8");
        const statements = sql
          .split(/;\s*$/m)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        await db.transaction(async (tx) => {
          for (const stmt of statements) {
            await tx.query(stmt);
          }
        });
      } else if (file.endsWith(".js")) {
        const modulePath = `file://${filePath}`;
        const seedModule = await import(modulePath);
        if (typeof seedModule.seed === "function") {
          await db.transaction(async (tx) => {
            await seedModule.seed(tx);
          });
        }
      }

      console.log(chalk.green(`  [SEEDED] ${file}`));
    } catch (err) {
      console.error(chalk.red(`  [FAILED] ${file}: ${err.message}`));
      process.exit(1);
    }
  }

  console.log(chalk.bold.green("\n[OK] Database seeding completed."));
  process.exit(0);
}

const rawArgs = process.argv.slice(2);
const cmd = rawArgs[0];

if (cmd === "make:migration") {
  makeMigration(rawArgs[1]);
} else if (cmd === "make:seed") {
  makeSeed(rawArgs[1]);
} else if (cmd === "migrate:status") {
  showMigrationStatus();
} else if (cmd === "seed") {
  runSeeds();
} else {
  runMigrations();
}
