import { execSync } from "node:child_process";

class SwaggerCli {
    install() {
        const dependencies = this.checkDependencies();
        if (dependencies.missingDependencies.length > 0) {
            console.log("Installing dependencies...");
            console.log(`Installing swagger-jsdoc...`);
            execSync(`npm install swagger-jsdoc@6.2.8`, { stdio: "inherit" });
            console.log(`Installing swagger-ui-express...`);
            execSync(`npm install swagger-ui-express@5.0.1`, { stdio: "inherit" });
        }
    }
    checkDependencies() {
        const dependencies = [
            "swagger-jsdoc",
            "swagger-ui-express"
        ];
        const missingDependencies = [];
        dependencies.forEach(dependency => {
            if (!this.checkDependency(dependency)) {
                missingDependencies.push(dependency);
            }
        });
        return {
            missingDependencies
        };
    }
    checkDependency(dependency) {
        try {
            require.resolve(dependency);
            return true;
        } catch (error) {
            return false;
        }
    }
}

const swaggerExecutor = new SwaggerCli();
swaggerExecutor.install();
