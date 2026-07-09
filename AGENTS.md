# Blue Bird Framework - AI Agent Guide

This document serves as the primary manual for any AI Agent interacting with the codebase. It details the architecture of Blue Bird, its internal modules, and how features should be written or modified.

## 1. Core Architecture

Blue Bird is a framework built on **Express** for backend and **HTML/Tailwind CSS/JS** for frontend rendering. It saves developers from repetitive configuration, validation, security, JWT authentication, HTML rendering with caching, and automatic HTML minification and compression out of the box.

- **Backend (`backend/`)**: Initializes the server using `App` from `core/app.js` and invokes routing from `backend/routes/`.
- **Frontend (`frontend/`)**: Static HTML views (`.html`) and static assets. Static files go in `frontend/public/`.
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

**For the Frontend (HTML Rendering / SEO):**
Blue Bird renders HTML templates directly using its `Template` class.

```javascript
import Router from "@seip/blue-bird/core/router.js";
import Template from "@seip/blue-bird/core/template.js";

const router = new Router("/", { seo: true });

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
const router = new Router("/", { seo: true });
```

- **Automatic Sitemap:** Dynamic `sitemap.xml` with all routes from `seo: true` routers.
- **Robots.txt:** Auto-served pointing to the generated sitemap.

## 3. HTML View Rendering (Template)

The `Template` class renders HTML files directly from the `frontend/` directory. It resolves placeholders in the HTML files (using double curly braces `{{variable}}`) populated by the options, metaTags, and application configurations.

### Standard Placeholders

The renderer automatically replaces the following standard tags:

- `{{lang}}` or `{{langHtml}}`: Active language code (defaults to `"en"`).
- `{{title}}` or `{{titleMeta}}`: Page title.
- `{{canonicalUrl}}`: Canonical page link.
- `{{description}}` or `{{descriptionMeta}}`: Meta description text.
- `{{keywords}}` or `{{keywordsMeta}}`: Meta keywords.
- `{{author}}` or `{{authorMeta}}`: Meta author.
- `{{classBody}}`: CSS class for the body wrapper.
- `{{headOptions}}`: SEO Open Graph, Twitter cards, and hot reload scripts.
- `{{linkStyles}}`: Dynamic stylesheet `<link>` tags.
- `{{scriptsHead}}`: Script tags loaded in the `<head>`.
- `{{scriptsBody}}`: Script tags loaded in the `<body>`.

Additionally, any top-level key inside `options` or `metaTags` (e.g. `{{username}}`) will be dynamically replaced in the HTML template string.

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

### Caching and Minification Options

```javascript
Template.render(res, "index", {
  cache: 60,         /** Cache TTL in seconds. Default: 60 (only active when DEBUG=false) */
  minify: true,      /** Automatically compress whitespace and remove comments. Default: true */
  cacheKey: "home",  /** Optional custom cache key */
  metaTags: { titleMeta: "Home" }
});
```

**Cache behavior:**
- `DEBUG=true` → Cache is always bypassed (reads from disk every time).
- `DEBUG=false` + `cache` > 0 → Output HTML is cached in memory for the specified duration in seconds.
- `DEBUG=false` + `cache: false` (or 0) → Bypasses caching entirely.

### Cache Management

```javascript
import Template from "@seip/blue-bird/core/template.js";

Template.clearCache();
Template.clearCache("home");
Template.getCacheKeys();
```

### Hot Reload (Development)
When `DEBUG=true` in `.env`, Blue Bird automatically:
1. Injects a hot-reload script into every rendered template.
2. Watches `frontend/` for `.html`, `.css`, and `.js` file changes.
3. Notifies connected browsers via Server-Sent Events (SSE) to reload.
4. Clears the template cache on file changes.

No configuration needed — it works automatically in debug mode.

## 4. Data Validation (Validator)

Incoming request data must be validated using `core/validate.js`, which automatically returns HTTP 400 JSON responses on error.

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

router.get("/stats", Cache.middleware(60), (req, res) => {
  res.json({ ok: true });
});

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

1. **Frontend**: Use static HTML templates inside `frontend/` (e.g. `.html` files). Standard static files belong in `frontend/public/`.
2. **JSON Responses**: API endpoints should return standardized responses formatted as `{ message: "..." }` or `{ data: ... }`.
3. **Magic Imports**: Stick to pure relative imports or well-configured aliases (imports natively resolve from `@seip/blue-bird/...` or relative directories like `../../`).
4. **SEO**: Create routers with `{ seo: true }` to auto-include routes in sitemap.xml and robots.txt.
5. **Caching & Minification**: Cache pages using `Template.render` options or route-level `Cache.middleware()`. All HTML outputs are automatically minified.
6. **No inline comments**: Only use JSDoc for documentation.

_This file can be retrieved by intelligent agents reading its absolute physical path during reasoning._
