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
- Database Selection: Choose between `sqlite` (default), `mysql`, `postgres`, or `none`.
- Credentials / Path: Set your SQLite database path (default `database/blue_bird.db`), or MySQL/PostgreSQL host, port, user, and password.

The CLI intelligently copies the appropriate Docker configuration (`docker/docker-compose.sqlite.yml`, `docker/docker-compose.mysql.yml`, `docker/docker-compose.postgres.yml`, or `docker/docker-compose.none.yml`) to your project root as `docker-compose.yml`. It also writes the environment settings (`DB_TYPE`, `DB_FILE`, `DATABASE_URL`) to `.env` and installs the required database packages (`better-sqlite3`, `mysql2`, or `pg`) automatically.


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

### 4. Authentication & Password Hashing (`Auth` & `Hash`)

#### Password Hashing (`Hash`)

Blue Bird includes high-performance password hashing using `node:crypto.scrypt` with random salt and timing-safe comparison out of the box (zero npm dependencies). It also supports `bcrypt` if installed or when verifying `$2a$/$2b$` hashes.

```javascript
import Hash from "@seip/blue-bird/core/hash.js";

// 1. Hash password with scrypt (default)
const hash = await Hash.make("mySecretPassword");

// 2. Verify password (timing-safe comparison)
const isValid = await Hash.verify("mySecretPassword", hash);

// 3. Hash with bcrypt (if 'bcrypt' package is installed)
const bcryptHash = await Hash.make("mySecretPassword", { driver: "bcrypt", rounds: 10 });
```

#### JWT Authentication & Sessions (`Auth`)

Secure user authentication with AES-256-GCM encrypted tokens. Transmitted via HTTP-Only cookies or `Authorization` headers, with optional Redis session storage and invalidation.

##### Protecting Routes

```javascript
import Auth from "@seip/blue-bird/core/auth.js";

// 1. Secure API endpoint (returns 401 JSON on failure)
router.get("/profile", Auth.protect(), (req, res) => {
  res.ok({ user: req.user });
});

// 2. Secure web page (redirects to /login on failure)
router.get("/dashboard", Auth.protect({ redirect: "/login", key: "user", cookieKey: "auth" }), (req, res) => {
  res.send(`<h1>Welcome ${req.user.name}</h1>`);
});
```

##### Authentication Sessions & Utilities

```javascript
// Login & Sync Session state in Redis (if active)
router.post("/login", async (req, res) => {
  const user = { id: 1, name: "John Doe", role: "admin" };
  await Auth.login(res, user, "auth", { expiresIn: "7d" });
  res.ok(user, "Logged in successfully");
});

// Logout & Delete Session from Redis
router.post("/logout", async (req, res) => {
  await Auth.logout(res, "auth", {}, req);
  res.ok(null, "Logged out");
});

// Manual Encrypted JWT Tokens & AES-256-GCM Encryption
const token = Auth.generateToken({ id: 1 }, process.env.JWT_SECRET, "2h");
const decoded = Auth.verifyToken(token, process.env.JWT_SECRET);
const encrypted = Auth.encrypt({ secret: "1234" }, process.env.JWT_SECRET);
const decrypted = Auth.decrypt(encrypted, process.env.JWT_SECRET);
```

---

### 5. HTTP Response Helpers & Health Check

Blue Bird enhances Express' `res` object with standardized helper methods:

```javascript
// Standard Success Responses
res.ok(data, "Success");                      // HTTP 200 { status: "success", message, data }
res.created(newItem, "Item created");         // HTTP 201 { status: "success", message, data }
res.paginate(items, pagination, "Fetched");   // HTTP 200 { status: "success", message, data, pagination }

// Standard Error Responses
res.badRequest("Invalid input", errors);      // HTTP 400 { status: "error", message, errors }
res.unauthorized("Authentication required");  // HTTP 401 { status: "error", message }
res.forbidden("Access denied");               // HTTP 403 { status: "error", message }
res.notFound("Resource not found");           // HTTP 404 { status: "error", message }
res.serverError("Internal failure", err);     // HTTP 500 { status: "error", message }
```

#### Health Check Endpoint (`/api/health`)

Every application includes an automatic `/api/health` route returning server status, uptime, environment, and memory consumption.

---

### 6. Performance Cache & Modes (`Cache`)

