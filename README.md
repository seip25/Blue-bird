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

When run, the interactive CLI prompts for your preferred infrastructure configuration:
- Database Selection: Choose between `none`, `mysql`, or `postgres`.
- ORM Mode: Choose between `native` driver (`mysql2` or `pg`) or `prisma` ORM.
- Credentials: Set your database name, user, password, and port (`3306` or `5432`).

The CLI intelligently copies the appropriate Docker configuration (`docker/docker-compose.mysql.yml`, `docker/docker-compose.postgres.yml`, or `docker/docker-compose.none.yml`) to your project root as `docker-compose.yml`. It also writes the environment settings (`DB_TYPE`, `DB_ORM`, `DATABASE_URL`) to `.env` and installs the required packages automatically (`mysql2`, `pg`, `prisma`, `@prisma/client`, and `@prisma/adapter-pg`). If Prisma is selected, it automatically initializes the Prisma schema for your chosen database provider.

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

Blue Bird provides a unified, multi-database client wrapper (`core/database.js`) supporting **MySQL**, **PostgreSQL**, and **Prisma ORM** with automated connection retry loops, query formatting utilities, and Redis query caching.

#### Driver & ORM Support
- **Native MySQL (`mysql2/promise`)**: High-performance connection pool for MySQL 8.0+.
- **Native PostgreSQL (`pg`)**: Connection pool for PostgreSQL 18+. When running standard queries with `connection.query(sql, params)`, the wrapper automatically converts `?` parameter placeholders into PostgreSQL `$1, $2, ...` syntax, allowing unified SQL query writing across both database engines.
- **Prisma ORM (`@prisma/client`)**: When configured (`DB_ORM="prisma"`), the `Database` class initializes `PrismaClient` using `@prisma/adapter-pg` (for Postgres) or standard native drivers. You can access the raw Prisma instance via `connection.prisma` or run raw SQL queries through `connection.query()`, which delegates to `$queryRawUnsafe()`.
- **No Database (`none`)**: If no database is configured, the wrapper disabled gracefully without crashing the server.

#### Standalone & Remote Database Configuration
You can connect to any local or remote database instance (outside Docker, such as Supabase, Neon, AWS RDS, or local services) simply by defining the `DATABASE_URL` in your `.env` file:

```env
DB_TYPE="postgres"
DB_ORM="native"
DATABASE_URL="postgresql://postgres:password@localhost:5432/blue_bird?schema=public"
# OR for MySQL:
# DATABASE_URL="mysql://root:password@localhost:3306/blue_bird"
```

#### Usage Examples

```javascript
import connection, { DB_TYPE, DB_ORM } from "@seip/blue-bird/core/database.js";

// 1. Basic SELECT query returning single row (Works for both MySQL and PostgreSQL using ? placeholders)
const user = await connection.query("SELECT * FROM users WHERE email = ?", ["test@example.com"], "return_row");

// 2. Fetch rows with 60 seconds Redis caching enabled
const stats = await connection.query("SELECT COUNT(*) as count FROM access_logs", [], { cache: 60 });

// 3. INSERT query (returns insertId for MySQL, or inserted row ID / rowCount for PostgreSQL)
const newId = await connection.query("INSERT INTO users (name) VALUES (?)", ["John"]);

// 4. Using Prisma ORM directly when DB_ORM="prisma"
if (DB_ORM === "prisma" && connection.prisma) {
  const users = await connection.prisma.user.findMany({ where: { active: true } });
}
```

---

### 8. Nginx Proxy Caching

Nginx reverse proxy is preconfigured with a page cache zone (`astro_cache`) that stores public page outputs (Astro SSR/SSG) for 10 seconds.
- **Cache Bypass:** Requests with an `auth` cookie or `Authorization` header automatically bypass the cache to ensure dynamic page outputs.
- **Disabling:** Caching can be turned off in `docker/nginx.conf` by commenting out the `proxy_cache` directives.
- **Caching API routes:** If you want Nginx to cache GET endpoints from `/api/` directly (which is much faster than Node query/redis caching), add a matching location block inside `docker/nginx.conf` before the generic `/api/` block:
  ```nginx
  location /api/cached-stats {
      limit_req zone=bluebird_limit burst=20 nodelay;
      set $upstream_target http://app:3000;
      proxy_pass $upstream_target;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;

      proxy_cache astro_cache;
      proxy_cache_valid 200 10s;
      add_header X-Cache-Status $upstream_cache_status;
  }
  ```

---

## Docker CLI Workflow

Blue Bird comes with a built-in Docker CLI wrapper that handles both local development database bootstrapping and full-stack VPS production deployments across MySQL, PostgreSQL, or no-database architectures.

### Commands Syntax:

```bash
npx blue-bird docker <command> [options]
```

### Supported Actions:

- **`npx blue-bird docker start`**: Boots the production stack (Node.js App + Nginx + Database + Redis).
- **`npx blue-bird docker start db`** (or `postgres` / `mysql`): Boots the configured database container only (great for local development outside Docker).
- **`npx blue-bird docker start redis`**: Boots the Redis container only.
- **`npx blue-bird docker start dbs`**: Boots both database containers (configured DB + Redis).
- **`npx blue-bird docker stop`**: Stops all active project containers.
- **`npx blue-bird docker build [--no-cache]`**: Builds or updates the Node.js production image.
- **`npx blue-bird docker ps`**: Lists running project containers and ports.
- **`npx blue-bird docker logs [app|db|postgres|mysql]`**: Tails logs for the specified container.
- **`npx blue-bird docker pm2 [args]`**: Runs PM2 commands inside the Node.js application container (e.g. `status`, `monit`, `reload all`).
- **`npx blue-bird docker db`** (or `psql` / `mysql`): Connects into the container's interactive database shell (`psql` for PostgreSQL, `mysql` for MySQL) using credentials from `.env`.
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
