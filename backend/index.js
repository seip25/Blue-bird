import App from "../core/app.js";
import routerApi from "./routes/api.js";

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

  logger: false,
});

app.run();