Configured via `CACHE_MODE` in `.env`:
- `CACHE_MODE="memory"`: Fast local RAM cache inside Node.js with automated TTL cleanup (default when Redis is not used). Zero network overhead.
- `CACHE_MODE="redis"`: Distributed cache across Docker containers with automatic fallback to memory if Redis is unavailable.
- `CACHE_MODE="none"`: Caching disabled.

#### Route Caching Middleware

```javascript
import Cache, { getRedisClient } from "@seip/blue-bird/core/cache.js";

// Cache endpoint for 60 seconds (sets X-Blue-Bird-Cache: HIT/MISS headers)
router.get("/stats", Cache.middleware(60), (req, res) => {
  res.ok({ usersOnline: 42 });
});
```

#### Programmatic Cache Manipulation & Invalidation

```javascript
// Get / Set keys programmatically
await Cache.set("custom_key", { data: "value" }, 120);
const cachedData = await Cache.get("custom_key");

// Manually invalidate route cache (e.g. after updating DB)
await Cache.delete("/api/public/config");

// Clear all cache entries
await Cache.clear();
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

Blue Bird provides a unified, multi-database client wrapper (`core/database.js`) supporting **SQLite** (default), **MySQL**, and **PostgreSQL** with automated connection retry loops, query formatting utilities, and Redis query caching.

#### Driver Support
- **Native SQLite (`better-sqlite3`) [Default]**: Embedded, ultra-fast zero-latency database. Automatically applies `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, and `PRAGMA foreign_keys = ON;` to eliminate locking errors and support concurrent reader and writer operations.
- **Native MySQL (`mysql2/promise`)**: High-performance connection pool for MySQL 8.0+.
- **Native PostgreSQL (`pg`)**: Connection pool for PostgreSQL 18+. When running standard queries with `connection.query(sql, params)`, the wrapper automatically converts `?` parameter placeholders into PostgreSQL `$1, $2, ...` syntax, allowing unified SQL query writing across all database engines.
- **No Database (`none`)**: If no database is configured, the wrapper is disabled gracefully without crashing the server.

#### Standalone & Remote Database Configuration
You can connect to any local or remote database instance (outside Docker, such as Supabase, Neon, AWS RDS, local SQLite files, or MySQL/Postgres services) simply by defining the `DATABASE_URL` or `DB_FILE` in your `.env` file:

```env
# SQLite (Default)
DB_TYPE="sqlite"
DB_FILE="database/blue_bird.db"
DATABASE_URL="sqlite:database/blue_bird.db"

# PostgreSQL (Remote or local)
# DB_TYPE="postgres"
# DATABASE_URL="postgresql://postgres:password@localhost:5432/blue_bird?schema=public"

# MySQL (Remote or local)
# DB_TYPE="mysql"
# DATABASE_URL="mysql://root:password@localhost:3306/blue_bird"
```

#### Usage Examples

```javascript
import { Database, DB_TYPE } from "@seip/blue-bird/core/database.js";

// Instantiate the database connection pool or SQLite instance
const connection = new Database(20);

// 1. Basic SELECT query returning single row (Works for SQLite, MySQL, and PostgreSQL using ? placeholders)
const user = await connection.query("SELECT * FROM users WHERE email = ?", ["test@example.com"], "return_row");

// 2. Fetch rows with 60 seconds Redis caching enabled
const stats = await connection.query("SELECT COUNT(*) as count FROM access_logs", [], { cache: 60 });

// 3. INSERT query (returns insertId / lastInsertRowid across SQLite, MySQL, and PostgreSQL)
const newId = await connection.query("INSERT INTO users (name) VALUES (?)", ["John"]);

// 4. Automatic SQL Query Pagination (Runs count query + LIMIT/OFFSET calculation)
const paginated = await connection.paginate(
  "SELECT * FROM users WHERE status = ?",
  ["active"],
  { page: 1, limit: 10, cache: 60 }
);

// 5. Atomic Database Transactions with Automatic Commit & Rollback (uses BEGIN IMMEDIATE for SQLite)
const txUserId = await connection.transaction(async (tx) => {
  const userId = await tx.query("INSERT INTO users (name, email) VALUES (?, ?)", ["Alice", "alice@example.com"]);
  await tx.query("INSERT INTO profiles (user_id) VALUES (?, ?)", [userId]);
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

## 🛠️ Developer Tooling & CLI Suite

Blue Bird includes built-in developer productivity commands:

```bash
# System Diagnostics & Smoke Testing
npx blue-bird doctor                 # Audits .env, ports, permissions, and runs live HTTP smoke test

