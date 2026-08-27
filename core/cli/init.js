#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

/**
 * Initializes a new Blue Bird project by copying the base structure.
 */
class ProjectInit {
  constructor() {
    this.appDir = process.cwd();
    this.sourceDir = path.resolve(import.meta.dirname, "../../");
  }

  /**
   * Runs the project initialization process.
   */
  async run() {
    console.log(chalk.cyan("Starting Blue Bird project initialization..."));

    const rl = readline.createInterface({ input, output });

    let title = "Blue-Bird";
    let port = 3000;
    let appUrl = "http://localhost:3000";
    let dbType = "sqlite";
    let dbName = "blue_bird";
    let dbFile = "database/blue_bird.db";
    let dbUser = "root";
    let dbPassword = "root";
    let dbPort = 3306;

    try {
      const ask = async (query, defaultValue) => {
        const formattedQuery =
          defaultValue !== undefined
            ? `${query} [${defaultValue}]: `
            : `${query}: `;
        const answer = await rl.question(formattedQuery);
        return answer.trim() || defaultValue;
      };

      title = await ask("Project Title", title);
      const portInput = await ask("Server Port", port);
      port = parseInt(portInput, 10);
      if (Number.isNaN(port)) {
        port = 3000;
      }

      const defaultAppUrl = `http://localhost:${port}`;
      appUrl = await ask("Application URL", defaultAppUrl);

      const dbTypeAns = await ask(
        "Which database do you want to configure? (sqlite / mysql / postgres / none)",
        "sqlite",
      );
      const cleanDbTypeAns = dbTypeAns.toLowerCase().trim();
      if (
        cleanDbTypeAns === "sqlite" ||
        cleanDbTypeAns === "sql" ||
        cleanDbTypeAns === "sqlite3"
      ) {
        dbType = "sqlite";
      } else if (
        cleanDbTypeAns === "postgres" ||
        cleanDbTypeAns === "postgresql" ||
        cleanDbTypeAns === "pg" ||
        cleanDbTypeAns === "postgr"
      ) {
        dbType = "postgres";
      } else if (cleanDbTypeAns === "mysql") {
        dbType = "mysql";
      } else {
        dbType = "none";
      }

      if (dbType === "sqlite") {
        dbName = await ask("Database Name", dbName);
        const defaultDbFile = `database/${dbName}.db`;
        dbFile = await ask("Database File Path", defaultDbFile);
        const dbDir = path.dirname(path.join(this.appDir, dbFile));
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }
      } else if (dbType !== "none") {
        dbName = await ask("Database Name", dbName);
        dbUser = await ask(
          "Database User",
          dbType === "postgres" ? "postgres" : "root",
        );
        dbPassword = await ask("Database Password", dbPassword);
        const defaultDbPort = dbType === "postgres" ? 5432 : 3306;
        const dbPortInput = await ask("Database Port", defaultDbPort);
        dbPort = parseInt(dbPortInput, 10);
        if (Number.isNaN(dbPort)) {
          dbPort = defaultDbPort;
        }
      }
    } catch (error) {
      console.error(
        chalk.red("[ERROR] Error reading configuration input:"),
        error.message,
      );
      rl.close();
      return;
    } finally {
      rl.close();
    }

    const itemsToCopy = [
      "backend",
      "frontend",
      "docker",
      ".env_example",
      "AGENTS.md",
      "jsconfig.json",
      ".vscode",
    ];

