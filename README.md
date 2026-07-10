# Blue Bird Framework

**High-Performance Express Framework — Built for Speed, Caching, and Visual Excellence**

![Blue Bird Logo](https://seip25.github.io/Blue-bird/blue-bird.png)

[![npm version](https://img.shields.io/npm/v/@seip/blue-bird.svg)](https://www.npmjs.com/package/@seip/blue-bird)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Introduction / Introducción

**Blue Bird** is a powerful, opinionated framework built on **Express**. It's designed to help developers build fast, scalable applications and APIs with everything pre-configured: data validation, security middlewares, GCM-encrypted JWT authentication, raw HTML template rendering with fast in-memory caching, automatic HTML minification, SEO management, hot-reload, and CLI/Docker developer workflows out of the box.

**Blue Bird** es un framework potente basado en **Express**. Está diseñado para ayudar a los desarrolladores a construir aplicaciones rápidas, APIs escalables y todo pre-configurado: validación de datos, middlewares de seguridad, autenticación JWT encriptada con GCM, renderizado de plantillas HTML crudo con caché ultra rápida en memoria, minificación HTML automática, gestión de SEO, hot-reload y flujos de trabajo con Docker y CLI integrados.

---

## 🚀 Key Features / Características Clave

- ⚡ **All-In-One**: Pre-configured Express server with JSON, URL encoding, Cookies, and CORS.
- 🚀 **Fast Rendering**: Raw HTML template rendering (`Template.render`) with in-memory caching (configurable TTL).
- 🧹 **Automatic Minification**: Compresses whitespace and strips HTML comments automatically in production.
- 🔐 **Premium Security**: AES-256-GCM encrypted JWT cookie auth, secure route filters, and built-in Helmet configurator.
- 📁 **File Uploads**: Easy Multer-based single/multiple file storage handling.
- 🔄 **SSE Hot Reload**: Automated browser hot-reloading in development (`DEBUG=true`) on file changes.
- 🐳 **Docker & PM2 Devops**: Pre-built Docker Compose/Dockerfile templates and CLI tools for zero-config dev and VPS production.

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
│   ├── routes/              # Express route files
│   │   ├── api.js           # REST API routes
│   │   └── frontend.js      # Frontend HTML template routes
│   └── index.js             # App startup and initialization
├── frontend/
│   ├── templates/           # Raw HTML template pages (.html)
│   │   ├── index.html
│   │   └── about.html
│   └── public/              # Static assets (css, js, img, fonts)
│       └── js/
│           └── tailwind.js  # Local Tailwind compiler
├── docker/
│   └── Dockerfile           # Optimized production multi-stage build file
├── docker-compose.yml       # Dev/Prod container configurations
├── AGENTS.md                # AI coding assistant guidebook
└── .env                     # App configuration (git-ignored)
```

---

## 📖 Core Modules Documentation / Documentación de Módulos

### 1. Routing & SEO (`Router`)

Do not use Express' native router. Always use Blue Bird's wrapper class:

```javascript
import Router from "@seip/blue-bird/core/router.js";

const routerApi = new Router("/api");
routerApi.get("/users", (req, res) => {
  res.json({ users: [] });
});
export default routerApi;
```

**For the Frontend (HTML Rendering / SEO):**
Instantiate a router with `{ seo: true }`. All registered GET routes are automatically added to the dynamic sitemap at `/sitemap.xml` and `/robots.txt`.

```javascript
const router = new Router("/", { seo: true });
router.get("/", (req, res) => {
  return Template.render(res, "index", {
    metaTags: {
      titleMeta: "Home",
      descriptionMeta: "Welcome to Blue Bird Framework",
    },
  });
});
```

---

### 2. HTML Template Rendering (`Template`)

Renders raw HTML files from `frontend/templates/`. Replaces double-curly placeholders `{{variable}}` with matching values from options, metaTags, or system env.

#### Standard Placeholders

- `{{lang}}`: Selected/active language code.
- `{{title}}` or `{{titleMeta}}`: Page HTML title.
- `{{canonicalUrl}}`: Canonical page URL for crawlers.
- `{{description}}`: Meta description.
- `{{keywords}}`: Meta keywords.
- `{{author}}`: Meta author.

```javascript
import Template from "@seip/blue-bird/core/template.js";

router.get("/about", (req, res) => {
  return Template.render(res, "about", {
    cache: 60, // Cache TTL in seconds (only when DEBUG=false)
    minify: true, // Automatically minifies whitespace and strips comments
    metaTags: {
      titleMeta: "About Us",
      descriptionMeta: "Learn more about us",
    },
  });
});
```

#### Cache Controls

- `DEBUG=true` -> Cache is always bypassed.
- `DEBUG=false` -> Cached in-memory for TTL duration.
- Programmatic management:
  ```javascript
  Template.clearCache(); // Clear all cache
  Template.clearCache("about"); // Clear specific cache key
  Template.getCacheKeys(); // Returns active cache keys
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

---

### 6. Security Headers (`Helmet`)

Apply security headers per-router. Preserves the framework's custom powered-by header by default:

```javascript
import App from "@seip/blue-bird/core/app.js";

const webRouter = new Router("/web");
webRouter.use(App.helmet());
```

---

## 🐳 Docker CLI Workflow

Blue Bird comes with a built-in Docker CLI wrapper that handles both local development database bootstrapping and full-stack VPS production deployments.

### Commands Syntax:

```bash
npx blue-bird docker <command> [options]
```

### Supported Actions:

- **`npx blue-bird docker start`**: Boots the production stack (Node.js App + MySQL).
- **`npx blue-bird docker start mysql`**: Boots the MySQL container only (great for local HTTP development).
- **`npx blue-bird docker stop`**: Stops all active containers.
- **`npx blue-bird docker build [--no-cache]`**: Builds or updates the Node.js production image.
- **`npx blue-bird docker ps`**: Lists running project containers and ports.
- **`npx blue-bird docker logs [app|mysql]`**: Tails logs for the specified container.
- **`npx blue-bird docker db`**: Connects into the container's interactive MySQL shell using credentials from `.env`.
- **`npx blue-bird docker prune`**: Safely clears orphaned volumes, dangling build caches, and images.

---

## 🚀 Production Deployment Options

You can deploy Blue Bird applications to production using two main workflows:

### A. Docker Container Stack (Recommended)

1. Configure `.env` with production keys,DEBUG=false and your custom `TITLE`.
2. Build the production image:
   ```bash
   npx blue-bird docker build
   ```
3. Run the container cluster:
   ```bash
   npx blue-bird docker start prod
   ```

### B. Standard PM2 / Node.js Runtime

To deploy in a standard Linux environment using PM2 process manager:

1. Install PM2 globally:
   ```bash
   npm install pm2 -g
   ```
2. Start the application under PM2:
   ```bash
   pm2 start backend/index.js --name "bluebird-app"
   ```
3. Monitor status:
   ```bash
   pm2 status
   pm2 logs
   ```

---

---

## ⚡ Hybrid SPA & Preact Integration

Blue Bird natively integrates high-performance Hybrid Single Page Application (SPA) support:
* **Server-Side:** The `Template` class intercepts SPA requests and returns only the `#blueBird-spa-content` section wrapped in an optimized JSON payload. These requests feature cleaned headers (removing strict CSP/Frame rules to minimize footprint) and are cached independently in RAM.
* **Client-Side (`blue-bird.js`):** The SPA engine intercepts local anchor link click events, plays animated *fadeOut* and *fadeIn* transitions using Anime.js, updates metadata, and injects the new HTML fragments.

### Preact Integration (Reactive Component Structure)

You can inject rich interactivity by adding Preact and HTM via Import Maps directly, without any build steps or bundlers:

#### 1. Load the Import Map in your HTML head:
```html
<head>
    <!-- ... -->
    <script type="importmap">
        {
            "imports": {
                "preact": "https://esm.sh/preact@10.19.2",
                "preact/hooks": "https://esm.sh/preact@10.19.2/hooks",
                "htm/preact": "https://esm.sh/htm@3.1.1/preact"
            }
        }
    </script>
    <script src="/js/blue-bird.js"></script>
</head>
```

#### 2. Declare the component inside the `#blueBird-spa-content` container:
```html
<main id="blueBird-spa-content">
    <div id="counter-app"></div>

    <script type="module">
        import { render } from 'preact';
        import { useState } from 'preact/hooks';
        import { html } from 'htm/preact';

        function Counter() {
            const [count, setCount] = useState(0);
            return html`
                <div class="p-6 bg-slate-900 border border-white/10 rounded-2xl">
                    <h2 class="text-lg font-bold">Preact Counter</h2>
                    <p class="text-3xl text-blue-400 font-extrabold my-2">${count}</p>
                    <button class="px-4 py-2 bg-blue-600 rounded-lg text-white font-semibold" onClick=${() => setCount(count + 1)}>
                        Increment
                    </button>
                </div>
            `;
        }

        render(html`<${Counter} />`, document.getElementById('counter-app'));
    </script>
</main>
```

When navigating between pages using the SPA engine, any scripts of type `module` inside the page body will automatically execute in the DOM, mounting and updating your Preact "interactivity islands".

---

## 📄 License / Licencia

Distributed under the **MIT License**. See `LICENSE` for more information.

Distribuido bajo la **Licencia MIT**. Mira `LICENSE` para más información.

---

<div align="center">
  <p>Made with ❤️ by <strong>Seip25</strong></p>
</div>
