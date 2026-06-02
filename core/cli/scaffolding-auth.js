import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Scaffolds an authentication system with Raw DB Queries, JWT, and API routes.
 */
class ScaffoldingAuth {
    constructor() {
        this.appDir = process.cwd();
        this.backendDir = path.join(this.appDir, "backend");
        this.frontendDir = path.join(this.appDir, "frontend");
    }

    async run() {
        console.log(chalk.cyan("Starting Auth Scaffolding initialization..."));

        try {
            this.setupDatabaseAndServices();
            this.createBackendRoutes();
            this.modifyEntryFiles();

            console.log(chalk.blue("\nAuth Scaffolding completed successfully!"));
            console.log(chalk.white("You can use the native database connection provided in backend/databases/connection.js"));
            console.log(chalk.white("OR we recommend using an ORM like Prisma. If you migrate to an ORM, adapt backend/databases/services/auth.service.js to use it."));
            console.log(chalk.yellow("Running setup script to execute database migrations..."));
            try {
                execSync('node  --env-file=.env backend/databases/setup_tables.js', { stdio: "inherit", cwd: this.appDir });
                console.log(chalk.green("✓ Database migrations success. Users and LoginHistory tables created."));
            } catch (e) {
                console.log(chalk.red("Failed to execute setup_tables.js. You may need to run it manually."));
                console.log(e);
            }
        } catch (error) {
            console.error(chalk.red("Error during Scaffolding Auth initialization:"), error.message);
        }
    }

