import App from "@seip/blue-bird/core/app.js";
import routerApi from "./backend/routes/api.js";

/**
 * Main entry point for the Blue Bird application.
 * Initializes the App instance with routes, configuration, and starts the server.
 */
const app = new App({
  routes: [routerApi],

  cors: [],

  middlewares: [],

  host: "http://localhost",

  port: process.env.PORT,

  logger: true, //In production, set this to false to disable logging and stop writing to Redis

  astro: {
    server: true,
    serverEntry: "./frontend/dist/server/entry.mjs",
    client: true,
    clientDir: "./frontend/dist/client",
    base: "/",
  },
});

app.run();
