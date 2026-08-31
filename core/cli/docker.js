#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import chalk from "chalk";

/**
 * Parses the .env file to retrieve project configurations.
 * @returns {Object} Local environment variables dictionary.
 */
function getEnvVars() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (line && !line.startsWith("#") && line.includes("=")) {
        const idx = line.indexOf("=");
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        env[key] = value;
      }
    });
  }
  return env;
}

/**
 * Determines the target database type (sqlite, mysql, or postgres) from environment variables.
 * @param {Object} [env] - Environment dictionary.
 * @returns {string} 'sqlite', 'postgres', 'mysql', or 'none'.
 */
function getDbType(env = getEnvVars()) {
  const dbTypeRaw = (env.DB_TYPE || "").toLowerCase().trim();
  if (
    dbTypeRaw === "sqlite" ||
    dbTypeRaw === "sqlite3" ||
    dbTypeRaw === "sql" ||
    dbTypeRaw === "better-sqlite3" ||
    dbTypeRaw === "better-sqlite" ||
    dbTypeRaw === "lite"
  ) {
    return "sqlite";
  }
  if (
    dbTypeRaw === "postgres" ||
    dbTypeRaw === "postgresql" ||
    dbTypeRaw === "pg" ||
    dbTypeRaw === "psql" ||
    dbTypeRaw === "pgsql" ||
    dbTypeRaw === "postgre" ||
    dbTypeRaw === "postgr" ||
    dbTypeRaw === "psgr"
  ) {
    return "postgres";
  }
  if (
    dbTypeRaw === "mysql" ||
    dbTypeRaw === "mariadb" ||
    dbTypeRaw === "maria" ||
    dbTypeRaw === "my"
  ) {
    return "mysql";
  }
  if (
    dbTypeRaw === "none" ||
    dbTypeRaw === "no" ||
    dbTypeRaw === "false" ||
    dbTypeRaw === "null" ||
    dbTypeRaw === "0"
  ) {
    return "none";
  }
  if (env.DATABASE_URL && !env.DATABASE_URL.startsWith("#")) {
    if (env.DATABASE_URL.startsWith("sqlite://") || env.DATABASE_URL.startsWith("sqlite:")) {
      return "sqlite";
    }
    if (env.DATABASE_URL.startsWith("postgres://") || env.DATABASE_URL.startsWith("postgresql://")) {
      return "postgres";
    }
    if (env.DATABASE_URL.startsWith("mysql://")) {
      return "mysql";
    }
  }
  return "sqlite";
}

/**
 * Spawns a child process and inherits standard IO for interactive terminal sessions.
 * @param {string} command - The binary to execute.
 * @param {string[]} args - Argument list.
 * @returns {Promise<number>} Exit code of the process.
 */
function runCmd(command, args) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: "inherit", env: process.env });
    proc.on("close", (code) => {
      resolve(code || 0);
    });
  });
}

/**
 * Confirms that a docker-compose.yml file is present in the workspace directory.
 */
function checkComposeFile() {
  if (!fs.existsSync("docker-compose.yml")) {
    console.error(chalk.red("Error: docker-compose.yml not found in the current directory."));
    process.exit(1);
  }
}

/**
 * Handles the 'start' CLI command.
 * @param {string} service - Service to boot up.
 */
