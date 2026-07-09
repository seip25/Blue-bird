import App from "@seip/blue-bird/core/app.js";
import routerApiExample from "./routes/api.js";
import routerFrontendExample from "./routes/frontend.js";

/**
 * Main entry point for the Blue Bird application.
 * Initializes the App instance with routes, configuration, and starts the server.
 */
const app = new App({
  routes: [routerApiExample, routerFrontendExample],

  cors: [],

  middlewares: [],

  host: "http://localhost",

  port: process.env.PORT,
});

app.run();
