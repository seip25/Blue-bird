#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import chalk from "chalk";

/**
 * Parses .env file into key-value map.
 * @returns {Record<string, string>}
 */
function parseEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const idx = trimmed.indexOf("=");
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }
  return env;
}

/**
 * Checks if a TCP port is currently open for binding on localhost.
 * @param {number} port
 * @returns {Promise<boolean>} Resolves to true if available, false if in use.
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Finds a representative static file in public/ directory.
 * @returns {string|null}
 */
function findSampleStaticAsset() {
  const publicDir = path.resolve(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) return null;

  const candidates = [
    "css/style.css",
    "js/index.js",
    "favicon.ico",
    "images/logo.png",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(publicDir, candidate))) {
      return candidate;
    }
  }

  try {
    const files = fs.readdirSync(publicDir, { recursive: true });
    for (const f of files) {
      const full = path.join(publicDir, f);
      if (fs.statSync(full).isFile()) {
        return f.replace(/\\/g, "/");
      }
    }
  } catch {}

  return null;
}

/**
 * Formats file permissions mode (e.g. 0600, 0755).
 * @param {string} filePath
 * @returns {string}
 */
function getOctalPermissions(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return "0" + (stats.mode & 0o777).toString(8);
  } catch {
    return "unknown";
  }
}

/**
 * Runs the Blue Bird Doctor diagnostic suite.
 */
