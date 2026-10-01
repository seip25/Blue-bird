#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

const VIEWS_DIR = path.resolve(process.cwd(), "app/views");

const rawArgs = process.argv.slice(2);
const args = rawArgs.filter(
  (a) => a !== "view" && a !== "make:view" && !a.endsWith("view.js")
);
const viewName = args.find((a) => !a.startsWith("-"));
const useEjs = rawArgs.some((a) => a === "--ejs");

if (!viewName) {
  console.log(chalk.red("[ERROR] Missing view name."));
  console.log("Usage: npx blue-bird make:view <name> [--ejs]");
  process.exit(1);
}

const cleanName = viewName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
const ext = useEjs ? ".ejs" : ".html";
const fileName = `${cleanName}${ext}`;
const filePath = path.join(VIEWS_DIR, fileName);

if (!fs.existsSync(VIEWS_DIR)) {
  fs.mkdirSync(VIEWS_DIR, { recursive: true });
}

if (fs.existsSync(filePath)) {
  console.log(chalk.yellow(`[WARN] View '${fileName}' already exists at app/views/${fileName}.`));
  process.exit(0);
}

const titleCase = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}}</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <h1>${titleCase}</h1>
  <p>{{description}}</p>
  <script src="/js/main.js" defer></script>
</body>
</html>
`;

const ejsTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <h1>${titleCase}</h1>
  <p><%= description %></p>
  <script src="/js/main.js" defer></script>
</body>
</html>
`;

const content = useEjs ? ejsTemplate : htmlTemplate;
fs.writeFileSync(filePath, content, "utf-8");

console.log(chalk.green(`[OK] View '${fileName}' created at app/views/${fileName}`));
console.log("");
console.log(chalk.cyan("To render this view in a route:"));
console.log(chalk.gray(`  import Render from "@seip/blue-bird/core/render.js";`));
console.log(chalk.gray(`  web.get("/${cleanName}", Render.view("${cleanName}"));`));
