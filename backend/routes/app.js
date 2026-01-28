import Router from "@seip/blue-bird/core/router.js"
import Validator from "@seip/blue-bird/core/validate.js"
import Template from "@seip/blue-bird/core/template.js"


const routerUsers = new Router("/")

routerUsers.get("/users", (req, res) => {
    const users = [
        {
            name: "John Doe",
            email: "john.doe@example.com",
        },
        {
            name: "Jane Doe2",
            email: "jane.doe2@example.com",
        },
    ]
    res.json(users)
})

const loginSchema = {
    email: { required: true, email: true },
    password: { required: true, min: 6 }
};

const loginValidator = new Validator(loginSchema, 'es');

routerUsers.post('/login', loginValidator.middleware(), (req, res) => {
    res.json({ message: 'Login successful' });
});


routerUsers.get("*", (req, res) => {
    const response = Template.renderReact(res, "App", { title: "Example title" });
    return response;

})


export default routerUsers