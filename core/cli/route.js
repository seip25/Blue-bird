import path from 'path';
import fs from 'fs';
import Config from "../config.js";

const __dirname = Config.dirname();

class RouteCLI {
  /**
   * Create route 
   */
    create() {
        let nameRoute = process.argv[2];
        if (!nameRoute) {
            console.log("Please provide a route name. Usage: npm run route <route-name>");
            return;
        }
        nameRoute =nameRoute.charAt(0).toUpperCase() + nameRoute.slice(1);
        const folder= path.join(__dirname, 'backend/routes');
        if (!fs.existsSync(folder)){
            fs.mkdirSync(folder, { recursive: true });
        }
        const filePath = path.join(folder, `${nameRoute}.js`);
        if (fs.existsSync(filePath)) {
            console.log(`Route ${nameRoute} already exists.`);
            return;
        }
        const content =`import Router from "@seip/blue-bird/core/router.js" 

const router${nameRoute} = new Router("/${nameRoute.toLowerCase()}");

router${nameRoute}.get("/", (req, res) => {
    res.json({ message: "Hello from ${nameRoute} route!" });
});

export default router${nameRoute};
        `;
        fs.writeFileSync(filePath, content);
        console.log(`Route ${nameRoute} created successfully at ${filePath}`);
    }
}

const routeCLI = new RouteCLI();
routeCLI.create()