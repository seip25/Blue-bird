import Router from "@seip/blue-bird/core/router.js"
import Validator from "@seip/blue-bird/core/validate.js"
import Template from "@seip/blue-bird/core/template.js"


const routerUsers = new Router("/")

//Example swagger docs 
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *        
 */
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
 /**
 * @swagger
 * /login:
 *   post:
 *     summary: Login 
 *     tags: [Users]
 *     description: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: example@email.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login success
 *         
 *       400:
 *         description: Error  
 *       401:
 *         description: Error in request
 */
 
routerUsers.post('/login', loginValidator.middleware(), (req, res) => {
    res.json({ message: 'Login successful' });
});

//Example renderReact with customized meta Tags 
routerUsers.get("/about", (req, res) => {
    const response = Template.renderReact(res, "About", { title: "About Example title" }, {
        metaTags: {
            titleMeta: "About Title",
            descriptionMeta: "About description",
            keywordsMeta: "About,express, react, framework",
            authorMeta: "Blue Bird",
            langMeta: "es"
        }
    });
    return response;
})

routerUsers.get("*", (req, res) => {
    const response = Template.renderReact(res, "App", { title: "Example title" });
    return response;
})


export default routerUsers