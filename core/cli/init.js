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
        let useMysql = false;
        let dbName = "blue_bird";
        let dbUser = "root";
        let dbPassword = "root";
        let dbPort = 3306;

        try {
            const ask = async (query, defaultValue) => {
                const formattedQuery = defaultValue !== undefined ? `${query} [${defaultValue}]: ` : `${query}: `;
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

            const mysqlAns = await ask("Do you want to configure MySQL? (y/n)", "n");
            useMysql = mysqlAns.toLowerCase() === "y" || mysqlAns.toLowerCase() === "yes";

            if (useMysql) {
                dbName = await ask("Database Name", dbName);
                dbUser = await ask("Database User", dbUser);
                dbPassword = await ask("Database Password", dbPassword);
                const dbPortInput = await ask("Database Port", dbPort);
                dbPort = parseInt(dbPortInput, 10);
                if (Number.isNaN(dbPort)) {
                    dbPort = 3306;
                }
            }
        } catch (error) {
            console.error(chalk.red("[ERROR] Error reading configuration input:"), error.message);
            rl.close();
            return;
        } finally {
            rl.close();
        }

        const itemsToCopy = [
            "backend",
            "frontend",
            "docker",
            "docker-compose.yml",
            ".env_example",
            "AGENTS.md",
            "index.js"
        ];

        try {
            itemsToCopy.forEach(item => {
                const src = path.join(this.sourceDir, item);
                const dest = path.join(this.appDir, item);

                if (fs.existsSync(src)) {
                    if (!fs.existsSync(dest)) {
                        this.copyRecursive(src, dest);
                        console.log(chalk.green(`[OK] Copied ${item} to root.`));
                    } else {
                        console.log(chalk.yellow(`[SKIP] ${item} already exists, skipping.`));
                    }
                } else {
                    console.warn(chalk.red(`[ERROR] Source ${item} not found in ${this.sourceDir}`));
                }
            });

            const envPath = path.join(this.appDir, ".env");
            const envExamplePath = path.join(this.appDir, ".env_example");

            if (fs.existsSync(envExamplePath)) {
                let envContent = fs.readFileSync(envExamplePath, "utf-8");

                const jwtSecret = crypto.randomBytes(32).toString("hex");

                const updates = {
                    TITLE: title,
                    PORT: port,
                    APP_URL: appUrl,
                    JWT_SECRET: jwtSecret,
                };

                if (useMysql) {
                    updates.DB_NAME = dbName;
                    updates.DB_USER = dbUser;
                    updates.DB_PASSWORD = dbPassword;
                    updates.DB_PORT = dbPort;
                    updates.DATABASE_URL = `mysql://${dbUser}:${dbPassword}@localhost:${dbPort}/${dbName}`;
                }

                const lines = envContent.split(/\r?\n/);
                const updatedLines = lines.map(line => {
                    const match = line.match(/^([A-Z_]+)=(.+)/);
                    if (match) {
                        const key = match[1];
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
                envContent = updatedLines.join("\n");

                fs.writeFileSync(envPath, envContent, "utf-8");
                console.log(chalk.green("[OK] Created and configured .env file."));
            }

            this.updatePackageJson();

            if (useMysql) {
                console.log(chalk.cyan("[INFO] Installing mysql2 and redis packages..."));
                try {
                    execSync("npm install mysql2 redis", { stdio: "inherit", cwd: this.appDir });
                    console.log(chalk.green("[OK] Successfully installed mysql2 and redis."));
                } catch (error) {
                    console.warn(chalk.yellow("[ERROR] Automatic package installation failed. Please run 'npm install mysql2 redis' manually."));
                }
            }

            console.log(chalk.blue("\nBlue Bird initialization completed!"));
            console.log(chalk.white("Next steps:"));
            console.log(chalk.bold("  npm install"));
            console.log(chalk.bold("  npm run dev"));

        } catch (error) {
            console.error(chalk.red("[ERROR] Error during initialization:"), error.message);
        }
    }

    /**
     * Updates the user's package.json with Blue Bird scripts.
     */
    updatePackageJson() {
        const pkgPath = path.join(this.appDir, "package.json");
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            pkg.scripts = pkg.scripts || {};

            const scriptsToAdd = {
                "dev": "node --watch --env-file=.env index.js",
                "dev:astro": "astro dev --root frontend",
                "dev:api": "node --watch --env-file=.env index.js",
                "start": "node --env-file=.env index.js",
                "build": "astro build --root frontend",
                "init": "blue-bird",
                "route": "blue-bird route",
                "swagger-install": "blue-bird swagger-install",
                "docker": "blue-bird docker"
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
            fs.readdirSync(src).forEach(childItemName => {
                this.copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}

const initializer = new ProjectInit();

const args = process.argv.slice(2);
const command = args[0];

if (command === "route") import("./route.js");
else if (command === "swagger-install") import("./swagger.js");
else if (command === "docker") import("./docker.js");
else initializer.run();
