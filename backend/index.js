import App from "@seip/blue-bird/core/app.js";
import routerUsers from "./routes/app.js";

const app = new App({
    routes: [routerUsers],
    cors: [],
    middlewares: [], 
    host: "http://localhost"
})


app.run()