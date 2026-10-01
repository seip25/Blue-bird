import Router from "@seip/blue-bird/core/router.js";
import Validator from "@seip/blue-bird/core/validate.js";
import Cache from "@seip/blue-bird/core/cache.js";
import Auth from "@seip/blue-bird/core/auth.js";

const routerApi = new Router("/api");

routerApi.get("/", (req, res) => {
  res.json({ api: true, message: "Blue Bird API", time: Date.now() });
});

routerApi.get("/users", (req, res) => {
  const users = [
    { name: "John Doe", email: "john.doe@example.com" },
    { name: "Jane Doe", email: "jane.doe@example.com" },
  ];
  res.json(users);
});

const loginSchema = {
  email: { required: true, email: true },
  password: { required: true, min: 6 },
};

const loginValidator = new Validator(loginSchema, "en");

routerApi.post("/login", loginValidator.middleware(), (req, res) => {
  res.json({ message: "Login successful", body: req.body });
});

routerApi.get("/cache", Cache.middleware(60), async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  res.json({ message: "Cache successful" });
});

routerApi.get("/auth_generate", async (req, res) => {
  const token = await Auth.login(res, { id: 1, name: "John Doe" }, "auth");
  res.json({ message: "Auth successful", token });
});

routerApi.get("/auth_logout", async (req, res) => {
  await Auth.logout(res, "auth", {}, req);
  res.json({ message: "Logged out" });
});

routerApi.get("/auth_verify", Auth.protect(), (req, res) => {
  res.json({ message: "Auth successful", user: req.user });
});

export default routerApi;
