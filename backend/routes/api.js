import Router from "@seip/blue-birdcore/router.js"
import Validator from "@seip/blue-birdcore/validate.js"


const routerApiExample = new Router("/")

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
    ]
    res.json(users)
})

const loginSchema = {
    email: { required: true, email: true },
    password: { required: true, min: 6 }
};

const loginValidator = new Validator(loginSchema, 'es');

routerApiExample.post('/login', loginValidator.middleware(), (req, res) => {
    res.json({ message: 'Login successful' });
});



export default routerApiExample