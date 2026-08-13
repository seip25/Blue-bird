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

### 1. Custom Router (`Router`)
Blue Bird provides a clean wrapper around Express Routing:
```javascript
import Router from "@seip/blue-bird/core/router.js";

const routerApi = new Router("/api");

routerApi.get("/status", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

export default routerApi;
```

### 2. Schema Validation (`Validator`)
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

### 3. Encrypted JWT Auth (`Auth`)
Stateless AES-256-GCM encrypted tokens delivered via HTTP-Only cookies or Authorization headers:
```javascript
import Auth from "@seip/blue-bird/core/auth.js";

// Protected route
routerApi.get("/profile", Auth.protect(), (req, res) => {
  res.json({ user: req.user });
});
```

### 4. Transparent Redis / Memory Caching (`Cache`)
Seamless endpoint response caching that automatically degrades to in-memory cache if Redis is offline:
```javascript
import Cache from "@seip/blue-bird/core/cache.js";

routerApi.get("/products", Cache.middleware(60), (req, res) => {
  res.json({ products: [] });
});
```

### 5. Multi-Database Client (`Database`)
Unified wrapper supporting **MySQL (`mysql2`)** and **PostgreSQL (`pg`)** with parameter translation and query caching:
```javascript
import { Database } from "@seip/blue-bird/core/database.js";

const db = new Database(20);

// Unified SQL query using '?' syntax (translated to $1, $2 for Postgres automatically)
const user = await db.query("SELECT * FROM users WHERE id = ?", [1], "return_row");
```

---

## 💻 CLI Commands Quick Reference

```bash
# Project Setup
npm install @seip/blue-bird
npx blue-bird                 # Interactive database & environment setup CLI

# Local Development
npm run dev                  # Start Express development server

# Docker CLI Tooling
npx blue-bird docker dev     # Start full containerized dev stack
npx blue-bird docker start   # Start full production stack
npx blue-bird docker stop    # Stop all containers
npx blue-bird docker build   # Build production docker image
npx blue-bird docker ps      # Check active containers status
npx blue-bird docker logs    # View app logs
npx blue-bird docker db      # Open interactive SQL terminal
npx blue-bird docker redis   # Open interactive Redis terminal
npx blue-bird docker prune   # Cleanup unused docker caches & containers
```

---

## 📄 License

Distributed under the **MIT License**.
