# Blue Bird Framework - AI Agent Guide

This document serves as the primary manual for any AI Agent interacting with the codebase. It details the architecture of Blue Bird v2, its internal modules, and how features should be written or modified.

## 1. Core Architecture

Blue Bird is a performance-first web and API framework built on **Express** (Node.js 22+). It provides JWT auth, HTML rendering with multi-level caching, validation, database access, and queue processing out of the box.

- **Entrypoint (`app/index.js`)**: Initializes the server using `App` from `core/app.js` and registers the routes.
- **Application (`app/`)**: Application code — `app/routes/` (API + web), `app/views/` (HTML templates), `app/jobs/` (background workers).
- **Public assets (`public/`)**: Static files only (CSS, JS, images, fonts). Served directly by Nginx in Docker. Express also serves `public/` as a fallback for standalone mode.
- **Core (`core/`)**: The framework core. Contains `Router`, `Render`, `Validator`, `Auth`, `Cache`, `Database`, `Hash`, etc. **DO NOT MODIFY** the core unless explicitly requested.

## 2. Routing (Router)

Do not use Express' native router (`express.Router()`). Always use Blue Bird's `Router` wrapper.

```javascript
import Router from "@seip/blue-bird/core/router.js";

const routerApi = new Router("/api");

routerApi.get("/users", (req, res) => {
  res.json({ users: [] });
});

export default routerApi;
```



Incoming request data must be validated using `core/validate.js`, which automatically returns HTTP 400 JSON responses on error.

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

## 5. Authentication & Password Hashing (Auth & Hash)

### Password Hashing (Hash)

Blue Bird includes native password hashing using `node:crypto.scrypt` with random salt and timing-safe comparison (zero external npm dependencies required). It also seamlessly supports `bcrypt` when installed or verifying `$2a$/$2b$` hashes.

```javascript
import Hash from "@seip/blue-bird/core/hash.js";

// Hash password with scrypt (default)
const hash = await Hash.make("mySecretPassword");

// Verify password
const isValid = await Hash.verify("mySecretPassword", hash);

// Hash with bcrypt (if 'bcrypt' package is installed)
const bcryptHash = await Hash.make("mySecretPassword", { driver: "bcrypt" });
```

### JWT Handling (Auth)

The system includes built-in JWT handling with AES-256-GCM encryption. The framework handles tokens via Cookies or the `Authorization` header.

#### Protecting Routes

Use `Auth.protect()` as a middleware to secure routes.

```javascript
import Auth from "@seip/blue-bird/core/auth.js";

router.get("/profile", Auth.protect(), (req, res) => {
  res.json({ user: req.user });
});
```

#### Login and Logout

The `Auth` class provides helpers to handle session management via cookies.

```javascript
router.post("/login", async (req, res) => {
  const user = { id: 1, name: "John" };
  await Auth.login(res, user);
  res.ok(user, "Logged in");
});

router.post("/logout", async (req, res) => {
  await Auth.logout(res);
  res.ok(null, "Logged out");
});
```

## 6. HTTP Response Helpers & Health Check

Blue Bird decorates the Express `res` object with standardized helper methods:

```javascript
// Success responses
res.ok(data, "Success message");            // HTTP 200 { status: "success", message, data }
res.created(data, "Created successfully");  // HTTP 201 { status: "success", message, data }
res.paginate(items, pagination, "Fetched"); // HTTP 200 { status: "success", message, data, pagination }

// Error responses
res.badRequest("Invalid input", errors);    // HTTP 400 { status: "error", message, errors }
res.unauthorized("Authentication required");// HTTP 401 { status: "error", message }
res.forbidden("Access denied");             // HTTP 403 { status: "error", message }
res.notFound("Resource not found");         // HTTP 404 { status: "error", message }
res.serverError("Internal failure", err);   // HTTP 500 { status: "error", message }
```

### Built-in Health Endpoint

Every Blue Bird application provides a native `/api/health` endpoint out of the box returning system uptime, timestamp, environment, and memory consumption.