# Route Scaffolding
npx blue-bird make:route <name>      # Generates full CRUD route with Validation & Cache invalidation
npx blue-bird make:route <name> -a   # Generates route with Auth.protect() middleware

# Database Migrations & Seeds
npx blue-bird make:migration <name>  # Creates timestamped SQL migration in database/migrations/
npx blue-bird migrate                # Executes pending migrations across SQLite, MySQL, or Postgres
npx blue-bird migrate:status         # Displays applied and pending migration batches
npx blue-bird make:seed <name>       # Creates SQL seed file in database/seeds/
npx blue-bird seed                   # Executes seed files in database/seeds/

# VPS Host Nginx & SSL Automation
npx blue-bird nginx:conf <domain> [port]  # Generates reverse proxy block & Certbot setup instructions
```

---

## 📬 Background Jobs & Queue (Queue)

Blue Bird includes a lightweight queue worker (`core/queue.js`) backed by Redis with an automatic in-memory fallback for local development or non-redis architectures:

```javascript
import Queue from "@seip/blue-bird/core/queue.js";

// 1. Register job processor
Queue.process("sendWelcomeEmail", async (payload) => {
  console.log(`Sending email to ${payload.email}...`);
});

// 2. Dispatch job from route or service
await Queue.dispatch("sendWelcomeEmail", { email: "user@example.com" });
```

---

## Docker CLI Workflow

Blue Bird comes with a built-in Docker CLI wrapper that handles both local development database bootstrapping and full-stack VPS production deployments across MySQL, PostgreSQL, or no-database architectures.

### Commands Syntax:

```bash
npx blue-bird docker <command> [options]
```

### Supported Actions:

- **`npx blue-bird docker dev`**: Boots the development database and Redis containers. Run `npm run dev` locally on your host machine.
- **`npx blue-bird docker start`**: Boots the production stack (Node.js App + Nginx + Database + Redis) and runs the automatic health smoke test.
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

---

### 🛡️ Production VPS Security & Permissions Hardening Guide

When deploying Blue Bird to a Linux VPS (Ubuntu, Debian, AlmaLinux, Rocky Linux), file permissions must strictly balance **least-privilege security** (preventing unauthorized read/write access to sensitive files) with **container accessibility** (allowing unprivileged container users like `nginx` to read static assets).

> [!CAUTION]
> **Never use `chmod -R 777` in production!** Giving full write permissions to all users creates severe security vulnerabilities, allowing compromised processes or unauthorized local users to modify application code, inject backdoors, or tamper with `.env` secrets.

#### 1. Deployment Directory (Filesystem Hierarchy Standard)

* ❌ **Avoid deploying inside `/home/user/`**: Deploying in home directories introduces security risks in multi-user environments and frequently causes `403 Forbidden` / `stat() failed (13: Permission denied)` errors due to restrictive default parent directory permissions (`700`/`750`). Recklessly loosening `/home/user/` exposes user SSH keys and profile data.
* ✅ **Recommended Production Standard**: Deploy in dedicated Filesystem Hierarchy Standard (FHS) system directories:
  * `/var/www/<project-name>` (Standard for web applications and static content)
  * `/srv/<project-name>` (Alternative standard for site-specific payloads)

#### 2. Recommended Permissions & Ownership Matrix

| Target Directory / File | Mode | Ownership | Description & Security Rationale |
|---|---|---|---|
| **Project Root** (`/var/www/<project-name>`) | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Allows unprivileged container processes (`nginx` UID 101) to traverse down to the project tree. |
| **Static Frontend Dirs** (`frontend/`) | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Grants traversal and read access for Nginx static serving. |
| **Static Frontend Files** (`frontend/**/*`) | `644` (`-rw-r--r--`) | `$(whoami):$(whoami)` | Read-only access for web server worker processes. |
| **Node Module Dirs** (`node_modules/`) | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Standard directory access. Avoid blanket `chmod -R 755`. |
| **Node Module Files** (`node_modules/**/*`) | `644` (`-rw-r--r--`) | `$(whoami):$(whoami)` | Standard read-only permissions for non-binary dependencies. |
| **Executable Binaries** (`node_modules/.bin/`) | `+x` (`chmod -R +x`) | `$(whoami):$(whoami)` | Grants execution bit exclusively to CLI wrapper symlinks (`npx blue-bird`). |
| **Environment File** (`.env`) | `600` (`-rw-------`) | `$(whoami):$(whoami)` | Restricts database passwords, JWT secrets, and API keys exclusively to the owning user. Never `644` or `777`. |
| **Database Directory** (`database/` for SQLite) | `755` (dir) / `644` (file) | `$(whoami):$(whoami)` | Allows the Node.js application process inside the container to read and write WAL journal files. |

#### 3. Container-Level Hardening (Docker)

To enforce the principle of least privilege at the container boundary, explicitly mount static frontend assets in **read-only mode (`:ro`)** inside `docker-compose.yml` for the Nginx service:

```yaml
services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./frontend:/app/frontend:ro
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
```

This guarantees that even in the event of an Nginx worker compromise, static web assets cannot be overwritten or modified from within the container.

#### 4. Applying Secure Permissions on VPS

Run the following chained commands inside your VPS project directory:

```bash
# 1. Set project ownership to current deploy user
sudo chown -R $(whoami):$(whoami) /var/www/<project-name>
cd /var/www/<project-name>