async function startCommand(service) {
  checkComposeFile();
  const dbType = getDbType();

  if (service === "sqlite" || service === "--sqlite" || service === "mysql" || service === "--mysql" || service === "postgres" || service === "--postgres" || service === "db" || service === "--db" || service === "dev") {
    const targetContainer = (service === "sqlite" || service === "--sqlite") ? "sqlite" : ((service === "postgres" || service === "--postgres") ? "postgres" : ((service === "mysql" || service === "--mysql") ? "mysql" : dbType));
    if (targetContainer === "none") {
      console.log(chalk.yellow("[INFO] DB_TYPE is set to 'none', skipping database container startup."));
      return;
    }
    if (targetContainer === "sqlite") {
      console.log(chalk.cyan("[INFO] SQLite is file-based (embedded in app). Starting Redis container..."));
      const code = await runCmd("docker", ["compose", "up", "-d", "redis"]);
      if (code === 0) {
        console.log(chalk.green("Redis started."));
      } else {
        console.error(chalk.red("Error starting Redis."));
        process.exit(1);
      }
      return;
    }
    console.log(chalk.cyan(`Starting ${targetContainer.toUpperCase()} container...`));
    const code = await runCmd("docker", ["compose", "up", "-d", targetContainer]);
    if (code === 0) {
      console.log(chalk.green(`${targetContainer.toUpperCase()} started.`));
    } else {
      console.error(chalk.red(`Error starting ${targetContainer}. Make sure '${targetContainer}' service is defined in docker-compose.yml.`));
      process.exit(1);
    }
  } else if (service === "redis" || service === "--redis") {
    console.log(chalk.cyan("Starting Redis container..."));
    const code = await runCmd("docker", ["compose", "up", "-d", "redis"]);
    if (code === 0) {
      console.log(chalk.green("Redis started."));
    } else {
      console.error(chalk.red("Error starting Redis."));
      process.exit(1);
    }
  } else if (service === "dbs" || service === "databases") {
    if (dbType === "none" || dbType === "sqlite") {
      console.log(chalk.cyan(`DB_TYPE is '${dbType}' (embedded/none), starting Redis container only...`));
      const code = await runCmd("docker", ["compose", "up", "-d", "redis"]);
      if (code === 0) {
        console.log(chalk.green("Redis started."));
      } else {
        console.error(chalk.red("Error starting Redis."));
        process.exit(1);
      }
      return;
    }
    console.log(chalk.cyan(`Starting Database containers (${dbType.toUpperCase()} + Redis)...`));
    const code = await runCmd("docker", ["compose", "up", "-d", dbType, "redis"]);
    if (code === 0) {
      console.log(chalk.green("Database containers started."));
    } else {
      console.error(chalk.red("Error starting databases."));
      process.exit(1);
    }
  } else if (service === "prod" || service === "app" || service === "--app" || !service) {
    console.log(chalk.cyan("Starting production stack (DB + Redis + App + Nginx)..."));
    const code = await runCmd("docker", ["compose", "--profile", "prod", "up", "-d"]);
    if (code === 0) {
      console.log(chalk.green("Production stack started successfully."));
      console.log(chalk.cyan("\nRunning post-start health check (Doctor)...\n"));
      try {
        const { runDoctor } = await import("./doctor.js");
        await runDoctor();
      } catch (err) {
        console.log(chalk.gray(`Health check skipped: ${err.message}`));
      }
    } else {
      console.error(chalk.red("Error starting production stack."));
      process.exit(1);
    }
  } else {
    console.error(chalk.red(`Unknown service '${service}'. Use: sqlite, mysql, postgres, db, redis, dbs, prod.`));
    process.exit(1);
  }
}

/**
 * Handles the 'dev' CLI command.
 */
async function devCommand() {
  checkComposeFile();
  const dbType = getDbType();
  console.log(chalk.cyan("Starting development environment (Database + Redis)..."));

  const containers = ["redis"];
  if (dbType !== "none" && dbType !== "sqlite") {
    containers.unshift(dbType);
  }

  const code = await runCmd("docker", ["compose", "up", "-d", ...containers]);
  if (code === 0) {
    console.log(chalk.green("Development containers started."));
    if (dbType !== "none" && dbType !== "sqlite") {
      console.log(chalk.cyan("View live logs with: npx blue-bird docker logs db"));
    }
    console.log(chalk.yellow("Now execute: npm run dev"));
  } else {
    console.error(chalk.red("Error starting development environment."));
    process.exit(1);
  }
}

/**
 * Handles the 'stop' CLI command.
 * @param {string} service - Service to stop.
 */
async function stopCommand(service) {
  checkComposeFile();
  const dbType = getDbType();

  if (!service || service === "all") {
    console.log(chalk.cyan("Stopping all Blue Bird containers..."));
    await runCmd("docker", ["compose", "--profile", "prod", "down"]);
    console.log(chalk.green("All containers stopped."));
  } else if (service === "sqlite" || service === "--sqlite" || service === "mysql" || service === "--mysql" || service === "postgres" || service === "--postgres" || service === "db" || service === "--db") {
    const targetContainer = (service === "sqlite" || service === "--sqlite") ? "sqlite" : ((service === "postgres" || service === "--postgres") ? "postgres" : ((service === "mysql" || service === "--mysql") ? "mysql" : dbType));
    if (targetContainer === "none" || targetContainer === "sqlite") {
      console.log(chalk.yellow(`[INFO] DB_TYPE is set to '${targetContainer}', no database container to stop.`));
      return;
    }
    console.log(chalk.cyan(`Stopping ${targetContainer.toUpperCase()}...`));
    await runCmd("docker", ["compose", "stop", targetContainer]);
    await runCmd("docker", ["compose", "rm", "-f", targetContainer]);
    console.log(chalk.green(`${targetContainer.toUpperCase()} stopped.`));
  } else if (service === "redis" || service === "--redis") {
    console.log(chalk.cyan("Stopping Redis..."));
    await runCmd("docker", ["compose", "stop", "redis"]);
    await runCmd("docker", ["compose", "rm", "-f", "redis"]);
    console.log(chalk.green("Redis stopped."));
  } else if (service === "app" || service === "--app") {
    console.log(chalk.cyan("Stopping Node.js app container..."));
    await runCmd("docker", ["compose", "--profile", "prod", "stop", "app"]);
    await runCmd("docker", ["compose", "--profile", "prod", "rm", "-f", "app"]);
    console.log(chalk.green("App container stopped."));
  } else {
    console.error(chalk.red(`Unknown service '${service}'. Use: all, sqlite, mysql, postgres, db, redis, app.`));
    process.exit(1);
  }
}

