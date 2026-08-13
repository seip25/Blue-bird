# Blue Bird Framework — Documentation

Welcome to the official documentation for the **Blue Bird Framework**, a high-performance Express API framework built for speed, performance caching, and seamless developer workflows.

---

## 🕊️ The Blue Bird Philosophy

Stop wasting time configuring CORS, security headers, database connections, and authentication flows. Blue Bird provides an opinionated, highly efficient core structure allowing you to focus on writing clean business logic. Nginx handles the static frontend directly from the filesystem, Express handles the backend APIs. Includes a preconfigured Docker stack with Nginx reverse proxy, Redis cache, and PM2 cluster scaling.

---

## 🧩 Decoupled Architecture

Nginx natively serves static frontend assets and extensionless HTML pages from `frontend/`. Express owns the API layer, keeping your backend entirely focused on performance and logic.

### 1. Cross-Platform Versatility
By completely decoupling the Express backend from the HTML/JS/CSS frontend, Blue Bird empowers developers to build multi-platform applications seamlessly using a single, unified backend API:
- **Web Applications**: Static HTML/JS/CSS served at near-zero latency by Nginx.
- **Mobile Applications**: Cross-platform mobile builds using **Capacitor**, Cordova, or React Native pointing directly to the Express REST endpoints.
- **Desktop Applications**: Native desktop apps built with **Electron** or **Tauri** utilizing the same API contract.

### 2. Strong Business Logic & Separation of Concerns
Separating frontend delivery from backend processing allows each component to perform what it does best:
- **Nginx**: Dedicated to high-throughput static asset hosting, gzip compression, browser caching, and public file serving directly from the filesystem.
- **Express**: Focuses purely on request validation, session control, database transactions, caching, and core business rules without UI rendering overhead.

### 3. Lightweight Resource Footprint
Because Node.js is relieved from serving heavy static assets, memory allocation and CPU cycles are reserved exclusively for API request processing. This results in significantly lower RAM, CPU, and disk consumption, making Blue Bird exceptionally cost-effective and ultra-fast even under heavy traffic.

---

## 🐳 Built-in Orchestration

Includes a comprehensive Docker Compose CLI wrapper to bootstrap, build, stop, and clean dev and production environments with zero manual scripting.

- **Dev Environment**: Single command startup (`npx blue-bird docker dev`) bringing up Node.js with hot reload, Nginx reverse proxy, Redis cache, and MySQL / PostgreSQL database containers.
- **Production Environment**: Optimized PM2 cluster startup inside Docker with automatic process monitoring, multi-threaded CPU utilization, and rate-limiting security headers.
- **Zero Scripting Required**: Preconfigured docker-compose files automatically copied and managed by the `blue-bird` CLI tool.

---

## 🏗️ Core Architecture Overview

```
project/
├── backend/
│   └── routes/              # Express route definitions (API layer)
│       └── api.js           # Example REST API routes
├── frontend/
│   ├── css/                 # Modern Vanilla CSS stylesheets
│   ├── js/                  # Client-side JavaScript modules
│   └── index.html           # HTML pages served directly by Nginx
├── core/                    # Blue Bird framework modules (Router, Auth, Cache, Validator, Database)
├── docker/                  # Production Dockerfile and docker-compose templates
├── docker-compose.yml       # Active dev/prod environment stack
├── index.js                 # Express server startup entrypoint
└── AGENTS.md                # AI coding assistant guidebook
```

---

## 🚀 Key Framework Features

### 1. Application Server (`App`)
Initializes the framework server with default middleware, CORS, cookies, rate limiting, and optional static frontend asset serving:

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
  // Standalone Express Static Serving (Optional when not using Docker/Nginx or as fallback)
  static: {
    path: "../frontend", // relative directory to serve static files
    options: {}           // express.static options
  }
});