## 7. Performance Caching (Cache)

Configure caching via `CACHE_MODE` in `.env`:
- `CACHE_MODE="memory"`: Fast local RAM cache inside Node.js (default when Redis is not used). Zero network overhead.
- `CACHE_MODE="redis"`: Distributed cache across containers with automatic fallback to memory if Redis is unavailable.
- `CACHE_MODE="none"`: Caching disabled.

```javascript
import Cache from "@seip/blue-bird/core/cache.js";

// Express route middleware caching
router.get("/stats", Cache.middleware(60), (req, res) => {
  res.ok({ usersCount: 150 });
});

// Programmatic cache manipulation
await Cache.set("custom_key", { data: "value" }, 120);
const cachedData = await Cache.get("custom_key");

// Invalidate route cache manually (e.g. after updating DB)
await Cache.delete("/api/public/config");
```

## 8. On-Demand Modules & CLI Add

To keep `node_modules` lightweight, optional modules load dynamically on-demand. Install them easily via:

```bash
npx blue-bird add upload      # Installs multer for file uploads
npx blue-bird add ws          # Installs ws for WebSockets
npx blue-bird add redis       # Installs redis for caching/sessions
npx blue-bird add sqlite      # Installs better-sqlite3
npx blue-bird add mysql       # Installs mysql2
npx blue-bird add postgres    # Installs pg
npx blue-bird add bcrypt      # Installs bcrypt
npx blue-bird add swagger     # Installs swagger-ui-express
```

## 9. Security (Helmet)

Helmet is **not applied globally** by default. Apply it per-router where needed:

```javascript
import App from "@seip/blue-bird/core/app.js";

const apiRouter = new Router("/api");
apiRouter.use(App.helmet());
```


## 10. Docker Compose CLI

Blue Bird features a built-in Docker Compose CLI wrapper (`core/cli/docker.js`) to deploy and manage containerized development databases and production stacks across SQLite (default), MySQL, PostgreSQL, or no-database (`none`) architectures.

Production deployments always use Docker for orchestration, running:
- Nginx: Serves static files directly from `public/` and blocks common scanner requests (`.env`, `.git`, etc.) with fallback to Express for HTML views and APIs.
- Node.js App: Managed via PM2 in cluster mode using `PM2_INSTANCES` configuration (defaults to `1`, can be set to `max`).
- Database: SQLite (default, embedded in app with volume `./database`), MySQL (`mysql:8.0`), or PostgreSQL (`postgres:18-alpine`), dynamically detected via `getDbType()` reading `DB_TYPE` / `DATABASE_URL` from `.env`.
- Redis: Memory caching and session store.

```bash
# Manage containers using blue-bird CLI
npx blue-bird docker dev            # Starts development database & redis containers. Run npm run dev manually.
npx blue-bird docker start          # Starts production app stack (DB/SQLite, redis, app, nginx)
npx blue-bird docker start db       # Starts configured database container (or Redis if SQLite is used)
npx blue-bird docker start redis    # Starts Redis container only
npx blue-bird docker start dbs      # Starts database containers (configured DB + Redis)
npx blue-bird docker stop           # Stops all running containers
npx blue-bird docker build          # Builds/rebuilds application image
npx blue-bird docker ps             # Shows status of active containers
npx blue-bird docker logs           # Tails Node.js app container logs
npx blue-bird docker logs db        # Tails database container logs (or app logs if SQLite is used)
npx blue-bird docker pm2 [args]     # Runs PM2 commands inside the app container (e.g. status, monit)
npx blue-bird docker db             # Inspects active database (SQLite query/tables, psql for Postgres, mysql for MySQL)
npx blue-bird docker sqlite         # Inspects SQLite tables or runs query on configured .db file
npx blue-bird docker psql           # Runs interactive PostgreSQL client terminal inside container
npx blue-bird docker mysql          # Runs interactive MySQL client terminal inside container
npx blue-bird docker redis          # Runs interactive Redis client terminal inside container
npx blue-bird docker export         # Exports database backup (.db file for SQLite or .sql dump) into backups/
npx blue-bird docker import         # Restores database backup (.db or .sql) from backups/
npx blue-bird docker prune          # Cleans unused volumes, dangling images, and BuildKit caches
```

