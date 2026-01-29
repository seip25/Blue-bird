import path from "node:path";
import fs from "node:fs";
import Config from "../config.js"; 

const __dirname = Config.dirname();

class ComponentCLI {
  /**
   * Create component react
   * @return {void}
   * /
   */

  create() {
    const folder = path.join(process.cwd(), "frontend/resources/components");
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    let nameComponent =`Component-${Math.random().toString(36).substring(7)}`;
    const nameParam = process.argv[2];
    if (nameParam.length > 0 && typeof nameParam === "string") {
        nameComponent = nameParam;
        nameComponent = nameComponent.charAt(0).toUpperCase() + nameComponent.slice(1);
    }
    const filePath = path.join(folder, `${nameComponent}.jsx`);
    const content = `import React from 'react';
        
export default function ${nameComponent}() {
    return (
        <div>
            <h1>${nameComponent} Component</h1>
        </div>
    );
}
        `;
    fs.writeFileSync(filePath, content);
    console.log(`Component ${nameComponent} created at ${filePath}`);
  }
}

const componentCLI = new ComponentCLI();
componentCLI.create();
