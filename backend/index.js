import App from "@seip/blue-bird/core/app.js";
import routerApiExample from "./routes/api.js";
import routerFrontendExample from "./routes/frontend.js";

/**
 * Main entry point for the Blue Bird application.
 * Initializes the App instance with routes, configuration, and starts the server.
 */
const app = new App({
  /**
   * Array of router instances to be registered in the application.
   * Each router can have its own base path.
   */
  routes: [routerApiExample, routerFrontendExample],

  /** CORS configuration. If empty, uses default settings. */
  cors: [],

  /** Global middlewares to be applied before routes. */
  middlewares: [],

  /** Base host URL for the application. */
  host: "http://localhost",

  /** Server port, defaults to environment variable or fallback in config. */
  port: process.env.PORT,
});

/**
 * Starts the application server.
 */
app.run();