The container names and virtual networks are namespaced by the `TITLE` environment variable parsed from `.env` to prevent resource collisions on VPS hosts. Alternatively, PM2 and other services can be run manually in standalone server environments by configuring `DATABASE_URL` inside `.env`.

## 11. Productivity & Developer Tooling CLI

```bash
# System Diagnostics & Smoke Test
npx blue-bird doctor                # Audits .env, ports, permissions, and runs live HTTP smoke test

# Route Scaffolding
npx blue-bird make:route <name>     # Generates full CRUD route with Validation & Cache invalidation
npx blue-bird make:route <name> -a  # Generates route with Auth.protect() middleware

# Database Migrations & Seeds
npx blue-bird make:migration <name> # Creates timestamped SQL migration in database/migrations/
npx blue-bird migrate               # Executes pending migrations across SQLite, MySQL, or Postgres
npx blue-bird migrate:status        # Displays applied and pending migration batches
npx blue-bird make:seed <name>      # Creates SQL seed file in database/seeds/
npx blue-bird seed                  # Executes seed files in database/seeds/

# VPS Host Nginx & SSL Automation (Auto-resolves APP_URL & PORT from .env if omitted)
npx blue-bird nginx:conf [domain] [port]
```

## 12. Background Jobs & Queue (Queue)

Blue Bird includes a lightweight queue worker (`core/queue.js`) backed by Redis with an automatic in-memory fallback for local development or non-redis architectures.

```javascript
import Queue from "@seip/blue-bird/core/queue.js";

// 1. Register job processor
Queue.process("sendWelcomeEmail", async (payload) => {
  console.log(`Sending email to ${payload.email}...`);
});

// 2. Dispatch job from route or service
await Queue.dispatch("sendWelcomeEmail", { email: "user@example.com" });
```

## 13. AI Development Guidelines

1. **Assets & Views**: Static assets are stored in `public/` (e.g. `public/css`, `public/js`). HTML views are stored in `app/views/` and served via `Render` (`Render.view()`, `Render.send()`).
2. **JSON Responses**: API endpoints should return standardized responses formatted as `{ message: "..." }` or `{ data: ... }`.
3. **Magic Imports**: Stick to pure relative imports or well-configured aliases (imports natively resolve from `@seip/blue-bird/...` or relative directories like `../../`).
4. **No inline comments**: Only use JSDoc for documentation.

## 14. Database Module (database.js)

Blue Bird provides a unified wrapper class (`core/database.js`) supporting **SQLite (native `node:sqlite` in Node 22+ with `better-sqlite3` fallback)**, **MySQL (`mysql2/promise`)**, and **PostgreSQL (`pg`)**. It features connection pooling/reconnection, automatic retries on startup, query formatting, and built-in Redis query caching:


- **Dynamic Initialization:** When `npx blue-bird` (`core/cli/init.js`) runs, it prompts the developer for the database type (`sqlite` [default], `mysql`, `postgres`, `none`). It then intelligently copies the correct `docker-compose.yml` template (`docker-compose.sqlite.yml`, `docker-compose.mysql.yml`, `docker-compose.postgres.yml`, or `docker-compose.none.yml`) and configures `.env` with `DB_TYPE`, `DB_FILE`, and `DATABASE_URL`.
- **SQLite Concurrency & WAL:** SQLite automatically runs with `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, and `PRAGMA foreign_keys = ON;` to eliminate "database is locked" errors and ensure high concurrency with readers and writers.
- **Parameter Placeholders:** Supports `?` placeholders across all drivers (automatically translated to `$1, $2, ...` under the hood for PostgreSQL).
- **Docker & SQLite Compilation:** In Node.js 22+, Blue Bird leverages native `node:sqlite` directly from the runtime, eliminating native compilation overhead and external dependencies. If your application explicitly installs and uses `better-sqlite3`, Alpine Linux requires build tools (`python3`, `make`, `g++`) for `node-gyp rebuild` in `docker/Dockerfile`:
```dockerfile
# Required ONLY when using better-sqlite3 on Alpine (not needed with native node:sqlite):
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    npm install -g pm2 && \
    apk del python3 make g++