    try {
      itemsToCopy.forEach((item) => {
        const src = path.join(this.sourceDir, item);
        const dest = path.join(this.appDir, item);

        if (fs.existsSync(src)) {
          if (!fs.existsSync(dest)) {
            this.copyRecursive(src, dest);
            console.log(chalk.green(`[OK] Copied ${item} to root.`));
          } else {
            console.log(
              chalk.yellow(`[SKIP] ${item} already exists, skipping.`),
            );
          }
        } else {
          console.warn(
            chalk.red(`[ERROR] Source ${item} not found in ${this.sourceDir}`),
          );
        }
      });

      const gitignoreContent = `node_modules\nlogs\n.env\npackage-lock.json\n*.db\n*.sqlite\n*.sqlite-wal\n*.sqlite-shm\n*.db-wal\n*.db-shm\ntest/\n\nbackups/*.sql\nbackups/*.db\n`;
      const gitignoreDest = path.join(this.appDir, ".gitignore");
      const gitignoreSrc = path.join(this.sourceDir, ".gitignore");

      if (!fs.existsSync(gitignoreDest)) {
        if (fs.existsSync(gitignoreSrc)) {
          fs.copyFileSync(gitignoreSrc, gitignoreDest);
          console.log(chalk.green("[OK] Copied .gitignore to root."));
        } else {
          fs.writeFileSync(gitignoreDest, gitignoreContent, "utf-8");
          console.log(chalk.green("[OK] Created .gitignore file."));
        }
      } else {
        console.log(
          chalk.yellow("[SKIP] .gitignore already exists, skipping."),
        );
      }

      const composeTemplateName =
        dbType === "postgres"
          ? "docker-compose.postgres.yml"
          : dbType === "mysql"
            ? "docker-compose.mysql.yml"
            : dbType === "sqlite"
              ? "docker-compose.sqlite.yml"
              : "docker-compose.none.yml";
      const composeSrc = path.join(
        this.sourceDir,
        "docker",
        composeTemplateName,
      );
      const composeDest = path.join(this.appDir, "docker-compose.yml");
      if (fs.existsSync(composeSrc)) {
        if (!fs.existsSync(composeDest)) {
          fs.copyFileSync(composeSrc, composeDest);
          console.log(
            chalk.green(`[OK] Created docker-compose.yml (${dbType} mode).`),
          );
        } else {
          console.log(
            chalk.yellow(`[SKIP] docker-compose.yml already exists, skipping.`),
          );
        }
      } else {
        const fallbackSrc = path.join(this.sourceDir, "docker-compose.yml");
        if (fs.existsSync(fallbackSrc) && !fs.existsSync(composeDest)) {
          fs.copyFileSync(fallbackSrc, composeDest);
          console.log(chalk.green(`[OK] Created docker-compose.yml.`));
        }
      }

      const envPath = path.join(this.appDir, ".env");
      const envExamplePath = path.join(this.appDir, ".env_example");

      if (fs.existsSync(envExamplePath)) {
        let envContent = fs.readFileSync(envExamplePath, "utf-8");

        const jwtSecret = crypto.randomBytes(32).toString("hex");
        const composeProjectName =
          title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9_-]/g, "") || "blue-bird";

        const updates = {
          COMPOSE_PROJECT_NAME: composeProjectName,
          TITLE: title,
          PORT: port,
          APP_URL: appUrl,
          JWT_SECRET: jwtSecret,
          DB_TYPE: dbType,
        };