/**
 * Handles the 'build' CLI command.
 * @param {string[]} options - Build configuration options.
 */
async function buildCommand(options = []) {
  checkComposeFile();
  console.log(chalk.cyan("Building Blue Bird app Docker image..."));
  const cmdArgs = ["compose", "--profile", "prod", "build"];
  if (options.includes("--no-cache") || options.includes("-n")) {
    cmdArgs.push("--no-cache");
  }
  cmdArgs.push("app");

  const code = await runCmd("docker", cmdArgs);
  if (code === 0) {
    console.log(chalk.green("Image built successfully. Start with: npx blue-bird docker start prod"));
  } else {
    console.error(chalk.red("Build error."));
    process.exit(1);
  }
}

/**
 * Handles the 'ps' CLI command.
 */
async function psCommand() {
  checkComposeFile();
  console.log(chalk.cyan("Active Blue Bird Containers:"));
  await runCmd("docker", ["compose", "--profile", "prod", "ps"]);
}

/**
 * Handles the 'logs' CLI command.
 * @param {string} service - Service to pull logs from.
 * @param {string} followOpt - Flag for active log tailing.
 */
async function logsCommand(service, followOpt) {
  checkComposeFile();
  const follow = followOpt !== "--no-follow";
  const dbType = getDbType();
  let targetService = "app";
  if (service === "mysql" || service === "postgres" || service === "sqlite" || service === "db") {
    targetService = service === "db" ? dbType : service;
  }
  if (targetService === "none") {
    console.log(chalk.yellow("[INFO] DB_TYPE is set to 'none', no database container logs to display."));
    return;
  }
  if (targetService === "sqlite") {
    console.log(chalk.yellow("[INFO] SQLite is embedded in the Node.js application container. Displaying app logs:"));
    targetService = "app";
  }

  const cmdArgs = ["compose"];
  if (targetService === "app") {
    cmdArgs.push("--profile", "prod");
  }
  cmdArgs.push("logs", "--tail=100");
  if (follow) {
    cmdArgs.push("-f");
  }
  cmdArgs.push(targetService);

  await runCmd("docker", cmdArgs);
}

/**
 * Handles interactive shell connections or smart queries into the SQLite, MySQL, or PostgreSQL database.
 * @param {string[]} clientArgs - CLI arguments.
 * @param {string} explicitService - Explicit target service if specified ('sqlite', 'mysql', 'postgres', 'psql', 'db').
 */