```
With the native `node:sqlite` driver, this is **not necessary** and standard `RUN npm ci --omit=dev && npm install -g pm2` works out of the box.

```javascript
import { Database, DB_TYPE } from "@seip/blue-bird/core/database.js";

const connection = new Database(20);

// Basic SELECT query returning single row (Supports SQLite, MySQL, and PostgreSQL)
const user = await connection.query("SELECT * FROM users WHERE id = ?", [1], "return_row");

// Query caching in Redis (stores results in Redis for 60 seconds)
const stats = await connection.query("SELECT COUNT(*) as cnt FROM logs", [], { cache: 60 });

// INSERT query returns insertId directly (or row ID in SQLite / Postgres)
const newUserId = await connection.query("INSERT INTO users (name) VALUES (?)", ["Alice"]);

// Pagination helper
const page = await connection.paginate("SELECT * FROM users ORDER BY id ASC", [], { page: 1, limit: 10 });

// Safe Transactions
await connection.transaction(async (tx) => {
  const id = await tx.query("INSERT INTO users (name) VALUES (?)", ["Bob"]);
  await tx.query("INSERT INTO profiles (user_id) VALUES (?)", [id]);
});
```

## 15. Nginx Static Asset Caching & Routing

In production, Nginx serves **static assets** (`public/`) directly with `Cache-Control: max-age=2592000, immutable` (1 month).

**HTML pages are NOT served by Nginx.** All page routes fall through to Express via the `@node_app` proxy location. `Render.send()` handles caching at the application layer.

- `Render` caches the raw HTML template (not the interpolated result) so dynamic data (`{{key}}` placeholders) is always fresh.
- In single-instance mode, only in-memory LRU is used.
- In multi-instance mode (`PM2_INSTANCES > 1`), Redis is used as L2. If Redis is unavailable, file cache (`app/cache/`) is used as L3 fallback.

## 16. HTML Rendering (Render)

Blue Bird includes a native HTML render engine (`core/render.js`) for serving HTML pages with optional template interpolation.

```javascript
import Render from "@seip/blue-bird/core/render.js";
import Auth from "@seip/blue-bird/core/auth.js";
import Router from "@seip/blue-bird/core/router.js";

const web = new Router("/");

web.get("/", Render.view("index"));

web.get("/about", Render.cache(300), Render.view("about", { company: "Blue Bird" }));

web.get("/dashboard", Auth.protect({ redirect: "/login" }), async (req, res) => {
  await Render.send(res, "dashboard", { user: req.user });
});

