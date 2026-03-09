import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Scaffolds an authentication system with Prisma, JWT, React Frontend, and i18n support.
 */
class ScaffoldingAuth {
    constructor() {
        this.appDir = process.cwd();
        this.backendDir = path.join(this.appDir, "backend");
        this.frontendDir = path.join(this.appDir, "frontend");
        this.prismaDir = path.join(this.appDir, "prisma");
        this.schemaPath = path.join(this.prismaDir, "schema.prisma");
    }

    /**
     * Entry point for running the scaffolding setup.
     */
    async run() {
        console.log(chalk.cyan("Starting Auth Scaffolding initialization..."));

        try {
            this.ensurePrismaAndModels();
            this.createBackendRoutes();
            this.createFrontendComponents();
            this.modifyEntryFiles();

            console.log(chalk.blue("\nAuth Scaffolding completed successfully!"));
            console.log(chalk.white("Important: ") + chalk.yellow("Ensure you run 'npx prisma db push' or 'npx prisma migrate dev' to update your database."));
            console.log(chalk.white("Update your App.jsx to use the newly created React components."));
        } catch (error) {
            console.error(chalk.red("Error during Scaffolding Auth initialization:"), error.message);
        }
    }

    /**
     * Validates Prisma installation and appends the LoginHistory model.
     */
    ensurePrismaAndModels() {
        if (!fs.existsSync(this.schemaPath)) {
            console.log(chalk.yellow("Prisma not found, initializing..."));
            execSync("npm run prisma", { stdio: "inherit", cwd: this.appDir });
        }

        let schemaContent = fs.readFileSync(this.schemaPath, "utf-8");

        const loginHistoryModel = `
model LoginHistory {
  id         String   @id @default(uuid())
  email      String
  ip_address String
  success    Boolean
  created_at DateTime @default(now())
}
`;

        if (!schemaContent.includes("model LoginHistory")) {
            schemaContent += "\n" + loginHistoryModel;
            fs.writeFileSync(this.schemaPath, schemaContent, "utf-8");
            console.log(chalk.green("✓ LoginHistory model added to schema.prisma."));
        }
    }

    /**
     * Generates backend authentication routes and rate limiter logic.
     */
    createBackendRoutes() {
        const routesDir = path.join(this.backendDir, "routes");
        if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });

        const authFile = path.join(routesDir, "auth.js");
        const authenticatedFile = path.join(routesDir, "authenticated.js");

        const authContent = `import Router from "@seip/blue-bird/core/router.js";
import Validator from "@seip/blue-bird/core/validate.js";
import Auth from "@seip/blue-bird/core/auth.js";
import Config from "@seip/blue-bird/core/config.js";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();
const routerAuth = new Router("/auth");
const props = Config.props();

/**
 * Validates login attempts to prevent brute force attacks.
 */
async function checkRateLimit(ip, email) {
    const attempts = await prisma.loginHistory.count({
        where: { ip_address: ip, email: email, success: false, created_at: { gte: new Date(Date.now() - 10 * 60 * 1000) } } // last 10 minutes
    });

    if (attempts >= 15) throw new Error("Blocked for 10 minutes.");
    if (attempts >= 10) throw new Error("Blocked for 5 minutes.");
    if (attempts >= 8) throw new Error("Blocked for 3 minutes.");
    if (attempts >= 5) throw new Error("Blocked for 1 minute.");
    return true;
}

routerAuth.post("/login", new Validator({ email: { required: true, email: true }, password: { required: true } }).middleware(), async (req, res) => {
    try {
        const { email, password } = req.body;
        const ip = req.ip;

        await checkRateLimit(ip, email);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.password !== password) {
            await prisma.loginHistory.create({ data: { email, ip_address: ip, success: false } });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        await prisma.loginHistory.create({ data: { email, ip_address: ip, success: true } });
        const token = Auth.generateToken({ id: user.id, email: user.email });
        
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        return res.status(429).json({ message: error.message });
    }
});

routerAuth.post("/register", new Validator({ name: { required: true }, email: { required: true, email: true }, password: { required: true, min: 6 } }).middleware(), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(400).json({ message: "Email already taken" });

        const user = await prisma.user.create({ data: { name, email, password } });
        return res.json({ message: "Registered", user: { id: user.id, email: user.email } });
    } catch(err) {
         return res.status(500).json({ message: err.message });
    }
});

routerAuth.post("/forgot-password", new Validator({ email: { required: true, email: true } }).middleware(), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        
        // We always return success to prevent email enumeration attacks
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            await prisma.user.update({
                where: { id: user.id },
                data: { password_token: token }
            });

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
        const user = await prisma.user.findFirst({ where: { password_token: token } });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token." });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { password: password, password_token: null }
        });

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
    }    /**
         * Generates React components powered by Tailwind.
         */
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

    /**
     * Modifies the entry point files to wire everything up.
     */
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
