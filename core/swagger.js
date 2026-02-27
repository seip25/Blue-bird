import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

class Swagger {

    static init(app, options) {

        const optionsJsDoc = {
            definition: {
                openapi: "3.0.0",
                info: options.info,
                servers: [
                    { url: options.url }
                ]
            },
            apis: ["./backend/routes/*.js"]
        };

        const specs = swaggerJSDoc(optionsJsDoc);

        app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));
    }
}

export default Swagger;