

class SwaggerCli {
    install() {
        const dependencies = this.checkDependencies();
        const version = "6.2.8"
        if (dependencies.missingDependencies.length > 0) {
            console.log("Installing dependencies...");
            dependencies.missingDependencies.forEach(dependency => {
                console.log(`Installing ${dependency}...`);
                execSync(`npm install ${dependency}@${version}`, { stdio: "inherit" });
            });
        }
        const versionUiExpress = "5.0.1"
        if (dependencies.missingDevDependencies.length > 0) {
            console.log("Installing dev dependencies...");
            dependencies.missingDevDependencies.forEach(dependency => {
                console.log(`Installing ${dependency}...`);
                execSync(`npm install --save-dev ${dependency}@${versionUiExpress}`, { stdio: "inherit" });
            });
        }
        console.log("Installing swagger...");
    }
    checkDependencies() {
        const dependencies = [
            "swagger-jsdoc",
            "swagger-ui-express"
        ];
        const devDependencies = [
            "swagger-jsdoc",
            "swagger-ui-express"
        ];
        const missingDependencies = [];
        const missingDevDependencies = [];
        dependencies.forEach(dependency => {
            if (!this.checkDependency(dependency)) {
                missingDependencies.push(dependency);
            }
        });
        devDependencies.forEach(dependency => {
            if (!this.checkDependency(dependency)) {
                missingDevDependencies.push(dependency);
            }
        });
        return {
            missingDependencies,
            missingDevDependencies
        };
    }
}

const swaggerExecutor = new SwaggerCli();
swaggerExecutor.install();
