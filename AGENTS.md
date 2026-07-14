# Blue Bird Framework - AI Agent Guide

This document serves as the primary manual for any AI Agent interacting with the codebase. It details the architecture of Blue Bird, its internal modules, and how features should be written or modified.

## 1. Core Architecture

Blue Bird is a framework built on **Express** for backend and **Astro** (v7.0) for frontend rendering. It saves developers from repetitive configuration, validation, security, JWT authentication, and database environment configuration out of the box.

- **Entrypoint (`index.js`)**: Initializes the server using `App` from `core/app.js` and registers the routes.
- **Backend (`backend/`)**: Application routes and logic (e.g. `backend/routes/`).
- **Frontend (`frontend/`)**: Astro project files. Source pages go in `frontend/src/pages/` and static/public assets go in `frontend/public/`.
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

Astro routes (pages) are handled automatically by Astro's file-based routing inside the `frontend/src/pages/` directory.

## 3. Astro Node Middleware Integration

Blue Bird integrates Astro as a middleware handler. This is configured in the main `App` constructor:

```javascript
import App from "@seip/blue-bird/core/app.js";
import routerApi from "./backend/routes/api.js";

const app = new App({
  routes: [routerApi],
  astro: true, // Enables Astro SSR/SSG middleware mode
});

app.run();
```

### Config Options

Astro middleware options can be customized by passing a configuration object:

```javascript
const app = new App({
  astro: {
    server: true, // Enables Astro SSR handler middleware
    serverEntry: "./frontend/dist/server/entry.mjs", // Path to server build entrypoint
    client: false, // Set to true to serve Astro client static assets
    clientDir: "./frontend/dist/client", // Path to client static build folder
    base: "/" // Base route mount path
  }
});
```

To use Astro as Express middleware, ensure your Astro configuration uses the node adapter in middleware mode:

```javascript
// frontend/astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'middleware',
  }),
});
```

## 4. Data Validation (Validator)

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

## 5. Authentication (Auth)

The system includes built-in JWT handling with AES-256-GCM encryption. The framework handles tokens via Cookies or the `Authorization` header.

### Protecting Routes

Use `Auth.protect()` as a middleware to secure routes.

```javascript
import Auth from "@seip/blue-bird/core/auth.js";

router.get("/profile", Auth.protect(), (req, res) => {
  res.json({ user: req.user });
});
```

### Login and Logout

The `Auth` class provides helpers to handle session management via cookies.

```javascript
router.post("/login", async (req, res) => {
  const user = { id: 1, name: "John" };
  await Auth.login(res, user);
  res.json({ message: "Logged in" });
});

router.post("/logout", async (req, res) => {
  await Auth.logout(res);
  res.json({ message: "Logged out" });
});
```

## 6. Performance Caching (Cache)

If an Express route involves heavy processing or database queries, utilize the `Cache` middleware to cache the REST API JSON or HTML payload.

```javascript
import Cache from "@seip/blue-bird/core/cache.js";

router.get("/stats", Cache.middleware(60), (req, res) => {
  res.json({ ok: true });
});
```

The Cache module integrates with Redis when `REDIS_HOST` is configured in the environment. If Redis is unavailable or fails, it transparently falls back to an in-memory cache system without interrupting requests.

## 7. Security (Helmet)

Helmet is **not applied globally** by default. Apply it per-router where needed:

```javascript
import App from "@seip/blue-bird/core/app.js";

const apiRouter = new Router("/api");
apiRouter.use(App.helmet());
```

## 8. Docker Compose CLI

Blue Bird features a built-in Docker Compose CLI wrapper to deploy and manage containerized development databases and production stacks.

Production deployments always use Docker for orchestration, running:
- Nginx: Serves static files directly from `frontend/dist/client/` and blocks common scanner requests (`.env`, `.git`, etc.) with fallback to Express.
- Node.js App: Managed via PM2 in cluster mode using `PM2_INSTANCES` configuration (defaults to `1`, can be set to `max`).
- MySQL: Database service.
- Redis: Memory caching and session store.

```bash
# Manage containers using blue-bird CLI
npx blue-bird docker start          # Starts production app stack (mysql, redis, app, nginx)
npx blue-bird docker start mysql    # Starts MySQL container only (useful for local development)
npx blue-bird docker start redis    # Starts Redis container only
npx blue-bird docker start dbs      # Starts both database containers (MySQL + Redis)
npx blue-bird docker stop           # Stops all running containers
npx blue-bird docker build          # Builds/rebuilds application image
npx blue-bird docker ps             # Shows status of active containers
npx blue-bird docker logs           # Tails Node.js app container logs
npx blue-bird docker mysql          # Runs interactive MySQL client terminal inside the container
npx blue-bird docker prune          # Cleans unused volumes, dangling images, and BuildKit caches
```

The container names and virtual networks are namespaced by the `TITLE` environment variable parsed from `.env` to prevent resource collisions on VPS hosts. Alternatively, PM2 and other services can be run manually in standalone server environments.

## 9. AI Development Guidelines

1. **Frontend**: Use Astro pages inside `frontend/src/pages/` (e.g. `.astro` files). Static/public assets belong in `frontend/public/`.
2. **JSON Responses**: API endpoints should return standardized responses formatted as `{ message: "..." }` or `{ data: ... }`.
3. **Magic Imports**: Stick to pure relative imports or well-configured aliases (imports natively resolve from `@seip/blue-bird/...` or relative directories like `../../`).
4. **No inline comments**: Only use JSDoc for documentation.

_This file can be retrieved by intelligent agents reading its absolute physical path during reasoning._