export async function runDoctor() {
  console.log(chalk.bold.cyan("============================================================="));
  console.log(chalk.bold.cyan(" Blue Bird System & Security Health Diagnostic (Doctor)"));
  console.log(chalk.bold.cyan("============================================================="));
  console.log("");

  const env = parseEnv();
  const envPath = path.resolve(process.cwd(), ".env");
  const projectDir = process.cwd();
  const isLinux = process.platform === "linux";
  const port = parseInt(env.PORT || "3000", 10);
  let appUrl = (env.APP_URL || `http://localhost:${port}`).replace(/\/$/, "");
  if (
    (appUrl === "http://localhost" || appUrl === "http://127.0.0.1") &&
    port !== 80
  ) {
    appUrl = `http://localhost:${port}`;
  }

  let issuesFound = 0;
  let warningsFound = 0;

  console.log(chalk.bold("[1/5] Environment & Configuration (.env):"));
  if (!fs.existsSync(envPath)) {
    console.log(chalk.red("  [FAIL] .env file is missing in project root."));
    console.log(chalk.gray("         Run 'npx blue-bird' or copy .env_example to .env."));
    issuesFound++;
  } else {
    console.log(chalk.green("  [PASS] .env file exists."));

    if (isLinux) {
      const envMode = getOctalPermissions(envPath);
      if (envMode !== "0600" && envMode !== "0400") {
        console.log(chalk.yellow(`  [WARN] .env permissions are '${envMode}'. Recommended mode is '0600' (chmod 600 .env).`));
        warningsFound++;
      } else {
        console.log(chalk.green(`  [PASS] .env file permissions are strictly isolated (${envMode}).`));
      }
    }

    if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
      console.log(chalk.yellow("  [WARN] JWT_SECRET is missing or shorter than 16 characters."));
      warningsFound++;
    } else {
      console.log(chalk.green("  [PASS] JWT_SECRET is configured."));
    }
  }
  console.log("");

  console.log(chalk.bold("[2/5] Filesystem Hierarchy Standard & Static Asset Structure:"));
  if (isLinux) {
    if (projectDir.startsWith("/home/")) {
      console.log(chalk.yellow("  [WARN] Project is deployed inside '/home/user/'."));
      console.log(chalk.gray("         Recommended FHS production standard is '/var/www/<project>' or '/srv/<project>'"));
      console.log(chalk.gray("         to prevent path traversal restrictions for unprivileged containers (nginx UID 101)."));
      warningsFound++;
    } else {
      console.log(chalk.green("  [PASS] Project directory follows recommended FHS location."));
    }
  }

  const publicDir = path.resolve(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    console.log(chalk.yellow("  [WARN] 'public/' directory is missing. Static assets will not be served by Nginx."));
    warningsFound++;
  } else {
    console.log(chalk.green("  [PASS] 'public/' directory exists."));
    const sampleAsset = findSampleStaticAsset();
    if (sampleAsset) {
      console.log(chalk.green(`  [PASS] Detected sample static asset: 'public/${sampleAsset}'`));
    } else {
      console.log(chalk.yellow("  [WARN] No static files found inside 'public/'."));
      warningsFound++;
    }
  }

  const appDir = path.resolve(process.cwd(), "app");
  if (!fs.existsSync(appDir)) {
    console.log(chalk.red("  [FAIL] 'app/' directory is missing."));
    issuesFound++;
  } else {
    console.log(chalk.green("  [PASS] 'app/' directory exists."));
  }
  console.log("");

  console.log(chalk.bold("[3/5] Port Availability & Binding:"));
  const portFree = await isPortAvailable(port);
  if (portFree) {
    console.log(chalk.green(`  [INFO] Port ${port} is currently free and available for binding.`));
  } else {
    console.log(chalk.cyan(`  [INFO] Port ${port} is currently in use (application server or container is active).`));
  }
  console.log("");

  console.log(chalk.bold("[4/5] Live HTTP Smoke Test (Health & Static Delivery):"));
  const sampleAsset = findSampleStaticAsset();
  const testUrls = [
    { name: "API Health Endpoint", url: `${appUrl}/api/health`, isApi: true },
  ];
  if (sampleAsset) {
    testUrls.push({
      name: `Static Asset (/${sampleAsset})`,
      url: `${appUrl}/${sampleAsset}`,
      isApi: false,
    });
  }

  let serverReachable = false;

  for (const item of testUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(item.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      serverReachable = true;

      if (res.status === 200) {
        console.log(chalk.green(`  [PASS] ${item.name} returned HTTP 200 OK.`));
      } else if (res.status === 403) {
        console.log(chalk.red(`  [FAIL] ${item.name} returned HTTP 403 Forbidden.`));
        console.log(chalk.yellow("         Cause: Unprivileged Nginx worker (UID 101) lacks path traversal (+x) or read (+r) permissions."));
        console.log(chalk.yellow("         Remediation: Run the following commands on your host:"));
        console.log(chalk.white(`           chmod 755 ${projectDir}`));
        console.log(chalk.white("           find public -type d -exec chmod 755 {} +"));
        console.log(chalk.white("           find public -type f -exec chmod 644 {} +"));
        issuesFound++;
      } else if (res.status === 404) {
        console.log(chalk.red(`  [FAIL] ${item.name} returned HTTP 404 Not Found.`));
        console.log(chalk.yellow("         Cause: File not found or Docker volume mount inode desynchronization."));
        console.log(chalk.yellow("         Remediation: Recreate container volume mounts:"));
        console.log(chalk.white("           npx blue-bird docker stop && npx blue-bird docker start prod"));
        issuesFound++;
      } else {
        console.log(chalk.yellow(`  [WARN] ${item.name} returned HTTP ${res.status}.`));
        warningsFound++;
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log(chalk.yellow(`  [WARN] Request to ${item.name} (${item.url}) timed out after 3s.`));
      } else {
        console.log(chalk.gray(`  [INFO] Cannot connect to ${item.name} at ${item.url} (${err.code || err.message}).`));
      }
    }
  }

  if (!serverReachable) {
    console.log(chalk.gray("  [INFO] Application server is not running locally. Start it with:"));
    console.log(chalk.gray("         Development: npm run dev"));
    console.log(chalk.gray("         Production:  npx blue-bird docker start prod"));
  }
  console.log("");

  console.log(chalk.bold("[5/5] Database & Cache Architecture:"));
  const rawDbType = (env.DB_TYPE || "").toLowerCase().trim();
  let dbType = "sqlite";
  if (["sqlite", "sqlite3", "sql", "better-sqlite3", "better-sqlite", "lite"].includes(rawDbType)) {
    dbType = "sqlite";
  } else if (["postgres", "postgresql", "pg", "psql", "pgsql", "postgre", "postgr", "psgr"].includes(rawDbType)) {
    dbType = "postgres";
  } else if (["mysql", "mariadb", "maria", "my"].includes(rawDbType)) {
    dbType = "mysql";
  } else if (["none", "no", "false", "null", "0"].includes(rawDbType)) {
    dbType = "none";
  }
  console.log(chalk.green(`  [INFO] Database Type: ${dbType.toUpperCase()}`));
  const cacheMode = (env.CACHE_MODE || "memory").toLowerCase();
  console.log(chalk.green(`  [INFO] Cache Mode:    ${cacheMode.toUpperCase()}`));
  console.log("");

  console.log(chalk.bold.cyan("============================================================="));
  if (issuesFound === 0 && warningsFound === 0) {
    console.log(chalk.bold.green(" Diagnostic Summary: All checks passed with zero issues!"));
  } else if (issuesFound === 0) {
    console.log(chalk.bold.yellow(` Diagnostic Summary: System is operational with ${warningsFound} warning(s).`));
  } else {
    console.log(chalk.bold.red(` Diagnostic Summary: Found ${issuesFound} error(s) and ${warningsFound} warning(s).`));
  }
  console.log(chalk.bold.cyan("============================================================="));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("doctor.js") || process.argv[2] === "doctor") {
  runDoctor();
}
