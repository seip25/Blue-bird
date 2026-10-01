#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import chalk from "chalk";

class RouteCLI {
  /**
   * Creates a new RESTful route file with Validation, Cache, and optional Auth.
   */
  create() {
    const rawArgs = process.argv.slice(2);
    const args = rawArgs.filter(
      (a) => a !== "route" && a !== "make:route" && !a.endsWith("route.js")
    );

    let routeName = args.find((a) => !a.startsWith("-"));
    const withAuth = args.some((a) => a === "--auth" || a === "-a");

    if (!routeName) {
      console.log(chalk.red("[ERROR] Missing route name."));
      console.log("");
      console.log("Usage:");
      console.log("  npx blue-bird make:route <name> [--auth]");
      console.log("");
      console.log("Examples:");
      console.log("  npx blue-bird make:route products");
      console.log("  npx blue-bird make:route articles --auth");
      process.exit(1);
    }

    routeName = routeName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const singularName = routeName.endsWith("s") ? routeName.slice(0, -1) : routeName;
    const pascalName = routeName.charAt(0).toUpperCase() + routeName.slice(1);
    const routerVarName = `router${pascalName}`;
    const basePath = `/${routeName}`;

    const routesFolder = path.resolve(process.cwd(), "app/routes");
    if (!fs.existsSync(routesFolder)) {
      fs.mkdirSync(routesFolder, { recursive: true });
    }

    const filePath = path.join(routesFolder, `${routeName}.js`);
    if (fs.existsSync(filePath)) {
      console.log(chalk.yellow(`[WARN] Route file '${routeName}.js' already exists at app/routes/${routeName}.js.`));
      return;
    }

    const authImport = withAuth
      ? `import Auth from "@seip/blue-bird/core/auth.js";\n`
      : "";

    const authProtect = withAuth ? `Auth.protect(), ` : "";

    const content = `import Router from "@seip/blue-bird/core/router.js";
import Validator from "@seip/blue-bird/core/validate.js";
import Cache from "@seip/blue-bird/core/cache.js";
${authImport}
const ${routerVarName} = new Router("${basePath}");

const ${singularName}Schema = {
  name: { required: true, min: 2, max: 255 },
  description: { required: false },
  price: { required: false }
};

const validate${pascalName} = new Validator(${singularName}Schema, "en");

/**
 * GET ${basePath}
 * List all items with in-memory / Redis route caching (60 seconds)
 */
${routerVarName}.get("/", Cache.middleware(60), (req, res) => {
  res.ok({ ${routeName}: [] }, "${pascalName} list retrieved successfully");
});

/**
 * GET ${basePath}/:id
 * Retrieve a single item by ID
 */
${routerVarName}.get("/:id", Cache.middleware(60), (req, res) => {
  const { id } = req.params;
  res.ok({ ${singularName}: { id } }, "${pascalName} retrieved successfully");
});

/**
 * POST ${basePath}
 * Create a new item (with validation and automatic cache invalidation)
 */
${routerVarName}.post("/", ${authProtect}validate${pascalName}.middleware(), async (req, res) => {
  const data = req.body;

  await Cache.delete("${basePath}");

  res.created({ ${singularName}: data }, "${pascalName} created successfully");
});

/**
 * PUT ${basePath}/:id
 * Update an existing item
 */
${routerVarName}.put("/:id", ${authProtect}validate${pascalName}.middleware(), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  await Cache.delete("${basePath}");
  await Cache.delete(\`${basePath}/\${id}\`);

  res.ok({ ${singularName}: { id, ...data } }, "${pascalName} updated successfully");
});

/**
 * DELETE ${basePath}/:id
 * Delete an existing item
 */
${routerVarName}.delete("/:id", ${authProtect}async (req, res) => {
  const { id } = req.params;

  await Cache.delete("${basePath}");
  await Cache.delete(\`${basePath}/\${id}\`);

  res.ok({ id }, "${pascalName} deleted successfully");
});

export default ${routerVarName};
`;

    fs.writeFileSync(filePath, content, "utf-8");
    console.log(chalk.green(`[OK] Route '${routeName}' created at app/routes/${routeName}.js`));
    console.log("");
    console.log(chalk.cyan("To register this route, import it in app/index.js:"));
    console.log(chalk.gray(`  import ${routerVarName} from "./routes/${routeName}.js";`));
    console.log(chalk.gray(`  Add ${routerVarName} to the routes array in new App({ routes: [...] })`));
  }
}

const routeCLI = new RouteCLI();
routeCLI.create();