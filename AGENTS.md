# Blue Bird Framework - AI Agent Guide

This document serves as the primary manual for any AI Agent interacting with the codebase. It details the architecture of Blue Bird, its internal modules, and how features should be written or modified.

## 1. Core Architecture

Blue Bird is a framework built on **Express** for backend and **EJS/Tailwind CSS/JS** for frontend rendering. It saves developers from repetitive configuration, validation, security, JWT authentication, EJS rendering with caching, a layout system, internationalization (i18n), and automatic HTML minification and compression out of the box.

- **Backend (`backend/`)**: Initializes the server using `App` from `core/app.js` and invokes routing from `backend/routes/`.
- **Frontend (`frontend/`)**: EJS views (`.ejs`), locales translation dictionary files (`frontend/locales/`), and static assets. Static files go in `frontend/public/`.
- **Core (`core/`)**: The framework core. Contains wrapper classes such as `Router`, `Validator`, `Template`, `Auth`, `Cache`, etc. **DO NOT MODIFY** the core unless explicitly requested, as it could break other apps.

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

**For the Frontend (EJS Rendering / SEO):**
Blue Bird renders EJS templates wrapped in a master layout using its `Template` class.

```javascript
import Router from "@seip/blue-bird/core/router.js";
import Template from "@seip/blue-bird/core/template.js";

const router = new Router("/", { seo: true, languages: ["en", "es"] });

router.get("/", (req, res) => {
  return Template.render(res, "index", {
    metaTags: {
      titleMeta: "Home",
      descriptionMeta: "Welcome to my site"
    }
  });
});

router.get("/about", (req, res) => {
  return Template.render(res, "about", {
    metaTags: {
      titleMeta: "About Us",
      descriptionMeta: "Learn more about us"
    }
  });
});
```

**SEO (Sitemap & Robots.txt):**
When a `Router` is created with `{ seo: true }`, all `GET` routes registered on it are automatically included in the generated `/sitemap.xml` and `/robots.txt`.

```javascript
const router = new Router("/", { seo: true, languages: ["en", "es"] });
```

- **Automatic Sitemap:** Dynamic `sitemap.xml` with all routes from `seo: true` routers, including language-prefixed paths.
- **Robots.txt:** Auto-served pointing to the generated sitemap.

## 3. EJS View Rendering & Translation (Template & i18n)

The `Template` class renders EJS files from the `frontend/` directory. It uses a master layout (`frontend/layout.ejs`) to wrap child views and injects meta tags, styles, and scripts.

### EJS Master Layout (`layout.ejs`)
The layout provides the base HTML structure. It consumes EJS variables populated by the renderer:

- `<%= langHtml %>`: Current language code (e.g. `en`, `es`).
- `<%= title %>`: Page title.
- `<%= canonicalUrl %>`: Canonical page link.
- `<%= description %>`: Meta description text.
- `<%= keywords %>`: Meta keywords.
- `<%= author %>`: Meta author.
- `<%= classBody %>`: CSS class for the body wrapper.
- `<%- headOptions %>`: SEO Open Graph, Twitter cards, and hot reload scripts.
- `<%- linkStyles %>`: Dynamic stylesheet `<link>` tags.
- `<%- scriptsHead %>`: Script tags loaded in the `<head>`.
- `<%- scriptsBody %>`: Script tags loaded in the `<body>`.
- `<%- body %>`: The child template's HTML content.

### Translation & i18n
When translation is enabled (`TRANSLATE=true` in `.env` or `new App({ translate: true })`), dictionaries are loaded from `frontend/locales/*.json`. A helper function `t(key, variables)` is injected into template context:

- **EJS usage**: `<%= t('welcome_msg', { name: 'Alice' }) %>`
- **Interpolation**: Supports both `{variable}` and `{{variable}}` patterns.
- **Route Rewriting**: It intercepts paths like `/es/about` and rewrites them to `/about` internally, setting the active locale to `es` and updating `res.locals.lang`.

### Basic Rendering

```javascript
import Template from "@seip/blue-bird/core/template.js";

router.get("/", (req, res) => {
  return Template.render(res, "index", {
    metaTags: {
      titleMeta: "Home",
      descriptionMeta: "Welcome",
      keywordsMeta: "home, welcome",
      authorMeta: "Blue Bird"
    }
  });
});
```

