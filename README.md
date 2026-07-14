# Blue Bird Framework

**High-Performance Express Framework — Built for Speed, Caching, and Visual Excellence**

![Blue Bird Logo](https://seip25.github.io/Blue-bird/blue-bird.png)

[![npm version](https://img.shields.io/npm/v/@seip/blue-bird.svg)](https://www.npmjs.com/package/@seip/blue-bird)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Introduction

Blue Bird is a powerful, opinionated framework built on Express for backend routing and APIs, integrated with Astro (v7.0) for high-performance frontend rendering. It features pre-configured data validation, security middlewares, GCM-encrypted JWT authentication, and CLI/Docker developer workflows out of the box.

---

## 🚀 Key Features / Características Clave

- All-In-One: Pre-configured Express server with JSON, URL encoding, Cookies, and CORS.
- Astro Frontend: Native integration with Astro (v7.0) for server-side rendering (SSR), static site generation (SSG), and middleware mode.
- Premium Security: AES-256-GCM encrypted JWT cookie auth, secure route filters, and built-in Helmet configurator.
- File Uploads: Easy Multer-based single/multiple file storage handling.
- Docker & PM2 Devops: Pre-built Docker Compose/Dockerfile templates and CLI tools for zero-config dev and VPS production.

---

## 🛠️ Quick Start / Inicio Rápido

### 1. Installation / Instalación

```bash
npm install @seip/blue-bird
```

### 2. Initialize Project / Inicializar

```bash
npx blue-bird
```

_This copies the base structure: `backend`, `frontend`, `docker`, `docker-compose.yml`, `AGENTS.md`, and `.env`._

### 3. Run Development Server / Modo Desarrollo

```bash
npm run dev
```

---

## 📁 Project Structure / Estructura del Proyecto

```
project/
├── backend/
│   └── routes/              # Express route files
│       └── api.js           # REST API routes
├── frontend/
│   ├── src/
│   │   └── pages/           # Astro routes and pages (.astro)
│   │       ├── index.astro
│   │       └── about.astro
│   ├── public/              # Static assets mapped to root of Astro build
│   │   └── css/
│   │       └── app.css      # Css files
│   └── astro.config.mjs     # Astro configuration file
├── docker/
│   └── Dockerfile           # Optimized production build file
├── docker-compose.yml       # Dev/Prod container configurations
├── index.js                 # App startup and initialization entrypoint
├── AGENTS.md                # AI coding assistant guidebook
└── .env                     # App configuration (git-ignored)
```

---

## 📖 Core Modules Documentation / Documentación de Módulos

### 1. Routing (`Router`)

Do not use Express' native router. Always use Blue Bird's wrapper class:

```javascript
import Router from "@seip/blue-bird/core/router.js";

const routerApi = new Router("/api");
routerApi.get("/users", (req, res) => {
  res.json({ users: [] });
});
export default routerApi;
```

---

### 2. Astro Node Middleware Integration

Blue Bird supports Astro (v7.0) Node middleware mode. Astro handles frontend SSR, routing, static assets, and layouts, while Express handles API endpoints and server logic.

To enable Astro integration:

```javascript
import App from "@seip/blue-bird/core/app.js";
import routerApi from "./backend/routes/api.js";

const app = new App({
  routes: [routerApi],
  astro: true, // Enables Astro middleware mode
});

app.run();
```

#### Advanced Config Options

You can pass a configuration object instead of a boolean value:

```javascript
const app = new App({
  astro: {
    server: true, // Mounts Astro SSR handler
    serverEntry: "./frontend/dist/server/entry.mjs", // Path to compiled Astro server entrypoint
    client: false, // Set to true to serve static files from client build
    clientDir: "./frontend/dist/client", // Path to Astro client static assets
    base: "/", // Mount base path
  },
});
```

---

### 3. Data Validation (`Validator`)

Validates request payloads using a JSON schema. Returns structured `400 Bad Request` payloads automatically on schema failures.

```javascript
import Validator from "@seip/blue-bird/core/validate.js";

const userSchema = {
  email: { required: true, email: true },
  password: { required: true, min: 8 },
  bio: { required: false },
};

const validateUser = new Validator(userSchema, "en");

routerApi.post("/users", validateUser.middleware(), (req, res) => {
  res.json({ success: true });
});
```

---

### 4. JWT Authentication (`Auth`)

Secure user sessions using stateless AES-256-GCM encrypted JWTs stored in secure HTTP-Only cookies.

#### Protecting Routes

```javascript
import Auth from "@seip/blue-bird/core/auth.js";

// Secure API endpoint (returns 401 on failure)
router.get("/profile", Auth.protect(), (req, res) => {
  res.json({ user: req.user });
});

// Secure web page (redirects to /login on failure)
router.get("/dashboard", Auth.protect({ redirect: "/login" }), (req, res) => {
  Template.render(res, "dashboard");
});
```

#### Authentication Sessions

```javascript
router.post("/login", async (req, res) => {
  const user = { id: 1, name: "John Doe" };
  await Auth.login(res, user);
  res.json({ message: "Logged in successfully" });
});

router.post("/logout", async (req, res) => {
  await Auth.logout(res);
  res.json({ message: "Logged out" });
});
```

---

### 5. Performance Cache Middleware (`Cache`)

Applies caching at the route handler level. Automatically caches JSON payloads (`res.json`) and rendered outputs (`res.send`).

```javascript
import Cache from "@seip/blue-bird/core/cache.js";

// Cache endpoint for 60 seconds
router.get("/stats", Cache.middleware(60), (req, res) => {
  res.json({ usersOnline: 42 });
});
```

Integrates with Redis if `REDIS_HOST` is defined in the environment. Falls back to an in-memory cache automatically if Redis is not configured or not running.

---

### 6. Security Headers (`Helmet`)

Apply security headers per-router. Preserves the framework's custom powered-by header by default:

```javascript
import App from "@seip/blue-bird/core/app.js";

const webRouter = new Router("/web");
webRouter.use(App.helmet());
```

---

### 7. Database wrapper (`Database`)

MySQL database client connection pool configuration featuring automated retry loops, query formatting utilities, and Redis query caching.

```javascript
import connection from "@seip/blue-bird/core/database.js";

// Fetch single row from a SELECT query
const user = await connection.query("SELECT * FROM users WHERE email = ?", ["test@example.com"], "return_row");

// Fetch rows with 60 seconds Redis caching enabled
const stats = await connection.query("SELECT COUNT(*) as count FROM access_logs", [], { cache: 60 });

// INSERT queries return the last insert ID directly
const newId = await connection.query("INSERT INTO users (name) VALUES (?)", ["John"]);
```

---

## 🐳 Docker CLI Workflow

Blue Bird comes with a built-in Docker CLI wrapper that handles both local development database bootstrapping and full-stack VPS production deployments.

### Commands Syntax:

```bash
npx blue-bird docker <command> [options]
```

### Supported Actions:

- **`npx blue-bird docker start`**: Boots the production stack (Node.js App + Nginx + MySQL + Redis).
- **`npx blue-bird docker start mysql`**: Boots the MySQL container only (great for local HTTP development).
- **`npx blue-bird docker start redis`**: Boots the Redis container only.
- **`npx blue-bird docker start dbs`**: Boots both database containers (MySQL + Redis).
- **`npx blue-bird docker stop`**: Stops all active containers.
- **`npx blue-bird docker build [--no-cache]`**: Builds or updates the Node.js production image.
- **`npx blue-bird docker ps`**: Lists running project containers and ports.
- **`npx blue-bird docker logs [app|mysql]`**: Tails logs for the specified container.
- **`npx blue-bird docker pm2 [args]`**: Runs PM2 commands inside the Node.js application container (e.g. `status`, `monit`, `reload all`).
- **`npx blue-bird docker db`**: Connects into the container's interactive MySQL shell using credentials from `.env`.
- **`npx blue-bird docker redis`**: Connects into the container's interactive Redis CLI terminal.
- **`npx blue-bird docker prune`**: Safely clears orphaned volumes, dangling build caches, and images.

---

## 🚀 Production Deployment Options

You can deploy Blue Bird applications to production using two main workflows:

### A. Docker Container Stack (Highly Recommended)

Using the built-in Docker stack is the recommended deployment method because it sets up a complete, hardened production environment automatically:
- **Nginx Reverse Proxy:** Captures traffic on port 3000 (or custom PORT), serves Astro client-side assets directly from the filesystem to offload the Node.js server, and proxies the rest to Express.
- **PM2 Clustering:** Launches Node.js in cluster mode inside the container, utilizing all available CPU cores based on `PM2_INSTANCES` configuration (defaulting to 1).
- **Security Mitigation:** Nginx blocks common malicious scanners (e.g. `/.env`, `/.git`, `/wp-admin`) instantly using a 444 status code and implements a `10r/s` request rate-limit.
- **Services Stack:** MySQL and Redis are configured in the same bridge network automatically.

To deploy via Docker:
1. Configure `.env` with production keys, `DEBUG=false` and your custom `TITLE`.
2. Build the production image:
   ```bash
   npx blue-bird docker build
   ```
3. Run the container cluster:
   ```bash
   npx blue-bird docker start prod
   ```

### B. Standard Standalone PM2 / Node.js Runtime

If you choose to run outside of Docker, you must set up the reverse proxy and databases manually. To deploy in a standard Linux environment using PM2:

1. Install PM2 globally:
   ```bash
   npm install pm2 -g
   ```
2. Start the application under PM2:
   ```bash
   pm2 start index.js --name "bluebird-app" --node-args="--env-file=.env" -i max
   ```
3. Monitor status:
   ```bash
   pm2 status
   pm2 logs
   ```

---

## 📄 License / Licencia

Distributed under the **MIT License**. See `LICENSE` for more information.

Distribuido bajo la **Licencia MIT**. Mira `LICENSE` para más información.

---

<div align="center">
  <p>Made with ❤️ by <strong>Seip25</strong></p>
</div>
