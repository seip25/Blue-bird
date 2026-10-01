import Router from "@seip/blue-bird/core/router.js";
import Render from "@seip/blue-bird/core/render.js";
import Auth from "@seip/blue-bird/core/auth.js";

const routerWeb = new Router("/");

routerWeb.get("/", Render.cache(300), Render.view("index"));

routerWeb.get("/about", Render.cache(300), Render.view("about"));

routerWeb.get("/dashboard", Auth.protect({ redirect: "/login" }), Render.view("dashboard"));

export default routerWeb;