async function dbClientCommand(clientArgs = [], explicitService) {
  checkComposeFile();
  const env = getEnvVars();
  const dbType = explicitService === "sqlite" ? "sqlite" : (explicitService === "postgres" || explicitService === "psql" ? "postgres" : (explicitService === "mysql" ? "mysql" : getDbType(env)));
  if (dbType === "none") {
    console.error(chalk.yellow("[INFO] DB_TYPE is set to 'none'. No database container available to connect to."));
    return;
  }

  let userOpt, passOpt, dbOpt, rootOpt = false;
  let limitOpt = null, whereOpt = null;
  const positionalArgs = [];

  for (let i = 0; i < clientArgs.length; i++) {
    const arg = clientArgs[i];
    if (arg === "-u" || arg === "--user") {
      userOpt = clientArgs[++i];
    } else if (arg.startsWith("--user=")) {
      userOpt = arg.split("=")[1];
    } else if (arg === "-p" || arg === "--password") {
      passOpt = clientArgs[++i];
    } else if (arg.startsWith("--password=")) {
      passOpt = arg.split("=")[1];
    } else if (arg === "-d" || arg === "--db") {
      dbOpt = clientArgs[++i];
    } else if (arg.startsWith("--db=")) {
      dbOpt = arg.split("=")[1];
    } else if (arg === "--root") {
      rootOpt = true;
    } else if (arg === "--limit" || arg === "-l") {
      limitOpt = clientArgs[++i];
    } else if (arg.startsWith("--limit=")) {
      limitOpt = arg.split("=")[1];
    } else if (arg === "--where" || arg === "-w") {
      whereOpt = clientArgs[++i];
    } else if (arg.startsWith("--where=")) {
      whereOpt = arg.split("=")[1];
    } else if (!arg.startsWith("-")) {
      positionalArgs.push(arg);
    }
  }

  let dbUser = userOpt;
  let dbPass = passOpt;
  let dbName = dbOpt;

  let sqlQuery = null;
  if (positionalArgs.length > 0) {
    const firstPos = positionalArgs[0].toLowerCase();

    if (firstPos === "export" || firstPos === "dump") {
      await exportDbCommand(dbType, positionalArgs[1], userOpt, passOpt, dbOpt);
      return;
    }
    if (firstPos === "import" || firstPos === "restore") {
      await importDbCommand(dbType, positionalArgs[1], userOpt, passOpt, dbOpt);
      return;
    }
    if (firstPos === "tables") {
      if (dbType === "postgres") {
        sqlQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
      } else if (dbType === "sqlite") {
        sqlQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';";
      } else {
        sqlQuery = "SHOW TABLES;";
      }
    } else if (firstPos === "columns" || firstPos === "cols" || firstPos === "describe" || firstPos === "desc") {
      const tableName = positionalArgs[1];
      if (!tableName) {
        console.error(chalk.red("Error: Please specify a table name. Example: npx blue-bird docker db columns users"));
        process.exit(1);
      }
      if (dbType === "postgres") {
        sqlQuery = `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${tableName}';`;
      } else if (dbType === "sqlite") {
        sqlQuery = `PRAGMA table_info(${tableName});`;
      } else {
        sqlQuery = `SHOW COLUMNS FROM ${tableName};`;
      }
    } else {
      const rawInput = positionalArgs.join(" ").trim();
      const isFullQuery = /^(select|show|desc|describe|explain|insert|update|delete|create|drop|alter|truncate|pragma)\b/i.test(rawInput) || rawInput.includes(" ");
      if (isFullQuery) {
        sqlQuery = rawInput;
      } else {
        const tableName = rawInput;
        sqlQuery = `SELECT * FROM ${tableName}`;
        if (whereOpt) {
          sqlQuery += ` WHERE ${whereOpt}`;
        }
        if (limitOpt) {
          sqlQuery += ` LIMIT ${limitOpt}`;
        }
      }
      if (!sqlQuery.endsWith(";")) {
        sqlQuery += ";";
      }
    }
  }

  if (dbType === "sqlite") {
    const dbFile = env.DB_FILE || "database/blue_bird.db";
    const dbPath = path.isAbsolute(dbFile) ? dbFile : path.resolve(process.cwd(), dbFile);
    if (!fs.existsSync(dbPath)) {
      console.log(chalk.yellow(`[INFO] SQLite database file not found at '${dbFile}'. It will be created upon query execution.`));
    }

    try {
      let BetterSqlite;
      try {
        BetterSqlite = (await import("better-sqlite3")).default;
      } catch (err) {
        console.error(chalk.red("Error: 'better-sqlite3' is not installed. Run: npm install better-sqlite3"));
        process.exit(1);
      }

      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const db = new BetterSqlite(dbPath);
      if (sqlQuery) {
        console.log(chalk.cyan(`🔍 Executing SQLite query on '${dbFile}':`));
        console.log(chalk.gray(`   ${sqlQuery}\n`));
        const isSelect = /^(select|pragma|explain)/i.test(sqlQuery.trim());
        if (isSelect) {
          const rows = db.prepare(sqlQuery).all();
          console.table(rows);
        } else {
          const info = db.prepare(sqlQuery).run();
          console.log(chalk.green(`✔ Query executed successfully. Changes: ${info.changes}, LastInsertRowId: ${info.lastInsertRowid}`));
        }
      } else {
        console.log(chalk.cyan(`Connected to SQLite database '${dbFile}'.`));
        console.log(chalk.gray("Active Tables:"));
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        console.table(tables);
        console.log(chalk.yellow("\nTip: Run queries with: npx blue-bird docker db \"SELECT * FROM table_name\""));
      }
      db.close();
      return;
    } catch (err) {
      console.error(chalk.red("[DATABASE ERROR] SQLite operation failed:"), err.message);
      process.exit(1);
    }
  } else if (dbType === "postgres") {
    dbUser = rootOpt ? "postgres" : (dbUser || env.DB_USER || "postgres");
    dbName = dbName || env.DB_NAME || "blue_bird";

    const cmdArgs = ["compose", "exec", "postgres", "psql", `-U${dbUser}`];
    if (dbName) {
      cmdArgs.push("-d", dbName);
    }

    if (sqlQuery) {
      console.log(chalk.cyan(`🔍 Executing PostgreSQL query on database '${dbName}':`));
      console.log(chalk.gray(`   ${sqlQuery}\n`));
      cmdArgs.push("-c", sqlQuery);
    } else {
      const targetDb = dbName ? ` (database: ${dbName})` : "";
      console.log(chalk.cyan(`Connecting to PostgreSQL shell (psql) in container as '${dbUser}'${targetDb}...`));
    }

    const code = await runCmd("docker", cmdArgs);
    if (code !== 0) {
      console.error(chalk.yellow("Make sure the PostgreSQL container is running: npx blue-bird docker start postgres"));
      process.exit(1);
    }
  } else {
    if (rootOpt) {
      dbUser = "root";
      dbPass = env.DB_PASSWORD || "root";
    } else {
      dbUser = dbUser || env.DB_USER || "root";
      dbPass = dbPass || env.DB_PASSWORD || "root";
    }
    dbName = dbName || env.DB_NAME || "blue_bird";

    const cmdArgs = ["compose", "exec", "mysql", "mysql", `-u${dbUser}`];
    if (dbPass) {
      cmdArgs.push(`-p${dbPass}`);
    }
    if (dbName) {
      cmdArgs.push(dbName);
    }

    if (sqlQuery) {
      console.log(chalk.cyan(`🔍 Executing MySQL query on database '${dbName}':`));
      console.log(chalk.gray(`   ${sqlQuery}\n`));
      cmdArgs.push("-t", "-e", sqlQuery);
    } else {
      const targetDb = dbName ? ` (database: ${dbName})` : "";
      console.log(chalk.cyan(`Connecting to MySQL shell in container as '${dbUser}'${targetDb}...`));
    }

    const code = await runCmd("docker", cmdArgs);
    if (code !== 0) {
      console.error(chalk.yellow("Make sure the MySQL container is running: npx blue-bird docker start mysql"));
      process.exit(1);
    }
  }
}

