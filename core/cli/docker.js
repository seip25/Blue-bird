import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import chalk from "chalk";

/**
 * Parses the .env file to retrieve project configurations.
 * @returns {Object} Local environment variables dictionary.
 */
function getEnvVars() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (line && !line.startsWith("#") && line.includes("=")) {
        const idx = line.indexOf("=");
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        env[key] = value;
      }
    });
  }
  return env;
}

/**
 * Spawns a child process and inherits standard IO for interactive terminal sessions.
 * @param {string} command - The binary to execute.
 * @param {string[]} args - Argument list.
 * @returns {Promise<number>} Exit code of the process.
 */
function runCmd(command, args) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: "inherit", env: process.env });
    proc.on("close", (code) => {
      resolve(code || 0);
    });
  });
}

/**
 * Confirms that a docker-compose.yml file is present in the workspace directory.
 */
function checkComposeFile() {
  if (!fs.existsSync("docker-compose.yml")) {
    console.error(chalk.red("Error: docker-compose.yml not found in the current directory."));
    process.exit(1);
  }
}

/**
 * Handles the 'start' CLI command.
 * @param {string} service - Service to boot up.
 */
async function startCommand(service) {
  checkComposeFile();

  if (service === "mysql" || service === "--mysql" || service === "dev") {
    console.log(chalk.cyan("Starting MySQL container..."));
    const code = await runCmd("docker", ["compose", "up", "-d", "mysql"]);
    if (code === 0) {
      console.log(chalk.green("MySQL started."));
    } else {
      console.error(chalk.red("Error starting MySQL."));
      process.exit(1);
    }
  } else if (service === "redis" || service === "--redis") {
    console.log(chalk.cyan("Starting Redis container..."));
    const code = await runCmd("docker", ["compose", "up", "-d", "redis"]);
    if (code === 0) {
      console.log(chalk.green("Redis started."));
    } else {
      console.error(chalk.red("Error starting Redis."));
      process.exit(1);
    }
  } else if (service === "dbs" || service === "databases") {
    console.log(chalk.cyan("Starting Database containers (MySQL + Redis)..."));
    const code = await runCmd("docker", ["compose", "up", "-d", "mysql", "redis"]);
    if (code === 0) {
      console.log(chalk.green("Database containers started."));
    } else {
      console.error(chalk.red("Error starting databases."));
      process.exit(1);
    }
  } else if (service === "prod" || service === "app" || service === "--app" || !service) {
    console.log(chalk.cyan("Starting production stack (MySQL + Redis + App + Nginx)..."));
    const code = await runCmd("docker", ["compose", "--profile", "prod", "up", "-d"]);
    if (code === 0) {
      console.log(chalk.green("Production stack started."));
    } else {
      console.error(chalk.red("Error starting production stack."));
      process.exit(1);
    }
  } else {
    console.error(chalk.red(`Unknown service '${service}'. Use: mysql, redis, dbs, prod.`));
    process.exit(1);
  }
}

/**
 * Handles the 'stop' CLI command.
 * @param {string} service - Service to stop.
 */
async function stopCommand(service) {
  checkComposeFile();

  if (!service || service === "all") {
    console.log(chalk.cyan("Stopping all Blue Bird containers..."));
    await runCmd("docker", ["compose", "--profile", "prod", "down"]);
    console.log(chalk.green("All containers stopped."));
  } else if (service === "mysql" || service === "--mysql") {
    console.log(chalk.cyan("Stopping MySQL..."));
    await runCmd("docker", ["compose", "stop", "mysql"]);
    await runCmd("docker", ["compose", "rm", "-f", "mysql"]);
    console.log(chalk.green("MySQL stopped."));
  } else if (service === "redis" || service === "--redis") {
    console.log(chalk.cyan("Stopping Redis..."));
    await runCmd("docker", ["compose", "stop", "redis"]);
    await runCmd("docker", ["compose", "rm", "-f", "redis"]);
    console.log(chalk.green("Redis stopped."));
  } else if (service === "app" || service === "--app") {
    console.log(chalk.cyan("Stopping Node.js app container..."));
    await runCmd("docker", ["compose", "--profile", "prod", "stop", "app"]);
    await runCmd("docker", ["compose", "--profile", "prod", "rm", "-f", "app"]);
    console.log(chalk.green("App container stopped."));
  } else {
    console.error(chalk.red(`Unknown service '${service}'. Use: all, mysql, redis, app.`));
    process.exit(1);
  }
}

/**
 * Handles the 'build' CLI command.
 * @param {string[]} options - Build configuration options.
 */
async function buildCommand(options = []) {
  checkComposeFile();
  console.log(chalk.cyan("Building Blue Bird app Docker image..."));
  const cmdArgs = ["compose", "--profile", "prod", "build"];
  if (options.includes("--no-cache") || options.includes("-n")) {
    cmdArgs.push("--no-cache");
  }
  cmdArgs.push("app");

  const code = await runCmd("docker", cmdArgs);
  if (code === 0) {
    console.log(chalk.green("Image built successfully. Start with: npx blue-bird docker start prod"));
  } else {
    console.error(chalk.red("Build error."));
    process.exit(1);
  }
}

/**
 * Handles the 'ps' CLI command.
 */
async function psCommand() {
  checkComposeFile();
  console.log(chalk.cyan("Active Blue Bird Containers:"));
  await runCmd("docker", ["compose", "--profile", "prod", "ps"]);
}

/**
 * Handles the 'logs' CLI command.
 * @param {string} service - Service to pull logs from.
 * @param {string} followOpt - Flag for active log tailing.
 */
