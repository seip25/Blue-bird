import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Scaffolds an authentication system with Raw DB Queries, JWT, React Frontend, and i18n support.
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
            this.createFrontendComponents();
            this.modifyEntryFiles();

            console.log(chalk.blue("\nAuth Scaffolding completed successfully!"));
            console.log(chalk.white("You can use the native database connection provided in backend/databases/connection.js"));
            console.log(chalk.white("OR we recommend using an ORM like Prisma. If you migrate to an ORM, adapt backend/databases/services/auth.service.js to use it."));
            console.log(chalk.white("Update your App.jsx to use the newly created React components."));
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
        } catch (e) {
            console.log(chalk.red(`Failed to install ${pkg}. Please install it manually.`));
        }

        // Generate connection.js
        this.generateConnectionFile(dbDir, dialect);
        // Generate setup tables file
        this.generateSetupTables(dbDir, dialect);
        // Generate auth service
        this.generateAuthService(servicesDir, dialect);

        console.log(chalk.green("✓ Database connection, setup script, and services generated."));

        // Suggest running the created setup files
        console.log(chalk.yellow(`Run 'node backend/databases/setup_tables.js' to create Users and LoginHistory tables.`));
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
        let content = `import db from './connection.js';\n\nasync function setup() {\n`;

        let usersTable = "";
        let historyTable = "";

        if (dialect === "sqlite") {
            usersTable = `
            await db.query(\`
                CREATE TABLE IF NOT EXISTS User (
                    id TEXT PRIMARY KEY,
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
                    id TEXT PRIMARY KEY,
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
                    id VARCHAR(36) PRIMARY KEY,
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
                    id VARCHAR(36) PRIMARY KEY,
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
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    static async findUserByEmail(email) {
`;
        if (dialect === "postgres") {
            content += `        return await db.queryOne('SELECT * FROM "User" WHERE email = $1', [email]);\n`;
        } else {
            content += `        return await db.queryOne('SELECT * FROM User WHERE email = ?', [email]);\n`;
        }

        content += `    }

    static async createLoginHistory(email, ip, success) {
        const id = crypto.randomUUID();
`;
        if (dialect === "postgres") {
            content += `        await db.query('INSERT INTO "LoginHistory" (id, email, ip_address, success) VALUES ($1, $2, $3, $4)', [id, email, ip, success]);\n`;
        } else {
            content += `        const successVal = success ? 1 : 0;\n        await db.query('INSERT INTO LoginHistory (id, email, ip_address, success) VALUES (?, ?, ?, ?)', [id, email, ip, successVal]);\n`;
        }

        content += `    }

    static async createUser(name, email, password) {
        const id = crypto.randomUUID();
`;
        if (dialect === "postgres") {
            content += `        await db.query('INSERT INTO "User" (id, name, email, password) VALUES ($1, $2, $3, $4)', [id, name, email, password]);\n`;
        } else {
            content += `        await db.query('INSERT INTO User (id, name, email, password) VALUES (?, ?, ?, ?)', [id, name, email, password]);\n`;
        }

        content += `        return { id, name, email };
    }

    static async setPasswordToken(userId, token) {
`;
        if (dialect === "postgres") {
            content += `        await db.query('UPDATE "User" SET password_token = $1 WHERE id = $2', [token, userId]);\n`;
        } else {
            content += `        await db.query('UPDATE User SET password_token = ? WHERE id = ?', [token, userId]);\n`;
        }

        content += `    }

    static async findUserByPasswordToken(token) {
`;
        if (dialect === "postgres") {
            content += `        return await db.queryOne('SELECT * FROM "User" WHERE password_token = $1', [token]);\n`;
        } else {
            content += `        return await db.queryOne('SELECT * FROM User WHERE password_token = ?', [token]);\n`;
        }

        content += `    }

    static async updatePassword(userId, newPassword) {
`;
        if (dialect === "postgres") {
            content += `        await db.query('UPDATE "User" SET password = $1, password_token = NULL WHERE id = $2', [newPassword, userId]);\n`;
        } else {
            content += `        await db.query('UPDATE User SET password = ?, password_token = NULL WHERE id = ?', [newPassword, userId]);\n`;
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

const routerAuth = new Router("/auth");
const props = Config.props();

routerAuth.post("/login", new Validator({ email: { required: true, email: true }, password: { required: true } }).middleware(), async (req, res) => {
    try {
        const { email, password } = req.body;
        const ip = req.ip;

        await AuthService.checkRateLimit(ip, email);

        const user = await AuthService.findUserByEmail(email);
        if (!user || user.password !== password) {
            await AuthService.createLoginHistory(email, ip, false);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        await AuthService.createLoginHistory(email, ip, true);
        const token = Auth.generateToken({ id: user.id, email: user.email });
        
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        return res.status(429).json({ message: error.message });
    }
});

routerAuth.post("/register", new Validator({ name: { required: true }, email: { required: true, email: true }, password: { required: true, min: 6 } }).middleware(), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await AuthService.findUserByEmail(email);
        if (exists) return res.status(400).json({ message: "Email already taken" });

        const user = await AuthService.createUser(name, email, password);
        return res.json({ message: "Registered", user: { id: user.id, email: user.email } });
    } catch(err) {
         return res.status(500).json({ message: err.message });
    }
});

routerAuth.post("/forgot-password", new Validator({ email: { required: true, email: true } }).middleware(), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await AuthService.findUserByEmail(email);
        
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            await AuthService.setPasswordToken(user.id, token);

            if (props.debug) {
                console.log("\\n[DEBUG] Email functionality for Forgot Password should be handled here.");
                console.log("[DEBUG] Debug mode active. Password reset link: http://" + props.host + ":" + props.port + "/reset-password?token=" + token + "\\n");
            }
        }

        return res.json({ message: "If the email is valid, a password reset link has been sent." });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

routerAuth.post("/reset-password", new Validator({ token: { required: true }, password: { required: true, min: 6 } }).middleware(), async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await AuthService.findUserByPasswordToken(token);

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token." });
        }

        await AuthService.updatePassword(user.id, password);

        return res.json({ message: "Password has been reset successfully." });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

export default routerAuth;
`;
        fs.writeFileSync(authFile, authContent, "utf-8");

        const authenticatedContent = `import Router from "@seip/blue-bird/core/router.js";
import Template from "@seip/blue-bird/core/template.js";
import Auth from "@seip/blue-bird/core/auth.js";

const routerAuthenticated = new Router();

routerAuthenticated.get("/dashboard", Auth.protect(), (req, res) => {
    return Template.renderReact(res, "App", { title: "Dashboard" }, { scriptsInBody: [{ "src": "https://cdn.tailwindcss.com" }] });
});

routerAuthenticated.get("/dashboard/validate", Auth.protect(), (req, res) => {
    return res.json({ user: req.user });
});

routerAuthenticated.get("/profile", Auth.protect(), (req, res) => {
    return Template.renderReact(res, "App", { title: "Profile" }, { scriptsInBody: [{ "src": "https://cdn.tailwindcss.com" }] });
});

routerAuthenticated.get("/profile/validate", Auth.protect(), (req, res) => {
    return res.json({ user: req.user });
});

export default routerAuthenticated;
`;
        fs.writeFileSync(authenticatedFile, authenticatedContent, "utf-8");
        console.log(chalk.green("✓ Backend auth and authenticated routes generated."));
    }

    createFrontendComponents() {
        const pagesDir = path.join(this.frontendDir, "resources", "js", "pages", "auth");
        if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });

        const loginContent = `import { useState } from 'react';
import { useLanguage } from '../../blue-bird/contexts/LanguageContext.jsx';

export default function Login() {
    const { t, lang, setLang } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t('error_general'));
            alert(t('success_login'));
            localStorage.setItem('token', data.token);
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl mb-4 font-bold">{t('login')}</h2>
                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">{t('email')}</label>
                        <input className="w-full border p-2 rounded mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('password')}</label>
                        <input className="w-full border p-2 rounded mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">{t('submit')}</button>
                </form>
                <div className="mt-4 flex justify-between text-sm">
                    <button onClick={() => setLang('en')} className={\`\${lang === 'en' ? 'font-bold' : ''}\`}>English</button>
                    <button onClick={() => setLang('es')} className={\`\${lang === 'es' ? 'font-bold' : ''}\`}>Español</button>
                </div>
            </div>
        </div>
    );
}
`;
        fs.writeFileSync(path.join(pagesDir, "Login.jsx"), loginContent, "utf-8");

        const registerContent = `import { useState } from 'react';
import { useLanguage } from '../../blue-bird/contexts/LanguageContext.jsx';
import { Link } from 'react-router-dom';

export default function Register() {
    const { t, lang, setLang } = useLanguage();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t('error_general'));
            window.location.href = '/login';
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl mb-4 font-bold">{t('register')}</h2>
                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">{t('name')}</label>
                        <input className="w-full border p-2 rounded mt-1" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('email')}</label>
                        <input className="w-full border p-2 rounded mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('password')}</label>
                        <input className="w-full border p-2 rounded mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">{t('submit')}</button>
                </form>
                <div className="mt-4 flex justify-between text-sm">
                    <button onClick={() => setLang('en')} className={\`\${lang === 'en' ? 'font-bold' : ''}\`}>English</button>
                    <button onClick={() => setLang('es')} className={\`\${lang === 'es' ? 'font-bold' : ''}\`}>Español</button>
                </div>
            </div>
        </div>
    );
}
`;
        fs.writeFileSync(path.join(pagesDir, "Register.jsx"), registerContent, "utf-8");

        const forgotPasswordContent = `import { useState } from 'react';
import { useLanguage } from '../../blue-bird/contexts/LanguageContext.jsx';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
    const { t, lang, setLang } = useLanguage();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        try {
            const res = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t('error_general'));
            setMessage(data.message);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl mb-4 font-bold">{t('forgot_password') || 'Forgot Password'}</h2>
                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
                {message && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">{message}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">{t('email')}</label>
                        <input className="w-full border p-2 rounded mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">{t('submit')}</button>
                </form>
                <div className="mt-4 text-center">
                    <Link to="/login" className="text-blue-500 hover:text-blue-700 text-sm">{t('login') || 'Login'}</Link>
                </div>
            </div>
        </div>
    );
}
`;
        fs.writeFileSync(path.join(pagesDir, "ForgotPassword.jsx"), forgotPasswordContent, "utf-8");

        const resetPasswordContent = `import { useState, useEffect } from 'react';
import { useLanguage } from '../../blue-bird/contexts/LanguageContext.jsx';
import { useLocation } from 'react-router-dom';

export default function ResetPassword() {
    const { t, lang, setLang } = useLanguage();
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Quick hook to get query string token
    const search = useLocation().search;
    useEffect(() => {
        const urlParams = new URLSearchParams(search);
        const t = urlParams.get('token');
        if (t) setToken(t);
    }, [search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        try {
            const res = await fetch('/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t('error_general'));
            setMessage(data.message);
            setTimeout(() => { window.location.href = '/login'; }, 2000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl mb-4 font-bold">Reset Password</h2>
                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
                {message && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">{message}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="hidden" value={token} required />
                    <div>
                        <label className="block text-sm font-medium">New {t('password') || 'Password'}</label>
                        <input className="w-full border p-2 rounded mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">{t('submit')}</button>
                </form>
            </div>
        </div>
    );
}
`;
        fs.writeFileSync(path.join(pagesDir, "ResetPassword.jsx"), resetPasswordContent, "utf-8");

        const dashboardContent = `import { useLanguage } from '../../blue-bird/contexts/LanguageContext.jsx';
import { useEffect, useState } from 'react';

export default function Dashboard() {
    const { t, lang, setLang } = useLanguage();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (!token) return window.location.href = '/login';
            const res = await fetch('/auth/dashboard', {
                headers: { 'Authorization': \`Bearer \${token}\` }});
             if(!res.ok) return window.location.href = '/login';
             const data = await res.json();
             setUser(data.user);
        };
        fetchUser();
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    if(!user) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow p-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">{t('dashboard')}</h1>
                <div className="space-x-4">
                    <button onClick={() => setLang('en')} className={\`\${lang === 'en' ? 'font-bold' : ''}\`}>EN</button>
                    <button onClick={() => setLang('es')} className={\`\${lang === 'es' ? 'font-bold' : ''}\`}>ES</button>
                    <button onClick={logout} className="text-red-500 hover:text-red-700 font-semibold">{t('logout')}</button>
                </div>
            </header>
            <main className="flex-1 p-8">
                <h2 className="text-2xl">Welcome, {user.email}!</h2>
            </main>
        </div>
    );
}
`;
        fs.writeFileSync(path.join(pagesDir, "Dashboard.jsx"), dashboardContent, "utf-8");

        console.log(chalk.green("✓ Frontend React UI Components generated."));
    }

    modifyEntryFiles() {
        const backendIndexFile = path.join(this.backendDir, "index.js");
        if (fs.existsSync(backendIndexFile)) {
            let backendIndex = fs.readFileSync(backendIndexFile, "utf-8");
            if (!backendIndex.includes("routerAuth")) {
                backendIndex = backendIndex.replace(
                    'import routerFrontendExample from "./routes/frontend.js";',
                    'import routerFrontendExample from "./routes/frontend.js";\nimport routerAuth from "./routes/auth.js";\nimport routerAuthenticated from "./routes/authenticated.js";'
                );
                backendIndex = backendIndex.replace(
                    'routes: [routerApiExample, routerFrontendExample]',
                    'routes: [routerApiExample, routerFrontendExample, routerAuth, routerAuthenticated]'
                );
                fs.writeFileSync(backendIndexFile, backendIndex, "utf-8");
                console.log(chalk.green("✓ backend/index.js updated to include new routes."));
            }
        }

        const appJsxFile = path.join(this.frontendDir, "resources", "js", "App.jsx");
        if (fs.existsSync(appJsxFile)) {
            let appJsx = fs.readFileSync(appJsxFile, "utf-8");
            if (!appJsx.includes("LanguageProvider")) {
                appJsx = appJsx.replace(
                    "import Home from './pages/Home';",
                    "import { LanguageProvider } from './blue-bird/contexts/LanguageContext.jsx';\nimport Login from './pages/auth/Login.jsx';\nimport Register from './pages/auth/Register.jsx';\nimport ForgotPassword from './pages/auth/ForgotPassword.jsx';\nimport ResetPassword from './pages/auth/ResetPassword.jsx';\nimport Dashboard from './pages/auth/Dashboard.jsx';\nimport Home from './pages/Home';"
                );
                appJsx = appJsx.replace(
                    "<Router>",
                    "<LanguageProvider>\n      <Router>"
                );
                appJsx = appJsx.replace(
                    "</Router>",
                    "</Router>\n    </LanguageProvider>"
                );
                appJsx = appJsx.replace(
                    '<Route path="/about" element={<About />} />',
                    '<Route path="/about" element={<About />} />\n            <Route path="/login" element={<Login />} />\n            <Route path="/register" element={<Register />} />\n            <Route path="/forgot-password" element={<ForgotPassword />} />\n            <Route path="/reset-password" element={<ResetPassword />} />\n            <Route path="/dashboard" element={<Dashboard />} />'
                );
                fs.writeFileSync(appJsxFile, appJsx, "utf-8");
                console.log(chalk.green("✓ frontend/resources/js/App.jsx updated with routes and Provider."));
            }
        }
    }
}

const initializer = new ScaffoldingAuth();
export default initializer;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    initializer.run();
}
