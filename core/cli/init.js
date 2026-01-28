import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import Config from "../config.js";

const __dirname = Config.dirname();

class ProjectInit {
    constructor() {
        this.appDir = __dirname;
        // When used as a dependency, this script will be in node_modules/@seip/blue-bird/core/cli/init.js
        // But for local development/testing, it's in core/cli/init.js
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

            // Special case for .env
            const envPath = path.join(this.appDir, ".env");
            const envExamplePath = path.join(this.appDir, ".env_example");
            if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
                fs.copyFileSync(envExamplePath, envPath);
                console.log(chalk.green("✓ Created .env from .env_example."));
            }

            console.log(chalk.blue("\nBlue Bird initialization completed!"));
            console.log(chalk.white("Next steps:"));
            console.log(chalk.bold("  npm install"));
            console.log(chalk.bold("  npm run react"));
            console.log(chalk.bold("  npm run dev"));

        } catch (error) {
            console.error(chalk.red("Error during initialization:"), error.message);
        }
    }

    copyRecursive(src, dest) {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();

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
initializer.run();
