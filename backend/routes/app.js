import Router from "../../_core/router.js"
import Validator from "../../_core/validate.js"
import Template from "../../_core/template.js"


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