/**
 * Exports database schema & data into a .sql or .db file inside backups/ folder.
 * @param {string} dbType - Target db type ('sqlite', 'mysql', 'postgres', 'none').
 * @param {string} [filenameArg] - Custom backup filename.
 * @param {string} [userOpt] - Custom db user.
 * @param {string} [passOpt] - Custom db password.
 * @param {string} [dbOpt] - Custom db name.
 */
async function exportDbCommand(dbType, filenameArg, userOpt, passOpt, dbOpt) {
  checkComposeFile();
  const env = getEnvVars();
  const targetDbType = dbType === "none" ? getDbType(env) : dbType;

  if (targetDbType === "none") {
    console.error(chalk.yellow("[INFO] DB_TYPE is set to 'none'. No database available to export."));
    return;
  }

  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  if (targetDbType === "sqlite") {
    const dbFile = env.DB_FILE || "database/blue_bird.db";
    const srcDbPath = path.isAbsolute(dbFile) ? dbFile : path.resolve(process.cwd(), dbFile);
    if (!fs.existsSync(srcDbPath)) {
      console.error(chalk.red(`Error: SQLite database file '${dbFile}' does not exist.`));
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    const backupName = filenameArg || `backup_sqlite_${timestamp}.db`;
    const destFile = path.isAbsolute(backupName)
      ? backupName
      : (backupName.includes("/") || backupName.includes("\\")
        ? path.resolve(process.cwd(), backupName)
        : path.join(backupsDir, backupName));

    fs.copyFileSync(srcDbPath, destFile);
    const stats = fs.statSync(destFile);
    const sizeKb = (stats.size / 1024).toFixed(2);
    console.log(chalk.green(`\n✔ SQLite database exported successfully!`));
    console.log(chalk.cyan(`   File: ${path.relative(process.cwd(), destFile)} (${sizeKb} KB)`));
    return;
  }

  let outputFile;
  if (filenameArg) {
    let name = filenameArg;
    if (!name.endsWith(".sql")) name += ".sql";
    if (path.isAbsolute(name)) {
      outputFile = name;
    } else if (name.includes("/") || name.includes("\\")) {
      outputFile = path.resolve(process.cwd(), name);
    } else {
      outputFile = path.join(backupsDir, name);
    }
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
    outputFile = path.join(backupsDir, `backup_${targetDbType}_${timestamp}.sql`);
  }

  const dbUser = userOpt || env.DB_USER || (targetDbType === "postgres" ? "postgres" : "root");
  const dbPass = passOpt || env.DB_PASSWORD || (targetDbType === "postgres" ? "postgres" : "root");
  const dbName = dbOpt || env.DB_NAME || "blue_bird";

  let cmdArgs = [];
  if (targetDbType === "postgres") {
    cmdArgs = ["compose", "exec", "-T", "postgres", "pg_dump", `-U${dbUser}`, "-d", dbName];
  } else {
    cmdArgs = ["compose", "exec", "-T", "mysql", "mysqldump", `-u${dbUser}`, `-p${dbPass}`, dbName];
  }

  const relPath = path.relative(process.cwd(), outputFile);
  console.log(chalk.cyan(`📦 Exporting ${targetDbType.toUpperCase()} database '${dbName}' to '${relPath}'...`));

  const success = await exportDbToFile(cmdArgs, outputFile);
  if (success) {
    const stats = fs.statSync(outputFile);
    const sizeKb = (stats.size / 1024).toFixed(2);
    console.log(chalk.green(`\n✔ Database exported successfully!`));
    console.log(chalk.cyan(`   File: ${relPath} (${sizeKb} KB)`));
  } else {
    console.error(chalk.red(`\n✖ Database export failed.`));
    process.exit(1);
  }
}

/**
 * Streams stdout from container dump command into a local file.
 */
function exportDbToFile(cmdArgs, outputFile) {
  return new Promise((resolve) => {
    const outStream = fs.createWriteStream(outputFile);
    const proc = spawn("docker", cmdArgs, { stdio: ["inherit", "pipe", "pipe"], env: process.env });
    proc.stdout.pipe(outStream);

    let errOutput = "";
    proc.stderr.on("data", (chunk) => {
      errOutput += chunk.toString();
    });

    proc.on("close", (code) => {
      outStream.close();
      if (code === 0) {
        resolve(true);
      } else {
        if (errOutput) console.error(chalk.yellow(`Warning/Stderr: ${errOutput.trim()}`));
        resolve(code === 0);
      }
    });
  });
}

/**
 * Imports a .sql or .db file from backups/ folder into the database.
 * @param {string} dbType - Target db type ('sqlite', 'mysql', 'postgres', 'none').
 * @param {string} [filenameArg] - Custom backup filename.
 * @param {string} [userOpt] - Custom db user.
 * @param {string} [passOpt] - Custom db password.
 * @param {string} [dbOpt] - Custom db name.
 */
async function importDbCommand(dbType, filenameArg, userOpt, passOpt, dbOpt) {
  checkComposeFile();
  const env = getEnvVars();
  const targetDbType = dbType === "none" ? getDbType(env) : dbType;

  if (targetDbType === "none") {
    console.error(chalk.yellow("[INFO] DB_TYPE is set to 'none'. No database available to import into."));
    return;
  }

  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  let inputFile;
  if (filenameArg) {
    let name = filenameArg;
    if (path.isAbsolute(name) && fs.existsSync(name)) {
      inputFile = name;
    } else if (fs.existsSync(path.resolve(process.cwd(), name))) {
      inputFile = path.resolve(process.cwd(), name);
    } else if (fs.existsSync(path.join(backupsDir, name))) {
      inputFile = path.join(backupsDir, name);
    } else if (fs.existsSync(path.join(backupsDir, `${name}.sql`))) {
      inputFile = path.join(backupsDir, `${name}.sql`);
    } else if (fs.existsSync(path.join(backupsDir, `${name}.db`))) {
      inputFile = path.join(backupsDir, `${name}.db`);
    } else {
      console.error(chalk.red(`Error: Backup file '${filenameArg}' not found in current directory or 'backups/' folder.`));
      process.exit(1);
    }
  } else {
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith(".sql") || f.endsWith(".db"))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      console.error(chalk.red(`Error: No backup files found in 'backups/' directory.`));
      console.log(chalk.yellow(`Usage: npx blue-bird docker import <file.sql | file.db>`));
      process.exit(1);
    }

    inputFile = path.join(backupsDir, files[0].name);
    console.log(chalk.yellow(`[INFO] No file specified. Using most recent backup: '${files[0].name}'`));
  }

  const relPath = path.relative(process.cwd(), inputFile);

  if (targetDbType === "sqlite") {
    const dbFile = env.DB_FILE || "database/blue_bird.db";
    const destDbPath = path.isAbsolute(dbFile) ? dbFile : path.resolve(process.cwd(), dbFile);
    const destDir = path.dirname(destDbPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (inputFile.endsWith(".db") || inputFile.endsWith(".sqlite")) {
      fs.copyFileSync(inputFile, destDbPath);
      console.log(chalk.green(`\n✔ SQLite database restored successfully from '${relPath}' to '${dbFile}'!`));
      return;
    }

    try {
      const BetterSqlite = (await import("better-sqlite3")).default;
      const db = new BetterSqlite(destDbPath);
      const sqlContent = fs.readFileSync(inputFile, "utf-8");
      db.exec(sqlContent);
      db.close();
      console.log(chalk.green(`\n✔ SQL statements from '${relPath}' imported successfully into '${dbFile}'!`));
    } catch (err) {
      console.error(chalk.red(`\n✖ SQLite import failed:`), err.message);
      process.exit(1);
    }
    return;
  }

  const dbUser = userOpt || env.DB_USER || (targetDbType === "postgres" ? "postgres" : "root");
  const dbPass = passOpt || env.DB_PASSWORD || (targetDbType === "postgres" ? "postgres" : "root");
  const dbName = dbOpt || env.DB_NAME || "blue_bird";

  let cmdArgs = [];
  if (targetDbType === "postgres") {
    cmdArgs = ["compose", "exec", "-T", "postgres", "psql", `-U${dbUser}`, "-d", dbName];
  } else {
    cmdArgs = ["compose", "exec", "-T", "mysql", "mysql", `-u${dbUser}`, `-p${dbPass}`, dbName];
  }

  console.log(chalk.cyan(`📥 Importing SQL dump '${relPath}' into ${targetDbType.toUpperCase()} database '${dbName}'...`));

  const success = await importDbFromFile(cmdArgs, inputFile);
  if (success) {
    console.log(chalk.green(`\n✔ Database imported successfully from '${relPath}'!`));
  } else {
    console.error(chalk.red(`\n✖ Database import failed.`));
    process.exit(1);
  }
}

