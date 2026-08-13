# Blue Bird Framework

**High-Performance Express Framework — Built for Speed, Caching, and Visual Excellence**

![Blue Bird Logo](https://seip25.github.io/Blue-bird/favicon.ico)

[![npm version](https://img.shields.io/npm/v/@seip/blue-bird.svg)](https://www.npmjs.com/package/@seip/blue-bird)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Introduction

Blue Bird is a powerful, performance-first API framework built on Express. It features pre-configured data validation, security middlewares, GCM-encrypted JWT authentication, and CLI/Docker developer workflows out of the box, with static frontend assets handled directly by Nginx.

---

## 🕊️ The Blue Bird Philosophy

Stop wasting time configuring CORS, security headers, database connections, and authentication flows. Blue Bird provides an opinionated, highly efficient core structure allowing you to focus on writing clean business logic. Nginx handles the static frontend directly from the filesystem, Express handles the backend APIs. Includes a preconfigured Docker stack with Nginx reverse proxy, Redis cache, and PM2 cluster scaling.

### 🧩 Decoupled Architecture
Nginx natively serves static frontend assets and extensionless HTML pages from `frontend/`. Express owns the API layer, keeping your backend entirely focused on performance and logic.

- **Cross-Platform Versatility**: Because the Express backend API is fully decoupled from the HTML/JS/CSS frontend layer, developers can easily build and maintain multiple application targets pointing to the same core API:
  - **Web Applications**: Static HTML, CSS, and client-side JS served natively by Nginx.
  - **Mobile Applications**: Powered by **Capacitor**, Cordova, or React Native.
  - **Desktop Applications**: Built with **Electron** or **Tauri**.
- **Strong Business Logic**: Enforces a strict separation of concerns — Nginx excels at ultra-fast static file delivery and public assets, while Express handles API routing, business rules, validation, and data operations without UI rendering overhead.
- **Lightweight Footprint**: Offloading static assets to Nginx optimizes Node.js event loop performance, resulting in extremely minimal RAM, CPU, and disk consumption under high concurrent workloads.

### 🐳 Built-in Orchestration
Includes a comprehensive Docker Compose CLI wrapper to bootstrap, build, stop, and clean dev and production environments with zero manual scripting.

---

## 🚀 Key Features / Características Clave

- All-In-One: Pre-configured Express API server with JSON, URL encoding, Cookies, and CORS.
- Nginx Static Frontend: Lightning-fast static asset and extensionless HTML serving via Nginx, decoupled from Node.js.
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

When run, the interactive CLI prompts for your preferred infrastructure configuration:
- Database Selection: Choose between `none`, `mysql`, or `postgres`.
- Credentials: Set your database name, user, password, and port (`3306` or `5432`).

The CLI intelligently copies the appropriate Docker configuration (`docker/docker-compose.mysql.yml`, `docker/docker-compose.postgres.yml`, or `docker/docker-compose.none.yml`) to your project root as `docker-compose.yml`. It also writes the environment settings (`DB_TYPE`, `DATABASE_URL`) to `.env` and installs the required database packages (`mysql2` or `pg`) automatically.

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
│   ├── css/                 # CSS files
│   ├── js/                  # JavaScript files
│   └── index.html           # Static HTML files
├── docker/
│   └── Dockerfile           # Optimized production build file
├── docker-compose.yml       # Dev/Prod container configurations
├── index.js                 # App startup and initialization entrypoint
├── AGENTS.md                # AI coding assistant guidebook
└── .env                     # App configuration (git-ignored)
```

---

## 📖 Core Modules Documentation / Documentación de Módulos

### 1. Application Class (`App`)

Initializes the Express server. If Docker/Nginx is not used (or for lightweight setups like Express + SQLite), you can configure Express to serve static frontend files directly via the `static` parameter:

```javascript
import App from "@seip/blue-bird/core/app.js";
import routerApi from "./backend/routes/api.js";

const app = new App({
  port: process.env.PORT || 3000,
  host: "http://localhost",
  routes: [routerApi],
  cors: [],
  middlewares: [],
  logger: false,
  // Standalone Express Static Asset Serving (No Nginx/Docker required)
  static: {
    path: "../frontend", // relative directory path to frontend files
    options: {}           // express.static options
  }
});

app.run();
```

---

### 2. Routing (`Router`)

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

### 4. JWT Authentication & Redis Sessions (`Auth`)

Secure user authentication with AES-256-GCM encrypted tokens. Transmitted via HTTP-Only cookies or `Authorization` headers, with optional Redis session storage and invalidation.

#### Protecting Routes

```javascript
import Auth from "@seip/blue-bird/core/auth.js";

// 1. Secure API endpoint (returns 401 JSON on failure)
router.get("/profile", Auth.protect(), (req, res) => {
  res.json({ user: req.user });
});

// 2. Secure web page (redirects to /login on failure)
router.get("/dashboard", Auth.protect({ redirect: "/login", key: "user", cookieKey: "auth" }), (req, res) => {
  res.send(`<h1>Welcome ${req.user.name}</h1>`);
});
```

#### Authentication Sessions & Utilities

```javascript
// Login & Sync Session state in Redis (if active)
router.post("/login", async (req, res) => {
  const user = { id: 1, name: "John Doe", role: "admin" };
  await Auth.login(res, user, "auth", { expiresIn: "7d" });
  res.json({ message: "Logged in successfully" });
});

// Logout & Delete Session from Redis
router.post("/logout", async (req, res) => {
  await Auth.logout(res, "auth", {}, req);
  res.json({ message: "Logged out" });
});

// Manual Encrypted JWT Tokens & AES-256-GCM Encryption
const token = Auth.generateToken({ id: 1 }, process.env.JWT_SECRET, "2h");
const decoded = Auth.verifyToken(token, process.env.JWT_SECRET);
const encrypted = Auth.encrypt({ secret: "1234" }, process.env.JWT_SECRET);
const decrypted = Auth.decrypt(encrypted, process.env.JWT_SECRET);
```

---

### 5. Performance Cache & Redis Client (`Cache`)

Applies route-level response caching for JSON payloads (`res.json`) and HTML output (`res.send`). Automatically uses Redis when `REDIS_HOST` is configured, and transparently degrades to an in-memory cache if Redis is unavailable or offline.

#### Route Caching Middleware

```javascript
import Cache, { getRedisClient } from "@seip/blue-bird/core/cache.js";

// Cache endpoint for 60 seconds (sets X-Blue-Bird-Cache: HIT/MISS headers)
router.get("/stats", Cache.middleware(60), (req, res) => {
  res.json({ usersOnline: 42 });
});
```

#### Custom Database & Data Caching with `getRedisClient()`

```javascript
// Direct access to the active Redis client for database query or custom key caching
router.get("/custom-cache", async (req, res) => {
  const redis = getRedisClient();
  if (redis) {
    const cached = await redis.get("my_custom_key");
    if (cached) return res.json(JSON.parse(cached));

    const dbData = await fetchHeavyDataFromDB();
    await redis.set("my_custom_key", JSON.stringify(dbData), { EX: 120 }); // Expiry 120s
    return res.json(dbData);
  }
  
  // Fallback if Redis is disabled
  const dbData = await fetchHeavyDataFromDB();
  res.json(dbData);
});
```

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

Blue Bird provides a unified, multi-database client wrapper (`core/database.js`) supporting **MySQL** and **PostgreSQL** with automated connection retry loops, query formatting utilities, and Redis query caching.

#### Driver Support
- **Native MySQL (`mysql2/promise`)**: High-performance connection pool for MySQL 8.0+.
- **Native PostgreSQL (`pg`)**: Connection pool for PostgreSQL 18+. When running standard queries with `connection.query(sql, params)`, the wrapper automatically converts `?` parameter placeholders into PostgreSQL `$1, $2, ...` syntax, allowing unified SQL query writing across both database engines.
- **No Database (`none`)**: If no database is configured, the wrapper is disabled gracefully without crashing the server.

#### Standalone & Remote Database Configuration
You can connect to any local or remote database instance (outside Docker, such as Supabase, Neon, AWS RDS, or local services) simply by defining the `DATABASE_URL` in your `.env` file:

```env
DB_TYPE="postgres"
DATABASE_URL="postgresql://postgres:password@localhost:5432/blue_bird?schema=public"
# OR for MySQL:
# DATABASE_URL="mysql://root:password@localhost:3306/blue_bird"
```

#### Usage Examples

```javascript
import { Database, DB_TYPE } from "@seip/blue-bird/core/database.js";

// Instantiate the database connection pool with a connection limit (e.g., 20)
const connection = new Database(20);

// 1. Basic SELECT query returning single row (Works for both MySQL and PostgreSQL using ? placeholders)
const user = await connection.query("SELECT * FROM users WHERE email = ?", ["test@example.com"], "return_row");

// 2. Fetch rows with 60 seconds Redis caching enabled
const stats = await connection.query("SELECT COUNT(*) as count FROM access_logs", [], { cache: 60 });

// 3. INSERT query (returns insertId for MySQL, or inserted row ID / rowCount for PostgreSQL)
const newId = await connection.query("INSERT INTO users (name) VALUES (?)", ["John"]);

// 4. Automatic SQL Query Pagination (Runs count query + LIMIT/OFFSET calculation)
const paginated = await connection.paginate(
  "SELECT * FROM users WHERE status = ?",
  ["active"],
  { page: 1, limit: 10, cache: 60 }
);

// 5. Atomic Database Transactions with Automatic Commit & Rollback
const txUserId = await connection.transaction(async (tx) => {
  const userId = await tx.query("INSERT INTO users (name, email) VALUES (?, ?)", ["Alice", "alice@example.com"]);
  await tx.query("INSERT INTO profiles (user_id) VALUES (?)", [userId]);
  return userId;
});
```

---

### 8. Real-Time WebSockets Engine (`WebSocketManager`)

Built-in high-performance vanilla WebSocket server (`ws`) sharing the **exact same HTTP server and port as Express** (port 3000), supporting room subscriptions, JWT authentication, 30s heartbeat ping/pong, and Redis Pub/Sub cluster synchronization:

```javascript
import App from "@seip/blue-bird/core/app.js";

const app = new App({ ... });

// 1. Initialize WebSocket server on route /ws with optional JWT Auth check
const ws = app.websocket({ path: "/ws", auth: true });

ws.onConnection((socket, req) => {
  socket.join("lobby");
  socket.sendJSON({ status: "connected", user: socket.user });

  socket.on("message", (raw) => {
    // Broadcast to room (synced across PM2 cluster via Redis Pub/Sub)
    ws.broadcast({ room: "lobby", text: raw.toString() }, "lobby");
  });
});

app.run();
```

#### Broadcasting from Express API Routes:
```javascript
router.post("/api/comments", async (req, res) => {
  // 1. Save comment into database...
  const comment = { id: 1, text: req.body.text };

  // 2. Broadcast in real time to all WebSocket clients in the "lobby" room
  app.wsManager.broadcast({ type: "NEW_COMMENT", data: comment }, "lobby");

  return res.success(comment, "Comment created");
});
```

#### Native Client Connection (Browser & Node.js v22+):
```javascript
// Native W3C Standard WebSocket Client (Browser & Node.js v22+)
const socket = new WebSocket("ws://localhost:3000/ws");

socket.addEventListener("open", () => {
  console.log("Connected to WebSocket server!");
  socket.send("Hello server from native client!");
});

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log("Message received from server:", data);
});
```

---

### 9. Nginx Static Asset Caching

Nginx is configured to explicitly cache static assets (`.js`, `.css`, `.jpg`, `.png`, etc.) in the user's browser with the `Cache-Control` header (valid for 1 month). HTML and API endpoints (`/api/*`) are not cached by Nginx to ensure they serve dynamic and up-to-date content, relying instead on the Node.js application and Redis for data-layer caching.

---

## Docker CLI Workflow

Blue Bird comes with a built-in Docker CLI wrapper that handles both local development database bootstrapping and full-stack VPS production deployments across MySQL, PostgreSQL, or no-database architectures.

### Commands Syntax:

```bash
npx blue-bird docker <command> [options]
```

### Supported Actions:

- **`npx blue-bird docker dev`**: Boots the development stack (Node.js App with `npm run dev` + Nginx + Database + Redis).
- **`npx blue-bird docker start`**: Boots the production stack (Node.js App + Nginx + Database + Redis).
- **`npx blue-bird docker start db`** (or `postgres` / `mysql`): Boots the configured database container only (great for local development outside Docker).
- **`npx blue-bird docker start redis`**: Boots the Redis container only.
- **`npx blue-bird docker start dbs`**: Boots both database containers (configured DB + Redis).
- **`npx blue-bird docker stop`**: Stops all active project containers.
- **`npx blue-bird docker build [--no-cache]`**: Builds or updates the Node.js production image.
- **`npx blue-bird docker ps`**: Lists running project containers and ports.
- **`npx blue-bird docker logs [app|db|postgres|mysql]`**: Tails logs for the specified container.
- **`npx blue-bird docker pm2 [args]`**: Runs PM2 commands inside the Node.js application container (e.g. `status`, `monit`, `reload all`).
- **`npx blue-bird docker db`** (or `psql` / `mysql`): Connects into the container's interactive database shell (`psql` for PostgreSQL, `mysql` for MySQL). Supports smart table queries, schema inspection, and backups:
  - `npx blue-bird docker mysql users` -> executes `SELECT * FROM users;` formatted as ASCII table.
  - `npx blue-bird docker mysql users --limit=10 --where="id > 5"` -> executes filtered query.
  - `npx blue-bird docker mysql tables` -> lists database tables (`SHOW TABLES`).
  - `npx blue-bird docker mysql columns users` -> describes table schema (`SHOW COLUMNS`).
- **`npx blue-bird docker export [filename.sql]`** (or `npx blue-bird docker mysql export`): Dumps database schema and data into `backups/backup_YYYY-MM-DD.sql` (creates `backups/` folder automatically).
- **`npx blue-bird docker import [filename.sql]`** (or `npx blue-bird docker mysql import`): Restores database from a `.sql` file in `backups/` (uses the most recent `.sql` backup if no filename is specified).
- **`npx blue-bird docker redis`**: Connects into the container's interactive Redis CLI terminal. Supports smart subcommands:
  - `npx blue-bird docker redis monitor` -> live stream of all incoming Redis commands.
  - `npx blue-bird docker redis keys [pattern]` -> lists all matching Redis keys (defaults to `*`).
  - `npx blue-bird docker redis key <keyname>` -> gets value for specific Redis key.
- **`npx blue-bird docker prune`**: Safely clears orphaned volumes, dangling build caches, and images.

---

## 🚀 Production Deployment Options

You can deploy Blue Bird applications to production using two main workflows:

### A. Docker Container Stack (Highly Recommended)

Using the built-in Docker stack is the recommended deployment method because it sets up a complete, hardened production environment automatically:
- **Nginx Reverse Proxy:** Captures traffic on port 3000 (or custom PORT), serves static assets and extensionless HTML directly from the filesystem to offload the Node.js server, and proxies API traffic to Express.
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
