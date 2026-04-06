# Blue Bird Framework - AI Agent Guide

This document serves as the primary manual for any AI Agent interacting with the codebase. It details the architecture of Blue Bird, its internal modules, and how features should be written or modified.

## 1. Core Architecture

Blue Bird is a full-stack framework built on **Express (Backend)** and **React + Vite (Frontend)**. It is designed to save developers from repetitive configuration, packing validation, security, authentication (JWT), and multi-language support (i18n) out of the box.

- **Backend (`backend/`)**: Initializes the server using `App` from `core/app.js` and invokes routing from `backend/routes/`.
- **Frontend (`frontend/`)**: A React SPA handled by Vite. Default components and assets live in `frontend/resources/js/`.
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

**For the Frontend (React Rendering / SEO):**
Blue Bird injects the SPA using its `Template` class.

```javascript
import Template from "@seip/blue-bird/core/template.js";

// Render the entire App (SPA fallback)
router.get("*", (req, res) => {
  return Template.renderReact(res, "App", { title: "App Title" });
});

// SEO Routing (Meta tag SSR before React mounts)
router.seo(
  [
    {
      path: "/",
      component: "Home",
      es: {
        title: "Inicio",
        desc: "Bienvenido",
        keywords: "inicio, bienvenido",
      },
      en: { title: "Home", desc: "Welcome", keywords: "home, welcome" },
    },
  ],
  { languages: ["es", "en"], defaultLanguage: "es" },
);
```

## 3. Data Validation (Validator)

Incoming request data must be validated using `core/validate.js`, which automatically returns HTTP 400 multilingual JSON responses on error.

```javascript
import Validator from "@seip/blue-bird/core/validate.js";

const userSchema = {
  email: { required: true, email: true },
  password: { required: true, min: 8 },
  bio: { required: false }, // *XSS mitigation is applied to all strings by default!
};

// If you need raw HTML without sanitization, disable XSS explicitly.
const postSchema = {
  contentHtml: { required: true, xss: false },
};

const validateUser = new Validator(userSchema, "en");

routerApi.post("/users", validateUser.middleware(), (req, res) => {
  // Reaching here means data is safe and valid
  res.json({ success: true });
});
```

## 4. Authentication (Auth)

The system includes built-in JWT handling. The framework assumes tokens are passed via Cookies or the `Authorization` header.

```javascript
import Auth from "@seip/blue-bird/core/auth.js";

// Protect an API route (returns 401 if failed):
router.get("/profile", Auth.protect(), (req, res) => {
    // The user payload is attached to req.user
    res.json({ user: req.user });
});

// Protect a React route (redirects to login):
router.get("/dashboard", Auth.protect({ redirect: "/login" }), (req, res) => { ... });
```

## 5. Performance Coaching (Cache)

If a route involves heavy processing or repetitive DB queries, utilize the in-memory `Cache` middleware.

```javascript
import Cache from "@seip/blue-bird/core/cache.js";

// Cache this response for 60 seconds
router.get("/stats", Cache.middleware(60), (req, res) => {
  // Only executed once every 60s
  res.json({ ok: true });
});
```

## 6. AI Development Guidelines

1. **Frontend**: Components must be Functional React components, leveraging Tailwind CSS. Avoid inline styles. Reuse components from `blue-bird/components/` (e.g., Card, Button, Input) if available.
2. **JSON Responses**: API endpoints should return standardized responses formatted as `{ message: "..." }` or `{ data: ... }`.
3. **i18n**: Check the `useLanguage` hook provided in React for multi-language components; avoid hardcoding display strings when localization is active.
4. **Magic Imports**: Stick to pure relative imports or well-configured aliases (imports natively resolve from `@seip/blue-bird/...` or relative directories like `../../`).

_This file can be retrieved by intelligent agents reading its absolute physical path during reasoning._
