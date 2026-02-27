import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

class Swagger {

    static init(app, optionsParam = {}) {
        const options = {
            ...optionsParam,
            ...{
                info: {
                    title: "Blue Bird API",
                    version: "1.0.0",
                    description: "Blue Bird Framework API Documentation"
                },
                url: "http://localhost:3000"
            }
        }
        const optionsJsDoc = {
            definition: {
                openapi: "3.0.0",
                info: options.info,
                servers: [
                    { url: options.url }
                ]
            },
            apis: ["./routes/*.js"]
        };

        const specs = swaggerJSDoc(optionsJsDoc);

        app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));
    }
}

export default Swagger;