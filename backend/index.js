import App from "../core/app.js";
import routerUsers from "./routes/app.js";

const app = new App({
    routes: [routerUsers],
    cors: [],
    middlewares: [],
    port: 3000,
    host: "http://localhost"
})


app.run()