### Caching Options

```javascript
Template.render(res, "index", {
  cache: true,       // Default: true (only active when DEBUG=false)
  cacheLife: 0,      // Seconds. 0 = never expires. Default: 0
  cacheKey: "home",  // Optional custom cache key
  metaTags: { titleMeta: "Home" }
});
```

**Cache behavior:**
- `DEBUG=true` → Cache is **always bypassed** (reads from disk every time)
- `DEBUG=false` + `cache: true` + `cacheLife: 0` → Cached forever until manually cleared
- `DEBUG=false` + `cache: true` + `cacheLife: 60` → Expires after 60 seconds
- In production, EJS compiled views are cached using `app.set('view cache', true)` in addition to the template rendered HTML cache.

### Cache Management

```javascript
import Template from "@seip/blue-bird/core/template.js";

Template.clearCache();          // Clear all cached templates
Template.clearCache("home");    // Clear specific cache key
Template.getCacheKeys();        // Returns array of all active cache keys
```

### Hot Reload (Development)
When `DEBUG=true` in `.env`, Blue Bird automatically:
1. Injects a hot-reload script into every rendered template
2. Watches `frontend/` for `.ejs`, `.html`, `.css`, `.js` file changes
3. Notifies connected browsers via Server-Sent Events (SSE) to reload
4. Clears the template cache on file changes

No configuration needed — it works automatically in debug mode.

## 4. Data Validation (Validator)

Incoming request data must be validated using `core/validate.js`, which automatically returns HTTP 400 multilingual JSON responses on error.

```javascript
import Validator from "@seip/blue-bird/core/validate.js";

const userSchema = {
  email: { required: true, email: true },
  password: { required: true, min: 8 },
  bio: { required: false },
};

const postSchema = {
  contentHtml: { required: true, xss: false },
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

router.get("/dashboard", Auth.protect({ redirect: "/login" }), (req, res) => {
    Template.render(res, "dashboard");
});

router.get("/admin", Auth.protect({ 
    cookieKey: "admin_session", 
    key: "admin" 
}), (req, res) => {
    res.json({ admin: req.admin });
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

await Auth.login(res, user, "my_session", {
    expiresIn: "7d",
    cookie: { httpOnly: true, secure: true }
});
```

## 6. Performance Caching (Cache)

If a route involves heavy processing or database queries, utilize the `Cache` middleware. It automatically caches both REST API JSON payloads (overriding `res.json`) and HTML/EJS rendered views (overriding `res.send`).

```javascript
import Cache from "@seip/blue-bird/core/cache.js";

// Caches JSON responses
router.get("/stats", Cache.middleware(60), (req, res) => {
  res.json({ ok: true });
});

// Caches EJS HTML views
router.get("/dashboard", Cache.middleware(120), (req, res) => {
  Template.render(res, "dashboard");
});
```

## 7. Security (Helmet)

Helmet is **not applied globally** by default. Apply it per-router where needed:

```javascript
import App from "@seip/blue-bird/core/app.js";

const webRouter = new Router("/web");
webRouter.use(App.helmet());
webRouter.use(App.helmet({ contentSecurityPolicy: false }));
```

## 8. AI Development Guidelines

1. **Frontend**: Use EJS templates inside `frontend/` wrapped by `frontend/layout.ejs`. Place local translation dictionary files in `frontend/locales/`. Standard static files belong in `frontend/public/`.
2. **JSON Responses**: API endpoints should return standardized responses formatted as `{ message: "..." }` or `{ data: ... }`.
3. **Magic Imports**: Stick to pure relative imports or well-configured aliases (imports natively resolve from `@seip/blue-bird/...` or relative directories like `../../`).
4. **SEO**: Create routers with `{ seo: true }` to auto-include routes in sitemap.xml and robots.txt.
5. **Caching & Minification**: Cache pages using `Template.render` options or route-level `Cache.middleware()`. All HTML outputs are automatically minified at the server level.
6. **No inline comments**: Only use JSDoc for documentation.

_This file can be retrieved by intelligent agents reading its absolute physical path during reasoning._
