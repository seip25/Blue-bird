import Router from "@seip/blue-bird/core/router.js";
import Validator from "@seip/blue-bird/core/validate.js";
import Cache from "@seip/blue-bird/core/cache.js";
import Auth from "@seip/blue-bird/core/auth.js"

const routerApiExample = new Router("/api");

/* simple test route */
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
/* End simple test route */


/* Validation example */
const loginSchema = {
  email: { required: true, email: true },
  password: { required: true, min: 6 },
};

const loginValidator = new Validator(loginSchema);

routerApiExample.post("/login", loginValidator.middleware(), (req, res) => {
  res.json({ message: "Login successful", body: req.body });
});
/* End Validation example */

/* Cache example */
routerApiExample.get("/cache", Cache.middleware(), async (req, res) => {
  //in debug =false , testing /api/cache should take 2 seconds , and after that should take 0 seconds 
  await new Promise(resolve => setTimeout(resolve, 2000));
  res.json({ message: "Cache successful" });
})
/* End Cache example */

/* Auth example */
routerApiExample.get("/auth_generate", async (req, res) => {
  const token = await Auth.login(res, { id: 1, name: "John Doe" })
  /*Or use 
  const token = Auth.generateToken({ id: user.id });//to generate token
   res.cookie("auth", token,{
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    path: "/",
  });
  */
  res.json({ message: "Auth successful", token });

})

routerApiExample.get("/auth_logout", async (req, res) => {
  await Auth.logout(res)
  res.json({ message: "Auth successful" });
})

routerApiExample.get("/auth_verify", Auth.protect(), (req, res) => {
  // req.user has inject with the jwt token payload and decoded by the Auth.protect() middleware
  const userInfo = req.user
  res.json({ message: "Auth successful", user: userInfo });
})
/* End Auth example */

export default routerApiExample;