app.run();
```

#### Standalone Express Frontend Serving (Without Docker / Nginx)
If your application does not require Docker, Nginx, MySQL, or Redis (e.g., pure Express applications, Express + SQLite, or simple single-container Node.js setups), you can pass `static: { path: "../frontend" }` to `App`. Under the hood, `core/app.js` automatically mounts `express.static`:

```javascript
if (this.static.path) {
  this.app.use(
    express.static(path.join(__dirname, this.static.path), {
      ...this.static.options,
      setHeaders: (res) => {
        res.setHeader("X-Powered-By", "Blue Bird");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    })
  );
}
```

---

### 2. Custom Router (`Router`)
Blue Bird provides a clean wrapper around Express Routing:
```javascript
import Router from "@seip/blue-bird/core/router.js";

const routerApi = new Router("/api");

routerApi.get("/status", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

export default routerApi;
```

### 3. Schema Validation (`Validator`)
Automatic request validation returning structured `400 Bad Request` responses on errors:
```javascript
import Validator from "@seip/blue-bird/core/validate.js";

const schema = {
  email: { required: true, email: true },
  password: { required: true, min: 8 }
};

const validator = new Validator(schema, "en");

routerApi.post("/login", validator.middleware(), (req, res) => {
  res.json({ success: true });
});
```

### 4. Encrypted JWT Auth (`Auth`)
Stateless and Redis-backed session authentication using AES-256-GCM encrypted tokens. Transmitted via HTTP-Only cookies or `Authorization` headers:
```javascript
import Auth from "@seip/blue-bird/core/auth.js";

// 1. Protected API endpoint (returns 401 JSON)
routerApi.get("/profile", Auth.protect(), (req, res) => {
  res.json({ user: req.user });
});

// 2. Protected Web page with redirect
routerApi.get("/dashboard", Auth.protect({ redirect: "/login", key: "user" }), (req, res) => {
  res.send(`<h1>Welcome ${req.user.name}</h1>`);
});

// 3. User Login & Redis Session Sync
routerApi.post("/login", async (req, res) => {
  const user = { id: 1, name: "Admin" };
  await Auth.login(res, user, "auth", { expiresIn: "7d" });
  res.json({ message: "Logged in" });
});

// 4. User Logout & Redis Session Invalidation
routerApi.post("/logout", async (req, res) => {
  await Auth.logout(res, "auth", {}, req);
  res.json({ message: "Logged out" });
});

// 5. Raw Token Utilities & AES-256-GCM Encryption
const token = Auth.generateToken({ id: 1 }, process.env.JWT_SECRET, "2h");
const payload = Auth.verifyToken(token, process.env.JWT_SECRET);
const encrypted = Auth.encrypt({ secret: "1234" }, process.env.JWT_SECRET);
const decrypted = Auth.decrypt(encrypted, process.env.JWT_SECRET);
```

### 5. Transparent Redis / Memory Caching (`Cache`)
Seamless endpoint response caching and direct Redis client access. Automatically degrades to an in-memory cache if Redis is not configured or offline:
```javascript
import Cache, { getRedisClient } from "@seip/blue-bird/core/cache.js";

// 1. Automatic Route Caching Middleware (JSON or HTML)
routerApi.get("/products", Cache.middleware(60), (req, res) => {
  res.json({ products: [] });
});

// 2. Direct Redis Access for Database Query & Custom Data Caching
routerApi.get("/stats", async (req, res) => {
  const redis = getRedisClient();
  if (redis) {
    const cached = await redis.get("stats_key");
    if (cached) return res.json(JSON.parse(cached));

    const dbData = { users: 100, active: 42 };
    await redis.set("stats_key", JSON.stringify(dbData), { EX: 300 });
    return res.json(dbData);
  }
  res.json({ users: 100, active: 42 });
});
```

### 6. Multi-Database Client (`Database`)
Unified wrapper supporting **MySQL (`mysql2`)** and **PostgreSQL (`pg`)** with parameter translation, automatic pagination, transactions with rollback, and query caching:
```javascript
import { Database } from "@seip/blue-bird/core/database.js";

const db = new Database(20);

// 1. Unified SQL query using '?' syntax (translated to $1, $2 for Postgres automatically)
const user = await db.query("SELECT * FROM users WHERE id = ?", [1], "return_row");

// 2. Automatic SQL Query Pagination (count query + LIMIT/OFFSET calculation)
const paginated = await db.paginate("SELECT * FROM users WHERE status = ?", ["active"], { page: 1, limit: 10, cache: 60 });
// Returns: { data: [...], total: 100, page: 1, limit: 10, totalPages: 10 }

// 3. Atomic Database Transactions with Automatic Commit & Rollback
const userId = await db.transaction(async (tx) => {
  const id = await tx.query("INSERT INTO users (name, email) VALUES (?, ?)", ["Alice", "alice@example.com"]);
  await tx.query("INSERT INTO profiles (user_id) VALUES (?)", [id]);
  return id;
});
```

### 7. Real-Time WebSockets Engine (`WebSocketManager`)
High-performance, vanilla WebSocket server integration built on native Node.js HTTP server with room subscriptions, JWT authentication, 30s heartbeat ping/pong, and Redis Pub/Sub cluster synchronization:

```javascript
import App from "@seip/blue-bird/core/app.js";

const app = new App({ ... });

// 1. Initialize WebSocket server on route /ws with optional JWT Auth check
const ws = app.websocket({ path: "/ws", auth: true });

ws.onConnection((socket, req) => {
  console.log("Connected user:", socket.user);
  
  socket.join("chat_room");
  socket.sendJSON({ status: "connected", user: socket.user });

  socket.on("message", (raw) => {
    // Broadcast message to room (synced across PM2 cluster via Redis Pub/Sub)
    ws.broadcast({ room: "chat_room", text: raw.toString() }, "chat_room");
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

## 💻 CLI Commands Quick Reference

```bash
# Project Setup
npm install @seip/blue-bird
npx blue-bird                 # Interactive database & environment setup CLI

# Local Development
npm run dev                  # Start Express development server

# Docker CLI Tooling & Smart Queries
npx blue-bird docker dev                 # Start full containerized dev stack
npx blue-bird docker start               # Start full production stack
npx blue-bird docker stop                # Stop all containers
npx blue-bird docker build               # Build production docker image
npx blue-bird docker ps                  # Check active containers status
npx blue-bird docker logs                # View app logs

# Smart Database Queries & Schema Inspection
npx blue-bird docker mysql               # Open interactive MySQL terminal
npx blue-bird docker mysql users         # Smart query: SELECT * FROM users;
npx blue-bird docker mysql users --limit=10 --where="id > 5"
npx blue-bird docker mysql "SELECT count(*) FROM users"
npx blue-bird docker mysql tables        # List database tables
npx blue-bird docker mysql columns users # Describe table schema & columns
npx blue-bird docker psql tables         # List PostgreSQL tables

# Database Backup & Restore (.sql files saved in backups/)
npx blue-bird docker export              # Dump DB to backups/backup_YYYY-MM-DD.sql
npx blue-bird docker export my_dump.sql  # Dump DB to backups/my_dump.sql
npx blue-bird docker import              # Restore latest .sql backup from backups/
npx blue-bird docker import my_dump.sql  # Restore specific .sql backup file

# Smart Redis CLI Subcommands
npx blue-bird docker redis               # Open interactive Redis terminal
npx blue-bird docker redis monitor       # Live Redis command stream monitor
npx blue-bird docker redis keys          # List all Redis keys (keys *)
npx blue-bird docker redis keys "user:*" # List matching keys
npx blue-bird docker redis key session:123 # Get value of a specific key
npx blue-bird docker prune               # Cleanup unused docker caches & containers
```

---

## 📄 License

Distributed under the **MIT License**.