# 2. Ensure parent directory traversal permissions
chmod 755 /var /var/www /var/www/<project-name>

# 3. Apply safe permissions for static frontend assets
find frontend -type d -exec chmod 755 {} +
find frontend -type f -exec chmod 644 {} +

# 4. Secure node_modules while preserving executable bits in .bin
find node_modules -type d -exec chmod 755 {} +
find node_modules -type f -exec chmod 644 {} +
chmod -R +x node_modules/.bin 2>/dev/null || true

# 5. Lock down environment credentials
chmod 600 .env

# 6. Set database directory permissions (for SQLite)
chmod 755 database 2>/dev/null || true
chmod 644 database/*.db 2>/dev/null || true
```

---

### 🔧 VPS Production Troubleshooting (Problems & Solutions)

#### 1. Static Assets Return 404 / 403 (`Permission denied`)
* **Symptom:** Opening pages returns 404 or missing CSS/JS (e.g. `/css/bluebird.css`, `/favicon.ico`), and `docker compose logs -f nginx` reports:
  ```text
  [crit] stat() "/app/frontend/css/bluebird.css" failed (13: Permission denied)
  ```
* **Cause:** The Nginx container runs as an unprivileged user (`nginx`, UID 101 on Alpine). If parent directories lack traversal (`+x`) permissions, or files lack read (`+r`) permissions, Nginx is blocked from reading `/app/frontend`.
* **Solution:**
  ```bash
  # Grant traversal and read permissions:
  chmod 755 /var/www/<project-name>
  find frontend -type d -exec chmod 755 {} +
  find frontend -type f -exec chmod 644 {} +
  ```

#### 2. `npx blue-bird` fails with `sh: 1: blue-bird: Permission denied`
* **Symptom:** Running CLI commands like `npx blue-bird docker stop` or `npx blue-bird docker start prod` fails with permission errors.
* **Cause:** An overly aggressive global `find . -type f -exec chmod 644` stripped execution permissions from binary wrappers and symlinks in `node_modules/.bin/`.
* **Solution:**
  ```bash
  chmod -R +x node_modules/.bin
  # Or rebuild native binaries:
  npm rebuild
  ```

#### 3. 404 Not Found after Folder Renaming or Moving (Docker Inode Desync)
* **Symptom:** Moving, replacing, or recreating the project folder (e.g. `mv project_old project` or `git clone` / `rm -rf`) while Docker containers were running leads to persistent 404 errors even though files exist on disk.
* **Cause:** Linux file descriptors and Docker volume mounts bind to disk **inodes**. When a directory is deleted and recreated, Docker mounts remain attached to the stale/dead inode until the container stack is restarted.
* **Solution:**
  ```bash
  docker compose down
  docker compose up -d
  # Or with Blue Bird CLI:
  npx blue-bird docker stop
  npx blue-bird docker start prod
  ```

#### 4. Real-time Container Diagnostics
* **Inspect Nginx logs in real time:**
  ```bash
  docker compose logs -f nginx
  ```
* **Test file visibility directly as the Nginx container user:**
  ```bash
  docker exec -it <container_name>-nginx su -s /bin/sh nginx -c "ls -la /app/frontend/css/bluebird.css"
  ```
* **Inspect path traversal permissions on host:**
  ```bash
  namei -l /var/www/<project-name>/frontend/css/bluebird.css
  ```

---

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