    setupDatabaseAndServices() {
        const dbDir = path.join(this.backendDir, "databases");
        const servicesDir = path.join(dbDir, "services");
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        if (!fs.existsSync(servicesDir)) fs.mkdirSync(servicesDir, { recursive: true });

        const envPath = path.join(this.appDir, ".env");
        let dbUrl = "";
        let dialect = "sqlite";
        let pkg = "sqlite3";

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, "utf-8");
            const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
            if (dbUrlMatch) {
                dbUrl = dbUrlMatch[1];
                if (dbUrl.startsWith("mysql")) { dialect = "mysql"; pkg = "mysql2"; }
                if (dbUrl.startsWith("postgres")) { dialect = "postgres"; pkg = "pg"; }
            }
        }

        console.log(chalk.yellow(`Detected database dialect: ${dialect}. Installing ${pkg}...`));
        try {
            execSync(`npm install ${pkg}`, { stdio: "inherit", cwd: this.appDir });
            execSync(`npm install bcrypt`, { stdio: "inherit", cwd: this.appDir });
        } catch (e) {
            console.log(chalk.red(`Failed to install ${pkg}. Please install it manually.`));
        }

        this.generateConnectionFile(dbDir, dialect);
        this.generateSetupTables(dbDir, dialect);
        this.generateAuthService(servicesDir, dialect);


        console.log(chalk.green("✓ Database connection, setup script, and services generated."));


    }

    generateConnectionFile(dbDir, dialect) {
        let content = `import Config from "@seip/blue-bird/core/config.js";\n\nconst props = Config.props();\nconst dbUrl = process.env.DATABASE_URL || "file:./dev.db";\n`;

        if (dialect === "sqlite") {
            content += `import sqlite3 from 'sqlite3';\n
class DatabaseConnection {
    constructor() {
        this.db = null;
        this.dbPath = dbUrl.replace("file:", "");
    }
    
    async connect(retries = 5, delay = 2000) {
        if (this.db) return this.db;
        for (let i = 0; i < retries; i++) {
            try {
                return await new Promise((resolve, reject) => {
                    this.db = new sqlite3.Database(this.dbPath, (err) => {
                        if (err) reject(err);
                        else resolve(this.db);
                    });
                });
            } catch (err) {
                if (props.debug) console.log(\`[DEBUG] Database connection failed. Retrying in \${delay / 1000}s... (\${i + 1}/\${retries})\`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
        const errorMsg = "Database connection failed after maximum retries.";
        if (props.debug) console.error("[ERROR]", errorMsg);
        throw new Error(errorMsg);
    }

    async query(sql, params = []) {
        await this.connect();
        return new Promise((resolve, reject) => {
            if (sql.trim().toLowerCase().startsWith('select')) {
                this.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            } else {
                this.db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, changes: this.changes });
                });
            }
        });
    }

    async queryOne(sql, params = []) {
        await this.connect();
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
}
`;
        } else if (dialect === "mysql") {
            content += `import mysql from 'mysql2/promise';\n
class DatabaseConnection {
    constructor() {
        this.pool = null;
    }
    
    async connect(retries = 5, delay = 2000) {
        if (this.pool) return this.pool;
        for (let i = 0; i < retries; i++) {
            try {
                this.pool = mysql.createPool(dbUrl);
                await this.pool.query('SELECT 1');
                return this.pool;
            } catch (err) {
                if (props.debug) console.log(\`[DEBUG] Database connection failed. Retrying in \${delay / 1000}s... (\${i + 1}/\${retries})\`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
        const errorMsg = "Database connection failed after maximum retries.";
        if (props.debug) console.error("[ERROR]", errorMsg);
        throw new Error(errorMsg);
    }

    async query(sql, params = []) {
        await this.connect();
        const [rows] = await this.pool.query(sql, params);
        if (sql.trim().toLowerCase().startsWith('insert') || sql.trim().toLowerCase().startsWith('update') || sql.trim().toLowerCase().startsWith('delete')) {
            return { changes: rows.affectedRows, id: rows.insertId };
        }
        return rows;
    }

    async queryOne(sql, params = []) {
        await this.connect();
        const [rows] = await this.pool.query(sql, params);
        return rows.length ? rows[0] : null;
    }
}
`;
        } else if (dialect === "postgres") {
            content += `import pkg from 'pg';\nconst { Pool } = pkg;\n
class DatabaseConnection {
    constructor() {
        this.pool = null;
    }
    
    async connect(retries = 5, delay = 2000) {
        if (this.pool) return this.pool;
        for (let i = 0; i < retries; i++) {
            try {
                this.pool = new Pool({ connectionString: dbUrl });
                await this.pool.query('SELECT 1');
                return this.pool;
            } catch (err) {
                if (props.debug) console.log(\`[DEBUG] Database connection failed. Retrying in \${delay / 1000}s... (\${i + 1}/\${retries})\`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
        const errorMsg = "Database connection failed after maximum retries.";
        if (props.debug) console.error("[ERROR]", errorMsg);
        throw new Error(errorMsg);
    }

    async query(sql, params = []) {
        await this.connect();
        const res = await this.pool.query(sql, params);
        if (sql.trim().toLowerCase().startsWith('insert') || sql.trim().toLowerCase().startsWith('update') || sql.trim().toLowerCase().startsWith('delete')) {
            return { changes: res.rowCount };
        }
        return res.rows;
    }

    async queryOne(sql, params = []) {
        await this.connect();
        const res = await this.pool.query(sql, params);
        return res.rows.length ? res.rows[0] : null;
    }
}
`;
        }

        content += `\nconst db = new DatabaseConnection();\nexport default db;\n`;
        fs.writeFileSync(path.join(dbDir, "connection.js"), content, "utf-8");
    }

    generateSetupTables(dbDir, dialect) {
        let content = `import db from './connection.js';\n\n`;

        if (dialect === "mysql" || dialect === "postgres") {
            content += `const dbUrl = process.env.DATABASE_URL;\n\nasync function createDatabaseIfNotExists() {\n`;
            if (dialect === "mysql") {
                content += `    try {
        const mysql = await import('mysql2/promise');
        const createConnection = mysql.createConnection || (mysql.default && mysql.default.createConnection);
        const url = new URL(dbUrl);
        const dbName = url.pathname.replace('/', '');
        const connectionParams = {
            host: url.hostname,
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            port: url.port ? Number(url.port) : 3306
        };
        const connection = await createConnection(connectionParams);
        await connection.query(\`CREATE DATABASE IF NOT EXISTS \\\`\${dbName}\\\`;\`);
        await connection.end();
        console.log(\`Database '\${dbName}' checked/created successfully.\`);
    } catch (err) {
        console.error("Failed to create database automatically:", err.message);
    }
`;
            } else if (dialect === "postgres") {
                content += `    try {
        const pkg = await import('pg');
        const Client = pkg.Client || (pkg.default && pkg.default.Client);
        const url = new URL(dbUrl);
        const dbName = url.pathname.replace('/', '');
        const connectionString = \`postgres://\${url.username}:\${url.password}@\${url.hostname}:\${url.port ? url.port : 5432}/postgres\`;
        const client = new Client({ connectionString });
        await client.connect();
        
        const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (res.rowCount === 0) {
            await client.query(\`CREATE DATABASE "\${dbName}"\`);
            console.log(\`Database '\${dbName}' created successfully.\`);
        } else {
            console.log(\`Database '\${dbName}' already exists.\`);
        }
        await client.end();
    } catch (err) {
        console.error("Failed to create database automatically:", err.message);
    }
`;
            }
            content += `}\n\n`;
        }

        content += `async function setup() {\n`;

        if (dialect === "mysql" || dialect === "postgres") {
            content += `    await createDatabaseIfNotExists();\n`;
        }

        let usersTable = "";
        let historyTable = "";

        if (dialect === "sqlite") {
            usersTable = `
            await db.query(\`
                CREATE TABLE IF NOT EXISTS User (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_public TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    password TEXT NOT NULL,
                    password_token TEXT,
                    remember_token TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            \`);`;

            historyTable = `
            await db.query(\`
                CREATE TABLE IF NOT EXISTS LoginHistory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    success INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            \`);`;
        } else if (dialect === "mysql") {
            usersTable = `
            await db.query(\`
                CREATE TABLE IF NOT EXISTS User (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    id_public VARCHAR(36) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    password VARCHAR(255) NOT NULL,
                    password_token VARCHAR(255),
                    remember_token VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            \`);`;

            historyTable = `
             await db.query(\`
                CREATE TABLE IF NOT EXISTS LoginHistory (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    ip_address VARCHAR(45) NOT NULL,
                    success BOOLEAN NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            \`);`;
        } else if (dialect === "postgres") {
            usersTable = `
            await db.query(\`
                CREATE TABLE IF NOT EXISTS "User" (
                    id SERIAL PRIMARY KEY,
                    id_public UUID UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    password VARCHAR(255) NOT NULL,
                    password_token VARCHAR(255),
                    remember_token VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            \`);`;

            historyTable = `
             await db.query(\`
                CREATE TABLE IF NOT EXISTS "LoginHistory" (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    ip_address VARCHAR(45) NOT NULL,
                    success BOOLEAN NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            \`);`;
        }

        content += `${usersTable}\n${historyTable}\n    console.log("Tables created successfully.");\n    process.exit(0);\n}\n\nsetup().catch(err => {\n    console.error(err);\n    process.exit(1);\n});\n`;
        fs.writeFileSync(path.join(dbDir, "setup_tables.js"), content, "utf-8");
    }

    generateAuthService(servicesDir, dialect) {
        let content = `import db from '../connection.js';
import crypto from 'node:crypto';
import { hash } from 'bcrypt';

export default class AuthService {
    static async checkRateLimit(ip, email) {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
`;

        if (dialect === "postgres") {
            content += `        const sql = \`SELECT COUNT(*) as count FROM "LoginHistory" WHERE ip_address = $1 AND email = $2 AND success = false AND created_at >= $3\`;\n        const result = await db.queryOne(sql, [ip, email, tenMinsAgo]);\n`;
        } else {
            content += `        const sql = \`SELECT COUNT(*) as count FROM LoginHistory WHERE ip_address = ? AND email = ? AND success = 0 AND created_at >= ?\`;\n        const result = await db.queryOne(sql, [ip, email, tenMinsAgo]);\n`;
        }

        content += `        const attempts = result ? parseInt(result.count || result.COUNT) : 0;

        if (attempts >= 15) throw new Error("Blocked for 10 minutes.");
        if (attempts >= 10) throw new Error("Blocked for 5 minutes.");
        if (attempts >= 8) throw new Error("Blocked for 3 minutes.");
        if (attempts >= 5) throw new Error("Blocked for 1 minute.");
        return true;
    }

    static async findUserByEmail(email, isActive = 1) {
`;
        if (dialect === "postgres") {
            content += `        return await db.queryOne('SELECT * FROM "User" WHERE is_active = $1 AND email = $2', [isActive, email]);\n`;
        } else {
            content += `        return await db.queryOne('SELECT * FROM User WHERE is_active = ? AND email = ?', [isActive, email]);\n`;
        }

        content += `    }

    static async createLoginHistory(email, ip, success) {
`;
        if (dialect === "postgres") {
            content += `        await db.query('INSERT INTO "LoginHistory" (email, ip_address, success) VALUES ($1, $2, $3)', [email, ip, success]);\n`;
        } else {
            content += `        const successVal = success ? 1 : 0;\n        await db.query('INSERT INTO LoginHistory (email, ip_address, success) VALUES (?, ?, ?)', [email, ip, successVal]);\n`;
        }

        content += `    }

    static async createUser(name, email, password) {
        const id_public = crypto.randomUUID();
        const passwordHash= await hash(password, 10);
`;

        if (dialect === "postgres") {
            content += `        await db.query('INSERT INTO "User" (id_public, name, email, password, is_active) VALUES ($1, $2, $3, $4, $5)', [id_public, name, email, passwordHash, true]);\n`;
        } else {
            content += `        await db.query('INSERT INTO User (id_public, name, email, password, is_active) VALUES (?, ?, ?, ?, ?)', [id_public, name, email, passwordHash, true]);\n`;
        }

        content += `        return { id_public, name, email };
    }

    static async setPasswordToken(userId, token) {
`;
        if (dialect === "postgres") {
            content += `        await db.query('UPDATE "User" SET password_token = $1 WHERE id = $2', [token, userId]);\n`;
        } else {
            content += `        await db.query('UPDATE User SET password_token = ? WHERE id = ?', [token, userId]);\n`;
        }

        content += `    }

    static async findUserByPasswordToken(token, isActive = 1) {
`;
        if (dialect === "postgres") {
            content += `        return await db.queryOne('SELECT * FROM "User" WHERE password_token = $1 AND is_active = $2', [token, isActive]);\n`;
        } else {
            content += `        return await db.queryOne('SELECT * FROM User WHERE password_token = ? AND is_active = ?', [token, isActive]);\n`;
        }

        content += `    }

    static async updatePassword(userId, newPassword) {
        const newPasswordHash = await hash(newPassword, 10);
`;
        if (dialect === "postgres") {
            content += `        return await db.query('UPDATE "User" SET password = $1, password_token = NULL WHERE id = $2', [newPasswordHash, userId]);\n`;
        } else {
            content += `        return await db.query('UPDATE User SET password = ?, password_token = NULL WHERE id = ?', [newPasswordHash, userId]);\n`;
        }

        content += `    }
}
`;
        fs.writeFileSync(path.join(servicesDir, "auth.service.js"), content, "utf-8");
    }

    createBackendRoutes() {
        const routesDir = path.join(this.backendDir, "routes");
        if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });

        const authFile = path.join(routesDir, "auth.js");
        const authenticatedFile = path.join(routesDir, "authenticated.js");

        const authContent = `import Router from "@seip/blue-bird/core/router.js";
import Validator from "@seip/blue-bird/core/validate.js";
import Auth from "@seip/blue-bird/core/auth.js";
import Config from "@seip/blue-bird/core/config.js";
import crypto from "node:crypto";
import AuthService from "../databases/services/auth.service.js";
import { compare } from "bcrypt";

const routerAuth = new Router("/auth");
const props = Config.props();

routerAuth.post("/login", new Validator({ email: { required: true, email: true }, password: { required: true } }).middleware(), async (req, res) => {
    try {
        const { email, password } = req.body;
        const ip = req.ip;

        await AuthService.checkRateLimit(ip, email);

        const user = await AuthService.findUserByEmail(email, 1);

        if (!user) {
            await AuthService.createLoginHistory(email, ip, false);
            const deletedAccount = await AuthService.findUserByEmail(email, 0);
            if (deletedAccount) return res.status(401).json({ message: "Your account is deleted", deleted_account_error: true });
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const passwordCompare = await compare(password, user.password);

        if (!passwordCompare) {
            await AuthService.createLoginHistory(email, ip, false);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        await AuthService.createLoginHistory(email, ip, true);
        await AuthService.setPasswordToken(user.id, null);
        const token = Auth.generateToken({ id: user.id_public, email: user.email });
        const secure = props.debug == false ? true : false;
        res.cookie("token", token, { httpOnly: true, secure: secure, sameSite: "strict", maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ user: { id: user.id_public, name: user.name, email: user.email } });
    } catch (error) {
        console.log(error)
        return res.status(429).json({ message: props.debug ? error.message : "Error, something went wrong" });
    }
});

routerAuth.post("/register", new Validator({ password_confirmation: { required: true, min: 6 }, name: { required: true }, email: { required: true, email: true }, password: { required: true, min: 6 } }).middleware(), async (req, res) => {
    try {
        const { name, email, password, password_confirmation } = req.body;
        if (password !== password_confirmation) return res.status(400).json({ message: "Error, check your password confirmation", password_confirmation_error: true });
        const exists = await AuthService.findUserByEmail(email);
        if (exists) return res.status(400).json({ message: "Error, check your email entered", error_email_register: true });
        const deletedAccount = await AuthService.findUserByEmail(email, 0);
        if (deletedAccount) return res.status(400).json({ message: "Error, your account is deleted", deleted_account_error: true });
        const user = await AuthService.createUser(name, email, password);
        const secure = props.debug == false ? true : false;
        const token = Auth.generateToken({ id: user.id_public, email: user.email });
        res.cookie("token", token, { httpOnly: true, secure: secure, sameSite: "strict", maxAge: 24 * 60 * 60 * 1000 });
        return res.json({ message: "Registered", user: { id: user.id_public, email: user.email } });
    } catch (err) {
        ;
        return res.status(500).json({ message: props.debug ? err.message : "Error, something went wrong" });
    }
});

routerAuth.post("/forgot-password", new Validator({ email: { required: true, email: true } }).middleware(), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await AuthService.findUserByEmail(email, 1);

        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            await AuthService.setPasswordToken(user.id, token);

            if (props.debug) {
                console.log("\\n[DEBUG] Email functionality for Forgot Password should be handled here.");
                console.log("[DEBUG] Debug mode active. Password reset link: " + props.host + ":" + props.port + "/reset-password?token=" + token + "\\n");
            }
        }

        return res.json({ message: "If the email is valid, a password reset link has been sent." });
    } catch (err) {
        return res.status(500).json({ message: props.debug ? err.message : "Error, something went wrong" });
    }
});

routerAuth.post("/reset-password/validate", async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ title: "Reset Password", queryToken: false })
        }
        const user = await AuthService.findUserByPasswordToken(token, 1);
        if (!user) {
            return res.status(400).json({ title: "Reset Password", queryToken: false, u: false })
        }
        return res.json({ title: "Reset Password", queryToken: true })
    } catch (err) {
        return res.status(500).json({ title: "Reset Password", queryToken: false })
    }
});

routerAuth.post("/reset-password", new Validator({ password_confirmation: { required: true, min: 6 }, token: { required: true }, password: { required: true, min: 6 } }).middleware(), async (req, res) => {
    try {
        const { token, password, password_confirmation } = req.body;
        const user = await AuthService.findUserByPasswordToken(token, 1);
        if (password !== password_confirmation) return res.status(400).json({ message: "Error, check your password confirmation", password_confirmation: true });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token.", token: true });
        }

        const updatePassword = await AuthService.updatePassword(user.id, password);

        if (!updatePassword) {
            return res.status(400).json({ message: "Error, something went wrong", updatePassword: true });
        }
        await AuthService.setPasswordToken(user.id, null);

        return res.json({ message: "Password has been reset successfully." });
    } catch (err) {
        return res.status(500).json({ message: props.debug ? err.message : "Error, something went wrong" });
    }
});

routerAuth.get("/validate", Auth.protect(), (req, res) => {
    return res.json({ user: req.user });
});

routerAuth.get("/logout", async (req, res) => {
    try {
        res.clearCookie("token");
        return res.json({ message: "Logged out" });
    } catch (err) {
        return res.status(500).json({ message: props.debug ? err.message : "Error, something went wrong" });
    }
});

routerAuth.post("/logout", async (req, res) => {
    try {
        res.clearCookie("token");
        return res.json({ message: "Logged out" });
    } catch (err) {
        return res.status(500).json({ message: props.debug ? err.message : "Error, something went wrong" });
    }
});

export default routerAuth;
`;
        fs.writeFileSync(authFile, authContent, "utf-8");

        const authenticatedContent = `import Router from "@seip/blue-bird/core/router.js";
import Template from "@seip/blue-bird/core/template.js";
import Auth from "@seip/blue-bird/core/auth.js";

const routerAuthenticated = new Router();

routerAuthenticated.get("/dashboard", Auth.protect({ redirect: "/login" }), (req, res) => {
    return Template.render(res, "index", { metaTags: { titleMeta: "Dashboard" } });
});

export default routerAuthenticated;
`;
        fs.writeFileSync(authenticatedFile, authenticatedContent, "utf-8");
        console.log(chalk.green("✓ Backend auth and authenticated routes generated."));
    }

    /**
     * Modifies the backend entry file to include auth routes.
     */
    modifyEntryFiles() {
        const backendIndexFile = path.join(this.backendDir, "index.js");
        if (fs.existsSync(backendIndexFile)) {
            let backendIndex = fs.readFileSync(backendIndexFile, "utf-8");
            if (!backendIndex.includes("routerAuth")) {
                backendIndex = backendIndex.replace(
                    /import\s+routerFrontendExample\s+from\s+["']\.\/routes\/frontend\.js["'];?/,
                    'import routerFrontendExample from "./routes/frontend.js";\nimport routerAuth from "./routes/auth.js";\nimport routerAuthenticated from "./routes/authenticated.js";'
                );
                backendIndex = backendIndex.replace(
                    /routes:\s*\[([^\]]+)\]/,
                    (match, p1) => {
                        if (p1.includes('routerFrontendExample') && !p1.includes('routerAuth')) {
                            return `routes: [${p1.replace('routerFrontendExample', 'routerAuth, routerAuthenticated, routerFrontendExample')}]`;
                        }
                        return match;
                    }
                );
                fs.writeFileSync(backendIndexFile, backendIndex, "utf-8");
                console.log(chalk.green("✓ backend/index.js updated to include new routes."));
            }
        }
    }
}

const initializer = new ScaffoldingAuth();
export default initializer;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    initializer.run();
}

