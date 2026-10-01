# Blue Bird Framework Documentation

Official documentation for the **Blue Bird Framework**, a performance-first Node.js API and web framework built for speed, multi-level caching, and streamlined developer workflows.

---

## Architectural Philosophy

Blue Bird eliminates repetitive boilerplate configuration for CORS, security headers, database pooling, and authentication flows. It delivers an opinionated, highly optimized core architecture that lets you focus on business logic.

- **Static Asset Delivery (`public/`)**: Nginx handles static file delivery directly from the filesystem in Docker deployments, offloading Node.js event loops completely.
- **HTML Render Engine (`app/views/`)**: Express renders templates dynamically using the built-in `Render` engine, enabling route-level authentication, schema validation, and multi-tier caching (memory LRU -> Redis -> disk fallback).
- **Express Static Fallback**: Express serves `public/` when running outside Docker or in development, guaranteeing that identical application code runs in development, standalone PM2, and container clusters.
- **Container Orchestration**: Preconfigured Docker Compose definitions and CLI tooling for SQLite, MySQL, and PostgreSQL with Redis caching.

---

## Project Structure

```
project/
├── app/
│   ├── index.js             # Application entrypoint
│   ├── routes/              # Route definitions
│   │   ├── api.js           # REST API routes
│   │   └── web.js           # HTML page routes using Render
│   ├── views/               # HTML and EJS templates
│   ├── jobs/                # Background queue jobs
│   └── cache/               # File render cache fallback
├── public/                  # Static assets served by Nginx / Express
│   ├── css/                 # Custom CSS
│   ├── js/                  # Custom client JavaScript
│   └── images/              # Static media
├── docker/                  # Production Dockerfile and Nginx configuration
├── docker-compose.yml       # Active container stack
├── AGENTS.md                # AI coding assistant guidebook
└── .env                     # Environment variables
```

---

## Core Capabilities

1. **HTML Render Engine (`Render`)**: Lightweight built-in templating with `{{key}}` and `{{{key}}}` interpolation, multi-level caching, and opt-in EJS support.
2. **Native JWT Authentication (`Auth`)**: HMAC-SHA256 signature and AES-256-GCM payload encryption powered exclusively by `node:crypto` (zero external dependencies).
3. **Multi-Database Wrapper (`Database`)**: Unified SQL wrapper supporting SQLite (`node:sqlite` in Node 22+ with `better-sqlite3` fallback), MySQL (`mysql2`), and PostgreSQL (`pg`) with automatic `?` placeholder conversion, transactions, and Redis query caching.
4. **Declarative Validation (`Validator`)**: Automatic schema validation returning standardized HTTP 400 responses.
5. **Background Jobs (`Queue`)**: Lightweight background queue with Redis backing and in-memory execution fallback.
6. **PM2 Ecosystem Generator**: `npx blue-bird make:ecosystem` creates cluster configuration with automatic background worker detection.
7. **Developer Diagnostics**: `npx blue-bird doctor` runs environment audits, port conflict checks, permissions analysis, and live HTTP smoke tests.

For complete API documentation, guides, and tutorials, visit the [Blue Bird Documentation Portal](https://seip25.github.io/Blue-bird/).