/**
 * Streams a local .sql file into container stdin.
 */
function importDbFromFile(cmdArgs, inputFile) {
  return new Promise((resolve) => {
    const inStream = fs.createReadStream(inputFile);
    const proc = spawn("docker", cmdArgs, { stdio: ["pipe", "inherit", "pipe"], env: process.env });
    inStream.pipe(proc.stdin);

    let errOutput = "";
    proc.stderr.on("data", (chunk) => {
      errOutput += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        if (errOutput) console.error(chalk.yellow(`Warning/Stderr: ${errOutput.trim()}`));
        resolve(code === 0);
      }
    });
  });
}

/**
 * Handles cleaning up and pruning unused Docker resources.
 * @param {boolean} forceOpt - Force cleaning without user confirmation.
 * @param {boolean} allOpt - Clean all unused resources.
 */
async function pruneCommand(forceOpt, allOpt) {
  if (!forceOpt) {
    console.log(chalk.yellow("Clean unused volumes, dangling images, and BuildKit cache? (Press enter to confirm, Ctrl+C to cancel)"));
    await new Promise((resolve) => process.stdin.once("data", resolve));
  }

  console.log(chalk.cyan("1/3 Cleaning orphaned Docker volumes..."));
  await runCmd("docker", ["volume", "prune", "-f"]);

  console.log(chalk.cyan("2/3 Cleaning unused Docker images..."));
  const imgArgs = ["image", "prune"];
  if (allOpt) {
    imgArgs.push("-a");
  }
  imgArgs.push("-f");
  await runCmd("docker", imgArgs);

  console.log(chalk.cyan("3/3 Cleaning BuildKit build cache..."));
  await runCmd("docker", ["builder", "prune", "-a", "-f"]);

  console.log(chalk.green("\nDocker cleanup completed successfully! Current disk usage:"));
  await runCmd("docker", ["system", "df"]);
}