await Render.invalidate("index");
```

Template syntax (`app/views/index.html`):
- `{{key}}` — HTML-escaped interpolation (XSS-safe)
- `{{{key}}}` — Raw (unescaped) interpolation

**EJS support** is opt-in: install `ejs` with `npx blue-bird add ejs`, then name views `.ejs` instead of `.html`.

## 17. Nginx Architecture

When deploying Blue Bird to Linux VPS servers using Docker Compose orchestration:

### 1. FHS Deployment Standard
- **Avoid deploying inside `/home/user/`**: User home directories often enforce restrictive traversal permissions (`700`/`750`) or risk cross-user privilege escalation in multi-tenant environments.
- **Production Standard**: Always deploy in standard Filesystem Hierarchy Standard (FHS) locations:
  - `/var/www/<project-name>` (Recommended for web applications)
  - `/srv/<project-name>` (Alternative for site-specific service payloads)

| Path / Target | Recommended Mode | Ownership | Description & Rationale |
|---|---|---|---|
| `/var/www/<project-name>` | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Allows unprivileged Nginx container (`UID 101`) path traversal. |
| `public/` (directories) | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Directory traversal for Nginx static file serving. |
| `public/` (files) | `644` (`-rw-r--r--`) | `$(whoami):$(whoami)` | Public read access for Nginx static serving. |
| `app/cache/` | Dir `755`, Files `644` | `$(whoami):$(whoami)` | Writable by Node.js for file-based render cache fallback. |
| `node_modules/` | Dirs `755`, Files `644` | `$(whoami):$(whoami)` | Strict security. Avoid blanket `chmod -R 755`. |
| `node_modules/.bin/` | `+x` (`chmod -R +x`) | `$(whoami):$(whoami)` | Preserves execution bits for CLI binaries and symlinks. |
| `.env` | `600` (`-rw-------`) | `$(whoami):$(whoami)` | Strict isolation for database credentials and JWT keys. Never `777`. |
| `database/` (SQLite) | Dir `755`, Files `644` | `$(whoami):$(whoami)` | Allows Node.js application process to read/write WAL journals. |

### 3. Container-Level Hardening (Docker)
- Mount static assets as **read-only (`:ro`)** in `docker-compose.yml` for the Nginx service (e.g. `./public:/app/public:ro`).
- Nginx only has access to `public/`. HTML pages are served by Express via `@node_app` proxy fallback.
- Enforces the principle of least privilege: the web server worker cannot write or overwrite host assets even if compromised.

### 4. Production Hardening Commands

```bash
# 1. Set project ownership to current deploy user
sudo chown -R $(whoami):$(whoami) /var/www/<project-name>
cd /var/www/<project-name>

# 2. Ensure parent directory traversal permissions
chmod 755 /var /var/www /var/www/<project-name>

# 3. Set directory (755) and file (644) permissions for static assets
find public -type d -exec chmod 755 {} +
find public -type f -exec chmod 644 {} +

# 4. Secure node_modules while preserving executable bits in .bin
find node_modules -type d -exec chmod 755 {} +
find node_modules -type f -exec chmod 644 {} +
chmod -R +x node_modules/.bin 2>/dev/null || true

# 5. Restrict environment credentials strictly to owner
chmod 600 .env

# 6. Set database permissions (for SQLite)
chmod 755 database 2>/dev/null || true
chmod 644 database/*.db 2>/dev/null || true
```

### 5. Failure Modes & Remediation Playbook
* **Error 13: Permission Denied on static assets (`stat() failed (13: Permission denied)`):**
  - Cause: Nginx worker (`UID 101`) lacks path traversal (`+x`) or read (`+r`) permissions.
  - Fix: `chmod 755 /var/www/<project-name> && find public -type d -exec chmod 755 {} + && find public -type f -exec chmod 644 {} +`
* **`sh: 1: blue-bird: Permission denied` on CLI:**
  - Cause: Blanket `chmod 644` stripped execution permissions from binary links in `node_modules/.bin/`.
  - Fix: `chmod -R +x node_modules/.bin` (or `npm rebuild`)
* **Docker Inode Desync (404 after `mv` / `rm -rf` directory):**
  - Cause: Docker volume bind mounts bind to Linux filesystem inodes. Recreating the folder desynchronizes active mounts.
  - Fix: `npx blue-bird docker stop && npx blue-bird docker start prod` (or `docker compose down && docker compose up -d`)
* **Real-time Diagnostics:**
  - Nginx log stream: `docker compose logs -f nginx`
  - Container visibility check: `docker exec -it <container_name>-nginx su -s /bin/sh nginx -c "ls -la /app/public"`
  - Host path traversal audit: `namei -l /var/www/<project-name>/public/css/style.css`

---

_This file can be retrieved by intelligent agents reading its absolute physical path during reasoning._
