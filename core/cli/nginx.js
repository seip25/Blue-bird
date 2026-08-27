#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

/**
 * Parses .env file to extract default PORT.
 * @returns {number}
 */
function getPortFromEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const portMatch = content.match(/^PORT\s*=\s*(\d+)/m);
    if (portMatch) {
      return parseInt(portMatch[1], 10);
    }
  }
  return 3000;
}

/**
 * Generates Host Nginx reverse proxy configuration snippet.
 */
function generateNginxConfig() {
  const args = process.argv.slice(2);
  let domain = args[1];
  let port = args[2] ? parseInt(args[2], 10) : getPortFromEnv();

  if (!domain || domain.startsWith("-")) {
    console.log(chalk.red("[ERROR] Missing domain parameter."));
    console.log("");
    console.log("Usage:");
    console.log("  npx blue-bird nginx:conf <domain> [port]");
    console.log("");
    console.log("Example:");
    console.log("  npx blue-bird nginx:conf myapp.example.com 3000");
    process.exit(1);
  }

  // Clean domain name
  domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

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
  console.log(chalk.cyan("============================================================="));
}

generateNginxConfig();