/**
 * Executes PM2 commands inside the Node.js application container.
 * @param {string[]} pm2Args - Arguments to pass to PM2.
 */
async function pm2Command(pm2Args = []) {
  checkComposeFile();
  const subCommand = pm2Args[0] || "status";
  const cmdArgs = ["compose", "exec", "app", "pm2", subCommand, ...pm2Args.slice(1)];
  const code = await runCmd("docker", cmdArgs);
  if (code !== 0) {
    console.error(chalk.red("Error running PM2 command. Make sure the production stack is started."));
    process.exit(1);
  }
}

/**
 * Handles interactive shell connections or smart query subcommands into the Redis container.
 * @param {string[]} redisArgs - Subcommands or key parameters.
 */
async function redisCommand(redisArgs = []) {
  checkComposeFile();
  const cmdArgs = ["compose", "exec", "redis", "redis-cli"];

  if (redisArgs.length > 0) {
    const firstArg = redisArgs[0].toLowerCase();

    if (firstArg === "monitor") {
      console.log(chalk.cyan("📡 Monitoring live Redis commands... (Press Ctrl+C to exit)"));
      cmdArgs.push("monitor");
    } else if (firstArg === "keys") {
      const pattern = redisArgs[1] || "*";
      console.log(chalk.cyan(`🔑 Fetching Redis keys matching '${pattern}'...`));
      cmdArgs.push("keys", pattern);
    } else if (firstArg === "key") {
      const keyName = redisArgs[1];
      if (!keyName) {
        console.error(chalk.red("Error: Please specify a key name. Example: npx blue-bird docker redis key session:123"));
        process.exit(1);
      }
      console.log(chalk.cyan(`📄 Getting value for Redis key '${keyName}'...`));
      cmdArgs.push("get", keyName);
    } else {
      cmdArgs.push(...redisArgs);
    }
  } else {
    console.log(chalk.cyan("Connecting to Redis interactive terminal (redis-cli)..."));
  }

  const code = await runCmd("docker", cmdArgs);
  if (code !== 0) {
    console.error(chalk.yellow("Make sure the Redis container is running: npx blue-bird docker start redis"));
    process.exit(1);
  }
}

/**
 * Entry point for Blue Bird CLI Docker subcommands.
 */
