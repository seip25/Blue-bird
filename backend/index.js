import App from "../core/app.js";
import routerApiExample from "./routes/api.js";
import routerFrontendExample from "./routes/frontend.js";

const app = new App({
  routes: [routerApiExample, routerFrontendExample],
  cors: [],
  middlewares: [],
  host: "http://localhost",
  port: process.env.PORT,
});

app.run();
