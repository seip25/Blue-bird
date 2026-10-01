# Blue Bird Framework

**Performance-first Node.js API and web framework with built-in JWT auth, HTML rendering, validation, and multi-level caching.**

[![npm version](https://img.shields.io/npm/v/@seip/blue-bird.svg)](https://www.npmjs.com/package/@seip/blue-bird)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)

---

## Introduction

Blue Bird is an opinionated, high-performance web and API framework built on Express (Node.js 22+). It combines native template rendering, multi-layer caching, AES-256-GCM encrypted JWT authentication, validation schemas, background queues, and container orchestration into a cohesive developer experience.

In Blue Bird v2:
- Static assets are strictly separated into `public/`, served directly by Nginx in Docker with aggressive browser caching.
- HTML views are stored in `app/views/` and rendered dynamically by Express via the built-in `Render` engine, enabling route-level authentication, validation, and multi-level caching.
- Express serves `public/` as a built-in fallback, ensuring that a single codebase runs seamlessly across Docker, standalone PM2, and local development.
- Native `node:sqlite` is used in Node.js 22+, eliminating native compilation overhead while retaining `better-sqlite3` as an on-demand fallback.
- Native `node:crypto` powers HMAC-SHA256 JWT signatures and AES-256-GCM payload encryption, removing external dependencies.

---

## Architecture Overview

### Decoupled Static Assets and Server-Side Views

```
Client Request
      │
      ├────────► Nginx (Port 80/443)
      │               │
      │               ├─► /css/*, /js/*, /images/* ──► Directly from public/ (Disk Cache)
      │               │
      │               └─► Page routes & /api/* ─────► Reverse Proxy to Node.js / Express (@node_app)
      │                                                     │
      └────────────────────────────────────────► Express (Port 3000)
                                                            ├─► App static fallback (public/)
                                                            ├─► HTML Render Engine (app/views/)
                                                            │     ├─ L1: Memory LRU
                                                            │     ├─ L2: Redis (multi-instance)
                                                            │     └─ L3: File Cache (app/cache/)
                                                            └─► REST API (app/routes/)
```

- **Static Assets (`public/`)**: CSS, client JavaScript, images, and fonts. In Docker deployments, Nginx mounts `public/` as read-only (`:ro`) and serves assets directly with `Cache-Control: public, max-age=2592000, immutable`.
- **Application Code (`app/`)**: Route handlers (`app/routes/`), HTML templates (`app/views/`), background jobs (`app/jobs/`), and the entrypoint (`app/index.js`).
- **Framework Core (`core/`)**: Router, Render, Validator, Auth, Cache, Database, Queue, Logger, and CLI tooling.
- **Universal Portability**: Because Express serves `public/` when Nginx is not present, applications run identically in local development, standalone PM2 environments, and containerized Docker stacks.

---

## Quick Start

### 1. Requirements

- Node.js 22.0.0 or higher
- npm 10+
- Docker and Docker Compose (optional, for containerized deployments)

### 2. Installation and Initialization

```bash
npm install @seip/blue-bird
npx blue-bird
```

The interactive CLI will configure:
- Project title and port settings
- Database engine: `sqlite` (default, zero-configuration), `mysql`, `postgres`, or `none`
- Connection credentials and database paths
- Automatic generation of `.env`, `docker-compose.yml`, `app/`, and `public/`

### 3. Development Server

```bash
npm run dev
```

The server starts with Node's native file watcher (`--watch`) and loads `.env` automatically via `--env-file=.env`.

---

## Project Structure

```
project/
├── app/
│   ├── index.js             # Main server entrypoint
│   ├── routes/              # Application routes
│   │   ├── api.js           # REST API routes
│   │   └── web.js           # HTML page routes
│   ├── views/               # HTML and EJS templates
│   │   ├── index.html       # Public home view
│   │   ├── about.html       # Public about view
│   │   └── dashboard.html   # Authenticated dashboard view
│   ├── jobs/                # Background queue worker jobs
│   └── cache/               # File-based render cache fallback (auto-created)
├── public/                  # Static assets served directly by Nginx / Express
│   ├── css/                 # Custom CSS stylesheets
│   ├── js/                  # Custom client JavaScript files
│   └── images/              # Static images and icons
├── docker/                  # Production Dockerfile and Nginx configuration
├── docker-compose.yml       # Docker Compose service definition
├── AGENTS.md                # AI agent manual and architectural reference
├── jsconfig.json            # IDE path mapping and IntelliSense configuration
└── .env                     # Environment variables (git-ignored)
```

---

## Core Modules

### 1. Application Class (`App`)

Initializes the Express application with security defaults, compression, cookie parsing, body parsers, and route dispatching.

```javascript
import App from "@seip/blue-bird/core/app.js";
import routerWeb from "./routes/web.js";
import routerApi from "./routes/api.js";

const app = new App({
  port: process.env.PORT || 3000,
  host: process.env.HOST || "http://localhost",
  routes: [routerWeb, routerApi],
  cors: {},
  middlewares: [],
  logger: false,
  compression: true,
  cookieParser: true,
  static: {
    path: "public",
    options: {}
  }
});

app.run();
```

### 2. HTML Render Engine (`Render`)

Blue Bird features an integrated HTML render engine (`core/render.js`) designed for performance and flexibility.

#### Features
- Zero required dependencies for standard HTML rendering.
- Built-in placeholder interpolation with automatic XSS escaping (`{{key}}`) and raw output (`{{{key}}}`). Dot-notation keys such as `{{user.name}}` are fully supported.
- Multi-tier caching architecture:
  - `DEBUG=true`: Caching disabled. Templates are read fresh from disk on each request.
  - `DEBUG=false` and `PM2_INSTANCES=1`: In-memory LRU cache (`RENDER_CACHE_MAX=500`).
  - `DEBUG=false` and `PM2_INSTANCES>1`: Distributed Redis cache (L2) with automatic fallback to in-memory LRU (L1) and safe file caching in `app/cache/` (L3).
- Opt-in EJS support: Install `ejs` via `npx blue-bird add ejs` and name templates with the `.ejs` extension.

#### Route Definition Example

```javascript
import Router from "@seip/blue-bird/core/router.js";
import Render from "@seip/blue-bird/core/render.js";
import Auth from "@seip/blue-bird/core/auth.js";

const web = new Router("/");

// Public page with 5-minute cache
web.get("/", Render.cache(300), Render.view("index"));

// Public page with static template data
web.get("/about", Render.cache(300), Render.view("about", { company: "Blue Bird" }));

// Protected page: redirects unauthenticated users to /login
web.get("/dashboard", Auth.protect({ redirect: "/login" }), async (req, res) => {
  await Render.send(res, "dashboard", { user: req.user });
});

// Programmatic cache invalidation
await Render.invalidate("index");

export default web;
```

#### Template Syntax (`app/views/dashboard.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{title}}</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <h1>Welcome, {{user.name}}</h1>
  <div>{{{rawHtmlSnippet}}}</div>
</body>
</html>
```

### 3. Routing (`Router`)

Always use Blue Bird's `Router` wrapper instead of Express' native router to benefit from consistent route prefixing and middleware chaining.

```javascript
import Router from "@seip/blue-bird/core/router.js";

const api = new Router("/api");

api.get("/users", (req, res) => {
  res.ok({ users: [] }, "Users fetched successfully");
});

export default api;
```

### 4. Request Validation (`Validator`)

Validates request bodies and parameters against declarative JSON schemas. Returns structured HTTP 400 JSON errors automatically when validation fails.

```javascript
import Validator from "@seip/blue-bird/core/validate.js";

const userSchema = {
  email: { required: true, email: true },
  password: { required: true, min: 8 },
  name: { required: true, min: 2, max: 100 },
};

const validateUser = new Validator(userSchema, "en");

api.post("/users", validateUser.middleware(), (req, res) => {
  res.created({ id: 1 }, "User registered successfully");
});
```

### 5. Authentication and Password Hashing (`Auth` and `Hash`)

#### Password Hashing (`Hash`)

Provides native password hashing using `node:crypto.scrypt` with random salting and timing-safe equality verification (zero npm dependencies). Supports `bcrypt` when installed.

```javascript
import Hash from "@seip/blue-bird/core/hash.js";

// Hash using scrypt (default, zero dependencies)
const hash = await Hash.make("userPassword123");

// Verify password
const isValid = await Hash.verify("userPassword123", hash);

// Hash with bcrypt (if 'bcrypt' package is installed)
const bcryptHash = await Hash.make("userPassword123", { driver: "bcrypt", rounds: 10 });
```

#### Native JWT and Session Management (`Auth`)

Tokens are signed using HMAC-SHA256 and encrypted with AES-256-GCM via `node:crypto`. No external `jsonwebtoken` dependency is required.

```javascript
import Auth from "@seip/blue-bird/core/auth.js";

// Protect API endpoint (returns HTTP 401 JSON on unauthenticated request)
api.get("/profile", Auth.protect(), (req, res) => {
  res.ok({ user: req.user });
});

// Protect Web view (redirects to /login on unauthenticated request)
web.get("/account", Auth.protect({ redirect: "/login" }), Render.view("account"));

// User login: issues signed token, syncs session with Redis (if active), and sets HttpOnly cookie
api.post("/login", async (req, res) => {
  const user = { id: 1, name: "Alice", email: "alice@example.com" };
  await Auth.login(res, user, "auth", { expiresIn: "7d" });
  res.ok(user, "Logged in successfully");
});

// User logout: clears cookie and removes Redis session
api.post("/logout", async (req, res) => {
  await Auth.logout(res, "auth", {}, req);
  res.ok(null, "Logged out successfully");
});
```

### 6. Standardized HTTP Response Helpers

Blue Bird extends Express' `res` object with consistent response methods:

```javascript
// Success
res.ok(data, "Success message");            // HTTP 200 { status: "success", message, data }
res.created(data, "Created successfully");  // HTTP 201 { status: "success", message, data }
res.paginate(items, pagination, "Fetched"); // HTTP 200 { status: "success", message, data, pagination }

// Errors
res.badRequest("Validation failed", errors);// HTTP 400 { status: "error", message, errors }
res.unauthorized("Authentication required");// HTTP 401 { status: "error", message }
res.forbidden("Access denied");             // HTTP 403 { status: "error", message }
res.notFound("Resource not found");         // HTTP 404 { status: "error", message }
res.serverError("Internal failure", err);   // HTTP 500 { status: "error", message }
```

#### Health Endpoint (`/api/health`)

Every Blue Bird application provides an automatic `/api/health` endpoint reporting uptime, memory usage, environment, and status.

### 7. Performance Cache (`Cache`)

Configured via `CACHE_MODE` in `.env`:
- `CACHE_MODE="memory"`: Fast local in-memory cache with automatic TTL eviction.
- `CACHE_MODE="redis"`: Distributed cache across containers with memory fallback.
- `CACHE_MODE="none"`: Caching disabled.

```javascript
import Cache from "@seip/blue-bird/core/cache.js";

// Cache route output for 60 seconds
api.get("/metrics", Cache.middleware(60), (req, res) => {
  res.ok({ activeUsers: 142 });
});

// Programmatic manipulation
await Cache.set("item:1", { name: "Widget" }, 120);
const item = await Cache.get("item:1");
await Cache.delete("/api/metrics");
```

### 8. Database Layer (`Database`)

A unified database client (`core/database.js`) supporting SQLite, MySQL, and PostgreSQL with connection pooling, startup retries, unified parameter syntax, and Redis query caching.

- **SQLite**: Uses native `node:sqlite` in Node 22+, falling back to `better-sqlite3` on older runtimes. Configured with `PRAGMA journal_mode = WAL;`, `busy_timeout = 5000;`, and `synchronous = NORMAL;`.
- **MySQL**: Connection pool via `mysql2/promise`.
- **PostgreSQL**: Connection pool via `pg`. Parameter placeholders (`?`) are automatically converted to `$1, $2, ...` syntax.

```javascript
import { Database } from "@seip/blue-bird/core/database.js";

const db = new Database(20);

// Unified parameter syntax with ? placeholders across all engines
const user = await db.query("SELECT * FROM users WHERE id = ?", [1], "return_row");

// Redis query caching (stores result in Redis for 60 seconds)
const stats = await db.query("SELECT COUNT(*) AS total FROM orders", [], { cache: 60 });

// Transactions
await db.transaction(async (tx) => {
  const id = await tx.query("INSERT INTO orders (total) VALUES (?)", [99.95]);
  await tx.query("INSERT INTO audit_log (order_id) VALUES (?)", [id]);
});

// Pagination
const page = await db.paginate("SELECT * FROM products ORDER BY id DESC", [], { page: 1, limit: 20 });
```

### 9. Background Jobs and Queues (`Queue`)

Lightweight queue worker backed by Redis with an in-memory fallback:

```javascript
import Queue from "@seip/blue-bird/core/queue.js";

// Register processor
Queue.process("sendEmail", async (payload) => {
  console.log(`Sending email to ${payload.to}...`);
});

// Dispatch job
await Queue.dispatch("sendEmail", { to: "user@example.com" });
```

Job files in `app/jobs/*.js` exporting a default handler function are automatically registered on startup via `Queue.loadJobs()`.

---

## Blue Bird Design System (CDN)

Blue Bird provides an optional, modern CSS and UI helper bundle hosted on CDN:

```html
<!-- Blue Bird CSS (Minified) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@seip/blue-bird-css@latest/dist/bluebird.min.css" />

<!-- Blue Bird JavaScript UI Helper -->
<script src="https://cdn.jsdelivr.net/npm/@seip/blue-bird-css@latest/dist/bluebird.min.js" defer></script>
```

The CSS package is maintained independently at `@seip/blue-bird-css`, allowing projects to use the design system standalone or customize styling in `public/css/style.css`.

---

## CLI Developer Suite

Blue Bird includes an extensive command-line interface for development, scaffolding, and operations:

```bash
# Project Diagnostics
npx blue-bird doctor                 # Audits .env, ports, permissions, and runs live HTTP smoke test

# Route Scaffolding
npx blue-bird make:route <name>      # Generates full CRUD route in app/routes/
npx blue-bird make:route <name> -a   # Generates CRUD route with Auth.protect() middleware

# View Scaffolding
npx blue-bird make:view <name>       # Scaffolds an HTML view in app/views/
npx blue-bird make:view <name> --ejs # Scaffolds an EJS view in app/views/

# PM2 Ecosystem Scaffolding
npx blue-bird make:ecosystem         # Generates ecosystem.config.cjs with automatic worker detection

# Database Migrations and Seeds
npx blue-bird make:migration <name>  # Creates SQL migration in database/migrations/
npx blue-bird migrate                # Runs pending migrations
npx blue-bird migrate:status         # Displays applied and pending migration batches
npx blue-bird make:seed <name>       # Creates SQL seed file in database/seeds/
npx blue-bird seed                   # Runs seed files

# On-Demand Feature Installation
npx blue-bird add rate-limit         # Installs express-rate-limit
npx blue-bird add helmet             # Installs helmet
npx blue-bird add ejs                # Installs ejs
npx blue-bird add upload             # Installs multer
npx blue-bird add ws                 # Installs ws
npx blue-bird add redis              # Installs redis
npx blue-bird add sqlite             # Installs better-sqlite3
npx blue-bird add mysql              # Installs mysql2
npx blue-bird add postgres           # Installs pg
npx blue-bird add bcrypt             # Installs bcrypt
npx blue-bird add swagger            # Installs swagger-ui-express

# Host Nginx and SSL Automation
npx blue-bird nginx:conf [domain] [port]
```

---

## Deployment Strategies

### Strategy A: Docker Container Stack (Recommended for Production)

Orchestrated using the built-in Docker CLI wrapper:

- **Nginx**: Serves `public/` assets directly (`:ro` mount) and proxies all application routes to Express.
- **Node.js**: Runs under PM2 in cluster mode based on `PM2_INSTANCES` configuration.
- **Database**: SQLite (mounted `./database`), MySQL, or PostgreSQL.
- **SQLite in Docker (`node:sqlite` vs `better-sqlite3`)**: Node.js 22+ includes native `node:sqlite`, which is used automatically by Blue Bird with **zero native compilation** or extra build tools during `docker build`. If your project explicitly installs and uses `better-sqlite3`, Alpine Linux requires build tools (`python3`, `make`, `g++`) for `node-gyp rebuild` in `docker/Dockerfile`:
  ```dockerfile
  # Required ONLY if using better-sqlite3 on Alpine (not needed with native node:sqlite):
  RUN apk add --no-cache python3 make g++ && \
      npm ci --omit=dev && \
      npm install -g pm2 && \
      apk del python3 make g++
  ```
  With the native `node:sqlite` driver, this step is **not necessary**.
- **Redis**: Caching and distributed sessions.

```bash
# Start production container stack
npx blue-bird docker start

# Tail application logs
npx blue-bird docker logs

# Interactive database terminal
npx blue-bird docker db

# Export database backup
npx blue-bird docker export

# Stop all containers
npx blue-bird docker stop
```

### Strategy B: Standalone PM2 (Without Docker)

For environments running Node.js directly on a virtual private server:

```bash
# 1. Generate the PM2 ecosystem configuration
npx blue-bird make:ecosystem

# 2. Start PM2 cluster
pm2 start ecosystem.config.cjs

# 3. Monitor
pm2 status
pm2 logs
```

---

## Production Security and VPS Hardening

When deploying to Linux VPS servers (Ubuntu, Debian, AlmaLinux), apply standard Filesystem Hierarchy Standard (FHS) locations:
- Deploy to `/var/www/<project-name>` (Recommended) or `/srv/<project-name>`.
- Avoid deploying inside `/home/user/` to prevent directory traversal permission conflicts.

### Recommended Permissions Matrix

| Target | Mode | Ownership | Security Rationale |
|---|---|---|---|
| `/var/www/<project-name>` | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Allows unprivileged Nginx container (`UID 101`) directory traversal. |
| `public/` (directories) | `755` (`drwxr-xr-x`) | `$(whoami):$(whoami)` | Traversal access for Nginx static serving. |
| `public/` (files) | `644` (`-rw-r--r--`) | `$(whoami):$(whoami)` | Read access for Nginx static file serving. |
| `app/cache/` | `755` (dir) / `644` (files) | `$(whoami):$(whoami)` | Writable by Node.js process for file render cache fallback. |
| `node_modules/` | `755` (dirs) / `644` (files) | `$(whoami):$(whoami)` | Standard dependency access without blanket permissions. |
| `node_modules/.bin/` | `+x` (`chmod -R +x`) | `$(whoami):$(whoami)` | Grants execution permissions to CLI binary symlinks. |
| `.env` | `600` (`-rw-------`) | `$(whoami):$(whoami)` | Strictly isolates database credentials and JWT keys. Never `777`. |
| `database/` (SQLite) | `755` (dir) / `644` (files) | `$(whoami):$(whoami)` | Allows Node.js application process to read and write WAL journals. |

### Production Hardening Commands

```bash
sudo chown -R $(whoami):$(whoami) /var/www/<project-name>
cd /var/www/<project-name>

chmod 755 /var /var/www /var/www/<project-name>
find public -type d -exec chmod 755 {} +
find public -type f -exec chmod 644 {} +

find node_modules -type d -exec chmod 755 {} +
find node_modules -type f -exec chmod 644 {} +
chmod -R +x node_modules/.bin 2>/dev/null || true

chmod 600 .env

chmod 755 database 2>/dev/null || true
chmod 644 database/*.db 2>/dev/null || true
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

Developed by **Seip25**.
