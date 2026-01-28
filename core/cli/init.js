#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

class ProjectInit {
    constructor() {
        this.appDir = process.cwd();
        this.sourceDir = path.resolve(import.meta.dirname, "../../");
    }

    async run() {
        console.log(chalk.cyan("Starting Blue Bird project initialization..."));

        const itemsToCopy = [
            "backend",
            "frontend",
            ".env_example"
        ];

        try {
            itemsToCopy.forEach(item => {
                const src = path.join(this.sourceDir, item);
                const dest = path.join(this.appDir, item);

                if (fs.existsSync(src)) {
                    if (!fs.existsSync(dest)) {
                        this.copyRecursive(src, dest);
                        console.log(chalk.green(`✓ Copied ${item} to root.`));
                    } else {
                        console.log(chalk.yellow(`! ${item} already exists, skipping.`));
                    }
                } else {
                    console.warn(chalk.red(`✗ Source ${item} not found in ${this.sourceDir}`));
                }
            });

            const envPath = path.join(this.appDir, ".env");
            const envExamplePath = path.join(this.appDir, ".env_example");
            if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
                fs.copyFileSync(envExamplePath, envPath);
                console.log(chalk.green("✓ Created .env from .env_example."));
            }

            this.updatePackageJson();

            console.log(chalk.blue("\nBlue Bird initialization completed!"));
            console.log(chalk.white("Next steps:"));
            console.log(chalk.bold("  npm install"));
            console.log(chalk.bold("  npm run react"));
            console.log(chalk.bold("  npm run dev"));

        } catch (error) {
            console.error(chalk.red("Error during initialization:"), error.message);
        }
    }

    updatePackageJson() {
        const pkgPath = path.join(this.appDir, "package.json");
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            pkg.scripts = pkg.scripts || {};

            const scriptsToAdd = {
                "dev": "node --watch --env-file=.env backend/index.js",
                "start": "node --env-file=.env backend/index.js",
                "react": "blue-bird react",
                "init": "blue-bird"
            };

            let updated = false;
            for (const [key, value] of Object.entries(scriptsToAdd)) {
                if (!pkg.scripts[key]) {
                    pkg.scripts[key] = value;
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
                console.log(chalk.green("✓ Updated package.json scripts."));
            }
        }
    }

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

if (command === "react") {
    // Dynamically import ReactScaffold to avoid circular dependencies if any, 
    // or just run it if it's separate.
    import("./react.js");
} else {
    initializer.run();
}

