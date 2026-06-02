import Router from "../../core/router.js";
import Validator from "../../core/validate.js";
import Cache from "../../core/cache.js";
import Auth from "../../core/auth.js"

const routerApiExample = new Router("/api");

routerApiExample.get("/users", (req, res) => {
  const users = [
    {
      name: "John Doe",
      email: "john.doe@example.com",
    },
    {
      name: "Jane Doe2",
      email: "jane.doe2@example.com",
    },
  ];
  res.json(users);
});

const loginSchema = {
  email: { required: true, email: true },
  password: { required: true, min: 6 },
};

const loginValidator = new Validator(loginSchema);

routerApiExample.post("/login", loginValidator.middleware(), (req, res) => {
  res.json({ message: "Login successful", body: req.body });
});

routerApiExample.get("/cache", Cache.middleware(), async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  res.json({ message: "Cache successful" });
})

routerApiExample.get("/auth_generate", async (req, res) => {
  const token = await Auth.login(res, { id: 1, name: "John Doe" })
  res.json({ message: "Auth successful", token });
})

routerApiExample.get("/auth_logout", async (req, res) => {
  await Auth.logout(res)
  res.json({ message: "Auth successful" });
})

routerApiExample.get("/auth_verify", Auth.protect(), (req, res) => {
  const userInfo = req.user
  res.json({ message: "Auth successful", user: userInfo });
})

export default routerApiExample;