async function main() {
  const env = getEnvVars();
  let projectName = env.BLUEBIRD_PROJECT_NAME;
  if (!projectName && env.TITLE) {
    projectName = env.TITLE.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  }
  if (!projectName) {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name) {
          projectName = pkg.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
        }
      } catch {}
    }
  }
  if (!projectName) {
    projectName = "bluebird";
  }
  process.env.BLUEBIRD_PROJECT_NAME = projectName;
  process.env.TITLE = projectName;

  const rawArgs = process.argv.slice(2);
  const dockerIdx = rawArgs.indexOf("docker");
  const args = dockerIdx !== -1 ? rawArgs.slice(dockerIdx + 1) : rawArgs;
  const command = args[0];

  if (!command) {
    await psCommand();
    return;
  }


  switch (command) {
    case "start":
      await startCommand(args[1]);
      break;
    case "dev":
      await devCommand();
      break;
    case "stop":
      await stopCommand(args[1]);
      break;
    case "build":
      await buildCommand(args.slice(1));
      break;
    case "ps":
    case "status":
      await psCommand();
      break;
    case "logs":
      await logsCommand(args[1], args[2]);
      break;
    case "pm2":
      await pm2Command(args.slice(1));
      break;
    case "export":
    case "dump":
      await exportDbCommand("none", args[1]);
      break;
    case "import":
    case "restore":
      await importDbCommand("none", args[1]);
      break;
    case "redis":
      await redisCommand(args.slice(1));
      break;
    case "sqlite":
    case "mysql":
    case "postgres":
    case "psql":
    case "db":
      await dbClientCommand(args.slice(1), command);
      break;
    case "df":
    case "disk":
      console.log(chalk.cyan("📊 Docker Disk Usage:"));
      await runCmd("docker", ["system", "df"]);
      break;
    case "prune":
    case "clean": {
      const force = args.includes("-f") || args.includes("--force");
      const all = args.includes("-a") || args.includes("--all");
      await pruneCommand(force, all);
      break;
    }
    case "help":
    case "--help":
    case "-h":
      helpCommand();
      break;
    default:
      console.log(chalk.yellow(`Unknown docker command: ${command}`));
      console.log("Run 'npx blue-bird docker help' to see all available commands.");
  }

}

/**
 * Displays the Blue Bird Docker CLI help manual.
 */
function helpCommand() {
  console.log(chalk.bold.blue("\n🐦 Blue Bird Docker CLI — Command Reference"));
  console.log(chalk.gray("────────────────────────────────────────────────────────────"));
  console.log(chalk.bold("Usage: ") + chalk.cyan("npx blue-bird docker <command> [options]\n"));

  console.log(chalk.bold.yellow("📦 Container Lifecycle:"));
  console.log(`  ${chalk.green("dev")}                      Starts development containers (Redis / DB). Run npm run dev locally.`);
  console.log(`  ${chalk.green("start [service]")}          Starts production stack (app, nginx, redis, db) or specific service.`);
  console.log(`  ${chalk.green("start dev")}              Starts development services only.`);
  console.log(`  ${chalk.green("start db")}               Starts configured database container only.`);
  console.log(`  ${chalk.green("start redis")}            Starts Redis container only.`);
  console.log(`  ${chalk.green("start dbs")}              Starts all database containers (DB + Redis).`);
  console.log(`  ${chalk.green("stop [service]")}           Stops all running containers (or specific service).`);
  console.log(`  ${chalk.green("build [--no-cache]")}      Builds or updates the Node.js production image.`);
  console.log(`  ${chalk.green("ps | status")}             Lists status of active project containers.`);
  console.log(`  ${chalk.green("logs [service] [-f]")}     Tails logs for container (app, db, redis, nginx).`);

  console.log(chalk.bold.yellow("\n🗄️  Database & Inspection:"));
  console.log(`  ${chalk.green("db | sqlite | mysql | psql")} [query/table]`);
  console.log(`                             Inspects active database (tables, columns, or runs SQL query).`);
  console.log(`                             ${chalk.gray("e.g. npx blue-bird docker db tables")}`);
  console.log(`                             ${chalk.gray("e.g. npx blue-bird docker db columns users")}`);
  console.log(`                             ${chalk.gray("e.g. npx blue-bird docker db \"SELECT * FROM users\"")}`);
  console.log(`  ${chalk.green("export | dump [file]")}     Dumps database backup (.db file for SQLite or .sql) into backups/.`);
  console.log(`  ${chalk.green("import | restore [file]")}   Restores database from backups/ (.db or .sql).`);

  console.log(chalk.bold.yellow("\n⚡ Redis & Monitoring:"));
  console.log(`  ${chalk.green("redis")} [command]          Runs interactive Redis CLI or smart subcommands.`);
  console.log(`                             ${chalk.gray("e.g. npx blue-bird docker redis monitor")}`);
  console.log(`                             ${chalk.gray("e.g. npx blue-bird docker redis keys")}`);
  console.log(`                             ${chalk.gray("e.g. npx blue-bird docker redis key <keyname>")}`);
  console.log(`  ${chalk.green("pm2 [args]")}               Runs PM2 commands inside app container (status, monit, reload).`);
  console.log(`  ${chalk.green("df | disk")}                Shows Docker disk usage statistics.`);
  console.log(`  ${chalk.green("prune | clean [-f] [-a]")}  Cleans unused volumes, dangling images, and build caches.`);

  console.log(chalk.bold.yellow("\nℹ️  Help:"));
  console.log(`  ${chalk.green("help | --help | -h")}       Displays this help message.`);
  console.log(chalk.gray("────────────────────────────────────────────────────────────\n"));
}

main();


