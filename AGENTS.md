# Blue Bird Framework - AI Agent Guide

This document serves as the primary manual for any AI Agent interacting with the codebase. It details the architecture of Blue Bird, its internal modules, and how features should be written or modified.

## 1. Core Architecture

Blue Bird is a performance-first API framework built on **Express**. It saves developers from repetitive configuration, validation, security, JWT authentication, and database environment configuration out of the box, delegating all static frontend rendering to Nginx.

- **Entrypoint (`backend/index.js`)**: Initializes the server using `App` from `core/app.js` and registers the routes.
- **Backend (`backend/`)**: Application routes and logic (e.g. `backend/routes/`).
- **Frontend (`frontend/`)**: Static assets (HTML, CSS, JS). Handled directly by Nginx in production, bypassing Express.
- **Core (`core/`)**: The framework core. Contains wrapper classes such as `Router`, `Validator`, `Auth`, `Cache`, etc. **DO NOT MODIFY** the core unless explicitly requested, as it could break other apps.

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
- Nginx: Serves static files directly from `frontend/` (stripping `.html` extensions) and blocks common scanner requests (`.env`, `.git`, etc.) with fallback to Express for APIs.
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

## 11. AI Development Guidelines

1. **Frontend**: Static files are stored in `frontend/` (e.g. `frontend/css`, `frontend/js`). HTML files will be served without the `.html` extension (e.g. `login.html` is accessible as `/login`).
2. **JSON Responses**: API endpoints should return standardized responses formatted as `{ message: "..." }` or `{ data: ... }`.
3. **Magic Imports**: Stick to pure relative imports or well-configured aliases (imports natively resolve from `@seip/blue-bird/...` or relative directories like `../../`).
4. **No inline comments**: Only use JSDoc for documentation.

## 12. Database Module (database.js)

Blue Bird provides a unified wrapper class (`core/database.js`) supporting **SQLite (`better-sqlite3`)**, **MySQL (`mysql2/promise`)**, and **PostgreSQL (`pg`)**. It features connection pooling/reconnection, automatic retries on startup, query formatting, and built-in Redis query caching:


- **Dynamic Initialization:** When `npx blue-bird` (`core/cli/init.js`) runs, it prompts the developer for the database type (`sqlite` [default], `mysql`, `postgres`, `none`). It then intelligently copies the correct `docker-compose.yml` template (`docker-compose.sqlite.yml`, `docker-compose.mysql.yml`, `docker-compose.postgres.yml`, or `docker-compose.none.yml`) and configures `.env` with `DB_TYPE`, `DB_FILE`, and `DATABASE_URL`.
- **SQLite Concurrency & WAL:** SQLite automatically runs with `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`, and `PRAGMA foreign_keys = ON;` to eliminate "database is locked" errors and ensure high concurrency with readers and writers.
- **Parameter Placeholders:** Supports `?` placeholders across all drivers (automatically translated to `$1, $2, ...` under the hood for PostgreSQL).

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

## 11. Nginx Static Asset Caching

In production, Nginx is configured to explicitly cache static assets (`.js`, `.css`, `.jpg`, `.png`, etc.) in the user's browser with the `Cache-Control` header (valid for 1 month). 
HTML and API endpoints (`/api/*`) are not cached by Nginx to ensure they serve dynamic and up-to-date content, relying instead on the Node.js application and Redis for data-layer caching.

## 13. VPS Permissions & Security Hardening

When deploying Blue Bird to Linux VPS servers using Docker Compose orchestration:

### 1. FHS Deployment Standard
- **Avoid deploying inside `/home/user/`**: User home directories often enforce restrictive traversal permissions (`700`/`750`) or risk cross-user privilege escalation in multi-tenant environments.
- **Production Standard**: Always deploy in standard Filesystem Hierarchy Standard (FHS) locations:
  - `/var/www/<project-name>` (Recommended for web applications)
  - `/srv/<project-name>` (Alternative for site-specific service payloads)

### 2. Permissions & Ownership Matrix

| Path / Target | Recommended Mode | Ownership | Description & Rationale |
|---|---|---|---|
| `/var/www/<project-name>` | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Allows unprivileged Nginx container (`UID 101`) path traversal. |
| `frontend/` (directories) | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Directory traversal for static web workers. |
| `frontend/` (files) | `644` (`-rw-r--r--`) | `$(whoami):$(whoami)` | Public read access for Nginx static serving. |
| `node_modules/` | Dirs `755`, Files `644` | `$(whoami):$(whoami)` | Strict security. Avoid blanket `chmod -R 755`. |
| `node_modules/.bin/` | `+x` (`chmod -R +x`) | `$(whoami):$(whoami)` | Preserves execution bits for CLI binaries and symlinks. |
| `.env` | `600` (`-rw-------`) | `$(whoami):$(whoami)` | Strict isolation for database credentials and JWT keys. Never `777`. |
| `database/` (SQLite) | Dir `755`, Files `644` | `$(whoami):$(whoami)` | Allows Node.js application process to read/write WAL journals. |

### 3. Container-Level Hardening (Docker)
- Mount static assets as **read-only (`:ro`)** in `docker-compose.yml` for the Nginx service (e.g. `./frontend:/app/frontend:ro` or `/var/www/<project-name>/frontend:/app/frontend:ro`).
- Enforces the principle of least privilege: the web server worker cannot write or overwrite host assets even if compromised.

### 4. Production Hardening Commands

```bash
# 1. Set project ownership to current deploy user
sudo chown -R $(whoami):$(whoami) /var/www/<project-name>
cd /var/www/<project-name>

# 2. Ensure parent directory traversal permissions
chmod 755 /var /var/www /var/www/<project-name>

# 3. Set directory (755) and file (644) permissions for static frontend assets
find frontend -type d -exec chmod 755 {} +
find frontend -type f -exec chmod 644 {} +

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
  - Fix: `chmod 755 /var/www/<project-name> && find frontend -type d -exec chmod 755 {} + && find frontend -type f -exec chmod 644 {} +`
* **`sh: 1: blue-bird: Permission denied` on CLI:**
  - Cause: Blanket `chmod 644` stripped execution permissions from binary links in `node_modules/.bin/`.
  - Fix: `chmod -R +x node_modules/.bin` (or `npm rebuild`)
* **Docker Inode Desync (404 after `mv` / `rm -rf` directory):**
  - Cause: Docker volume bind mounts bind to Linux filesystem inodes. Recreating the folder desynchronizes active mounts.
  - Fix: `npx blue-bird docker stop && npx blue-bird docker start prod` (or `docker compose down && docker compose up -d`)
* **Real-time Diagnostics:**
  - Nginx log stream: `docker compose logs -f nginx`
  - Container visibility check: `docker exec -it <container_name>-nginx su -s /bin/sh nginx -c "ls -la /app/frontend"`
  - Host path traversal audit: `namei -l /var/www/<project-name>/frontend/css/bluebird.css`

---

_This file can be retrieved by intelligent agents reading its absolute physical path during reasoning._