        if (dbType === "sqlite") {
          updates.DB_TYPE = "sqlite";
          updates.DB_FILE = dbFile;
          updates.DATABASE_URL = `sqlite:${dbFile}`;
        } else if (dbType === "mysql") {
          updates.DB_TYPE = "mysql";
          updates.DB_NAME = dbName;
          updates.DB_USER = dbUser;
          updates.DB_PASSWORD = dbPassword;
          updates.DB_PORT = dbPort;
          updates.DATABASE_URL = `mysql://${dbUser}:${dbPassword}@localhost:${dbPort}/${dbName}`;
        } else if (dbType === "postgres") {
          updates.DB_TYPE = "postgres";
          updates.DB_NAME = dbName;
          updates.DB_USER = dbUser;
          updates.DB_PASSWORD = dbPassword;
          updates.DB_PORT = dbPort;
          updates.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@localhost:${dbPort}/${dbName}?schema=public`;
        }

        const lines = envContent.split(/\r?\n/);
        let foundComposeProjectName = false;
        const updatedLines = lines.map((line) => {
          const match = line.match(/^([A-Z_]+)=(.+)/);
          if (match) {
            const key = match[1];
            if (key === "COMPOSE_PROJECT_NAME") {
              foundComposeProjectName = true;
            }
            if (updates[key] !== undefined) {
              const value = updates[key];
              if (typeof value === "string" && !value.startsWith('"')) {
                return `${key}="${value}"`;
              }
              return `${key}=${value}`;
            }
          }
          return line;
        });

        if (!foundComposeProjectName && updates.COMPOSE_PROJECT_NAME) {
          const titleIdx = updatedLines.findIndex((l) => l.startsWith("TITLE="));
          if (titleIdx !== -1) {
            updatedLines.splice(
              titleIdx,
              0,
              `COMPOSE_PROJECT_NAME="${updates.COMPOSE_PROJECT_NAME}"`,
            );
          } else {
            updatedLines.push(
              `COMPOSE_PROJECT_NAME="${updates.COMPOSE_PROJECT_NAME}"`,
            );
          }
        }
        envContent = updatedLines.join("\n");

        fs.writeFileSync(envPath, envContent, "utf-8");
        console.log(chalk.green("[OK] Created and configured .env file."));
      }

      this.updatePackageJson();

      if (dbType !== "none") {
        console.log(
          chalk.cyan(`[INFO] Installing ${dbType} and redis packages...`),
        );
        try {
          let packagesToInstall = ["redis"];
          if (dbType === "sqlite") {
            packagesToInstall.push("better-sqlite3");
          } else if (dbType === "postgres") {
            packagesToInstall.push("pg");
          } else {
            packagesToInstall.push("mysql2");
          }
          execSync(`npm install ${packagesToInstall.join(" ")}`, {
            stdio: "inherit",
            cwd: this.appDir,
          });
          console.log(
            chalk.green(
              `[OK] Successfully installed ${packagesToInstall.join(" ")}.`,
            ),
          );
        } catch (error) {
          console.warn(
            chalk.yellow(
              "[ERROR] Automatic package installation failed. Please run 'npm install' manually.",
            ),
          );
        }
      }

      console.log(chalk.blue("\nBlue Bird initialization completed!"));
      console.log(chalk.white("Next steps:"));
      console.log(chalk.bold("  npm install"));
      console.log(chalk.bold("  npm run dev"));
    } catch (error) {
      console.error(
        chalk.red("[ERROR] Error during initialization:"),
        error.message,
      );
    }
  }

  /**
   * Updates package.json with needed scripts and module type if not set.
   */
  updatePackageJson() {
    const pkgPath = path.join(this.appDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      pkg.scripts = pkg.scripts || {};

      const scriptsToAdd = {
        dev: "node --watch --env-file=.env backend/index.js",
        start: "node --env-file=.env backend/index.js",
        init: "blue-bird",
        doctor: "blue-bird doctor",
        route: "blue-bird route",
        migrate: "blue-bird migrate",
        seed: "blue-bird seed",
        "swagger-install": "blue-bird swagger-install",
        docker: "blue-bird docker",
      };

      let updated = false;
      for (const [key, value] of Object.entries(scriptsToAdd)) {
        if (!pkg.scripts[key]) {
          pkg.scripts[key] = value;
          updated = true;
        }
      }

      if (pkg.type !== "module") {
        pkg.type = "module";
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        console.log(chalk.green("[OK] Updated package.json configuration."));
      }
    }
  }

  /**
   * Copies a file or directory recursively.
   * @param {string} src - Source path.
   * @param {string} dest - Destination path.
   */
  copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();

    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach((childItemName) => {
        if (
          childItemName === "node_modules" ||
          childItemName === "dist" ||
          childItemName === ".git"
        ) {
          return;
        }
        this.copyRecursive(
          path.join(src, childItemName),
          path.join(dest, childItemName),
        );
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

/**
 * Handles adding on-demand modules and dependencies.
 * @param {string} [feature]
 */
function addCommand(feature) {
  if (!feature) {
    console.log(chalk.yellow("Usage: npx blue-bird add <feature>"));
    console.log("Available features to add:");
    console.log("  upload | multer     - Installs multer for file uploads");
    console.log("  ws | websocket      - Installs ws for WebSockets");
    console.log("  redis               - Installs redis for distributed caching and sessions");
    console.log("  sqlite              - Installs better-sqlite3 for local SQLite database");
    console.log("  mysql               - Installs mysql2 for MySQL database");
    console.log("  postgres | pg       - Installs pg for PostgreSQL database");
    console.log("  bcrypt              - Installs bcrypt for password hashing");
    console.log("  swagger             - Installs swagger-ui-express");
    return;
  }

  const cleanFeature = feature.toLowerCase().trim();
  const packageMap = {
    upload: "multer",
    multer: "multer",
    ws: "ws",
    websocket: "ws",
    websockets: "ws",
    redis: "redis",
    sqlite: "better-sqlite3",
    "better-sqlite3": "better-sqlite3",
    mysql: "mysql2",
    mysql2: "mysql2",
    postgres: "pg",
    postgresql: "pg",
    pg: "pg",
    bcrypt: "bcrypt",
    swagger: "swagger-ui-express",
  };

  const pkgName = packageMap[cleanFeature];
  if (!pkgName) {
    console.error(chalk.red(`[ERROR] Unknown feature '${feature}'.`));
    console.log("Available features: upload, ws, redis, sqlite, mysql, postgres, bcrypt, swagger");
    return;
  }

  console.log(chalk.cyan(`[INFO] Installing ${pkgName}...`));
  try {
    execSync(`npm install ${pkgName}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log(chalk.green(`[OK] Successfully installed ${pkgName}.`));
  } catch (err) {
    console.error(chalk.red(`[ERROR] Failed to install ${pkgName}:`), err.message);
  }
}

const initializer = new ProjectInit();

const args = process.argv.slice(2);
const command = args[0];

if (command === "route" || command === "make:route") {
  import("./route.js");
} else if (command === "doctor") {
  import("./doctor.js");
} else if (
  command === "nginx:conf" ||
  command === "nginx:host" ||
  command === "nginx"
) {
  import("./nginx.js");
} else if (
  command === "migrate" ||
  command === "migrate:status" ||
  command === "migrate:rollback" ||
  command === "seed" ||
  command === "make:migration" ||
  command === "make:seed"
) {
  import("./migrate.js");
} else if (command === "swagger-install") {
  import("./swagger.js");
} else if (command === "docker") {
  import("./docker.js");
} else if (command === "add") {
  addCommand(args[1]);
} else {
  initializer.run();
}


