#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

/**
 * Parses .env file to extract APP_URL and PORT.
 * @returns {{ domain: string, port: number, appUrl: string }}
 */
function getEnvConfig() {
  const env = { ...process.env };
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach((line) => {
      line = line.trim();
      if (line && !line.startsWith("#") && line.includes("=")) {
        const idx = line.indexOf("=");
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        env[key] = value;
      }
    });
  }

  let domain = "";
  if (env.APP_URL) {
    try {
      const parsedUrl = new URL(env.APP_URL.includes("://") ? env.APP_URL : `http://${env.APP_URL}`);
      domain = parsedUrl.hostname;
    } catch {
      domain = env.APP_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").trim();
    }
  }

  const port = parseInt(env.PORT || "3000", 10);
  return { domain, port, appUrl: env.APP_URL || "" };
}

/**
 * Generates Host Nginx reverse proxy configuration snippet.
 */
function generateNginxConfig() {
  const rawArgs = process.argv.slice(2);
  const filteredArgs = rawArgs.filter(
    (a) => a !== "nginx:conf" && a !== "nginx:host" && a !== "nginx" && !a.endsWith("nginx.js") && !a.endsWith("init.js")
  );

  const envConfig = getEnvConfig();

  let domainArg = filteredArgs.find((a) => !a.startsWith("-") && isNaN(Number(a)));
  let portArg = filteredArgs.find((a) => !isNaN(Number(a)));

  let domain = domainArg || envConfig.domain;
  let port = portArg ? parseInt(portArg, 10) : envConfig.port;

  if (!domain) {
    domain = "example.com";
    console.log(chalk.yellow("[INFO] No domain provided and APP_URL is not configured in .env. Defaulting to 'example.com'."));
  } else if (!domainArg && envConfig.domain) {
    console.log(chalk.cyan(`[INFO] Using domain '${domain}' and port ${port} resolved from .env (APP_URL / PORT).`));
    console.log(chalk.gray(`       (You can override via: npx blue-bird nginx:conf <domain> [port])\n`));
  }

  // Clean domain name (strip protocol, path, port)
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").trim();

  const nginxSnippet = `# =============================================================
# Blue Bird Host Nginx Reverse Proxy Configuration
# File: /etc/nginx/sites-available/${domain}
# =============================================================

server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    # Maximum request body size for file uploads
    client_max_body_size 50M;

    # Security: Block hidden files and scan attempts
    location ~* /\\.(env|git) {
        deny all;
        return 404;
    }

    # Reverse proxy to Blue Bird container stack
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;

        # WebSocket upgrade support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Proxy timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}`;

  console.log(chalk.bold.cyan("============================================================="));
  console.log(chalk.bold.cyan(` Host Nginx Configuration & Let's Encrypt Setup for: ${domain}`));
  console.log(chalk.bold.cyan("============================================================="));
  console.log("");
  console.log(chalk.yellow("1. Create the site configuration file on your VPS:"));
  console.log(chalk.green(`   sudo nano /etc/nginx/sites-available/${domain}`));
  console.log("");
  console.log(chalk.yellow("2. Paste the following configuration block:"));
  console.log("");
  console.log(chalk.white(nginxSnippet));
  console.log("");
  console.log(chalk.yellow("3. Enable the site configuration:"));
  console.log(chalk.green(`   sudo ln -s /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/`));
  console.log("");
  console.log(chalk.yellow("4. Test Nginx syntax:"));
  console.log(chalk.green("   sudo nginx -t"));
  console.log("");
  console.log(chalk.yellow("5. Reload Nginx to apply changes:"));
  console.log(chalk.green("   sudo systemctl reload nginx"));
  console.log("");
  console.log(chalk.yellow("6. Provision free SSL certificate with Certbot (Let's Encrypt):"));
  console.log(chalk.green(`   sudo certbot --nginx -d ${domain}`));
  console.log("");
  console.log(chalk.bold.cyan("============================================================="));
}

generateNginxConfig();
