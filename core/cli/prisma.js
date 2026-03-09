import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { fileURLToPath } from "node:url";

/**
 * Initializes Prisma with SQLite, installs dependencies, and creates the default User schema.
 */
class PrismaInit {
    constructor() {
        this.appDir = process.cwd();
        this.prismaDir = path.join(this.appDir, "prisma");
        this.schemaPath = path.join(this.prismaDir, "schema.prisma");
    }

    /**
     * Runs the initialization process.
     */
    async run() {
        console.log(chalk.cyan("Starting Prisma initialization..."));

        try {
            console.log(chalk.yellow("Installing prisma and @prisma/client..."));
            execSync("npm install prisma --save-dev && npm install @prisma/client", { stdio: "inherit", cwd: this.appDir });
            console.log(chalk.green("✓ Prisma dependencies installed."));

            if (!fs.existsSync(this.prismaDir)) {
                console.log(chalk.yellow("Initializing Prisma with SQLite..."));
                execSync("npx prisma init --datasource-provider sqlite", { stdio: "inherit", cwd: this.appDir });
                console.log(chalk.green("✓ Prisma initialized."));
            } else {
                console.log(chalk.yellow("! Prisma folder already exists. Skipping init."));
            }

            this.createOrUpdateSchema();

            console.log(chalk.yellow("Generating Prisma Client..."));
            execSync("npx prisma generate", { stdio: "inherit", cwd: this.appDir });

            console.log(chalk.blue("\nPrisma setup completed successfully!"));
            console.log(chalk.white("You can now run migrations using: ") + chalk.bold("npx prisma migrate dev --name init"));

        } catch (error) {
            console.error(chalk.red("Error during Prisma initialization:"), error.message);
        }
    }

    /**
     * Creates or updates the Prisma schema with the User model.
     */
    createOrUpdateSchema() {
        if (!fs.existsSync(this.schemaPath)) {
            console.error(chalk.red("Schema file not found. Ensure Prisma initialized correctly."));
            return;
        }

        let schemaContent = fs.readFileSync(this.schemaPath, "utf-8");

        const userModel = `
model User {
  id             String    @id @default(uuid())
  name           String
  email          String    @unique
  is_active      Boolean   @default(true)
  password       String
  password_token String?
  remember_token String?
  created_at     DateTime  @default(now())
}
`;

        if (!schemaContent.includes("model User")) {
            schemaContent += "\n" + userModel;
            fs.writeFileSync(this.schemaPath, schemaContent, "utf-8");
            console.log(chalk.green("✓ User model added to schema.prisma."));
        } else {
            console.log(chalk.yellow("! User model already exists in schema.prisma."));
        }
    }
}

const initializer = new PrismaInit();
export default initializer;

// Allow direct execution from CLI init
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    initializer.run();
}