async function logsCommand(service, followOpt) {
  checkComposeFile();
  const follow = followOpt !== "--no-follow";
  const targetService = service === "mysql" ? "mysql" : "app";

  const cmdArgs = ["compose"];
  if (targetService === "app") {
    cmdArgs.push("--profile", "prod");
  }
  cmdArgs.push("logs", "--tail=100");
  if (follow) {
    cmdArgs.push("-f");
  }
  cmdArgs.push(targetService);

  await runCmd("docker", cmdArgs);
}

/**
 * Handles interactive shell connections into the MySQL container.
 * @param {string} userOpt - DB username.
 * @param {string} passOpt - DB password.
 * @param {string} dbOpt - DB database name.
 * @param {boolean} rootOpt - Flag for overriding database credentials to connect as root.
 */
async function mysqlCommand(userOpt, passOpt, dbOpt, rootOpt) {
  checkComposeFile();
  const env = getEnvVars();

  let dbUser = userOpt;
  let dbPass = passOpt;
  let dbName = dbOpt;

  if (rootOpt) {
    dbUser = "root";
    dbPass = env.DB_PASSWORD || "root";
  } else {
    dbUser = dbUser || env.DB_USER || "root";
    dbPass = dbPass || env.DB_PASSWORD || "root";
  }
  dbName = dbName || env.DB_NAME || "blue_bird";

  const cmdArgs = ["compose", "exec", "mysql", "mysql", `-u${dbUser}`];
  if (dbPass) {
    cmdArgs.push(`-p${dbPass}`);
  }
  if (dbName) {
    cmdArgs.push(dbName);
  }

  const targetDb = dbName ? ` (database: {dbName})` : "";
  console.log(chalk.cyan(`Connecting to MySQL shell in container as '${dbUser}'${targetDb}...`));

  const code = await runCmd("docker", cmdArgs);
  if (code !== 0) {
    console.error(chalk.yellow("Make sure the MySQL container is running: npx blue-bird docker start mysql"));
    process.exit(1);
  }
}

/**
 * Handles cleaning up and pruning unused Docker resources.
 * @param {boolean} forceOpt - Force cleaning without user confirmation.
 * @param {boolean} allOpt - Clean all unused resources.
 */
async function pruneCommand(forceOpt, allOpt) {
  if (!forceOpt) {
    console.log(chalk.yellow("Clean unused volumes, dangling images, and BuildKit cache? (Press enter to confirm, Ctrl+C to cancel)"));
    await new Promise((resolve) => process.stdin.once("data", resolve));
  }

  console.log(chalk.cyan("1/3 Cleaning orphaned Docker volumes..."));
  await runCmd("docker", ["volume", "prune", "-f"]);

  console.log(chalk.cyan("2/3 Cleaning unused Docker images..."));
  const imgArgs = ["image", "prune"];
  if (allOpt) {
    imgArgs.push("-a");
  }
  imgArgs.push("-f");
  await runCmd("docker", imgArgs);

  console.log(chalk.cyan("3/3 Cleaning BuildKit build cache..."));
  await runCmd("docker", ["builder", "prune", "-a", "-f"]);

  console.log(chalk.green("\nDocker cleanup completed successfully! Current disk usage:"));
  await runCmd("docker", ["system", "df"]);
}

/**
 * Executes PM2 commands inside the Node.js application container.
 * @param {string[]} pm2Args - Arguments to pass to PM2.
 */
async function pm2Command(pm2Args = []) {
  checkComposeFile();
  const subCommand = pm2Args[0] || "status";
  const cmdArgs = ["compose", "exec", "app", "pm2", subCommand, ...pm2Args.slice(1)];
  const code = await runCmd("docker", cmdArgs);
  if (code !== 0) {
    console.error(chalk.red("Error running PM2 command. Make sure the production stack is started."));
    process.exit(1);
  }
}

/**
 * Entry point for Blue Bird CLI Docker subcommands.
 */
async function main() {
  const env = getEnvVars();
  let projectName = env.BLUEBIRD_PROJECT_NAME;
  if (!projectName && env.TITLE) {
    projectName = env.TITLE.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  }
  if (!projectName) {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name) {
          projectName = pkg.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
        }
      } catch {}
    }
  }
  if (!projectName) {
    projectName = "bluebird";
  }
  process.env.BLUEBIRD_PROJECT_NAME = projectName;
  process.env.TITLE = projectName;

  const args = process.argv.slice(3);
  const command = args[0];

  if (!command) {
    await psCommand();
    return;
  }

  switch (command) {
    case "start":
      await startCommand(args[1]);
      break;
    case "stop":
      await stopCommand(args[1]);
      break;
    case "build":
      await buildCommand(args.slice(1));
      break;
    case "ps":
    case "status":
      await psCommand();
      break;
    case "logs":
      await logsCommand(args[1], args[2]);
      break;
    case "pm2":
      await pm2Command(args.slice(1));
      break;
    case "mysql":
    case "db": {
      let user, password, db, root = false;
      for (let i = 1; i < args.length; i++) {
        if (args[i] === "-u" || args[i] === "--user") user = args[++i];
        else if (args[i] === "-p" || args[i] === "--password") password = args[++i];
        else if (args[i] === "-d" || args[i] === "--db") db = args[++i];
        else if (args[i] === "--root") root = true;
      }
      await mysqlCommand(user, password, db, root);
      break;
    }
    case "df":
    case "disk":
      console.log(chalk.cyan("📊 Docker Disk Usage:"));
      await runCmd("docker", ["system", "df"]);
      break;
    case "prune":
    case "clean": {
      const force = args.includes("-f") || args.includes("--force");
      const all = args.includes("-a") || args.includes("--all");
      await pruneCommand(force, all);
      break;
    }
    default:
      console.log(chalk.yellow(`Unknown docker command: ${command}`));
      console.log("Available commands: start, stop, build, ps, logs, pm2, mysql/db, df/disk, prune/clean");
  }
}

main();
