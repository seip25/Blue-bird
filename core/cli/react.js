import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import chalk from "chalk";
import Config from "../config.js";

const __dirname = Config.dirname();
const props = Config.props();

/**
 * Scaffolding class for setting up React and Vite in the project.
 */
class ReactScaffold {
  /**
   * Initializes the Scaffolder with the base application directory.
   */
  constructor() {
    this.appDir = __dirname;
  }

  /**
   * Executes the installation process.
   */
  async install() {
    console.log(chalk.cyan("Initializing React + Vite setup..."));

    try {
      this.createStructure();
      this.updatePackageJson();
      this.createViteConfig();
      this.createAppjs();
      this.createMainJs();
      this.createPagesJs();
      this.updateGitIgnore();
      this.npmInstall();

      console.log(chalk.green("React scaffolding created successfully!"));
      console.log(chalk.cyan("\nNext steps:"));
      console.log(chalk.white("  1. Run (Blue Bird Server): ") + chalk.bold("npm run dev"));
      console.log(chalk.white("  2. Run (React Vite Dev): ") + chalk.bold("npm run vite:dev"));
      console.log(chalk.blue("\nBlue Bird React setup completed!"));
    } catch (error) {
      console.error(chalk.red("Fatal error during scaffolding:"), error.message);
    }
  }

  /**
   * Creates the necessary directory structure for React resources.
   */
  createStructure() {
    const dirs = [
      'frontend/resources/js/pages'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(this.appDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(chalk.gray(`Created directory: ${dir}`));
      }
    });
  }

  /**
   * Updates the project's package.json with React and Vite dependencies and scripts.
   */
  updatePackageJson() {
    const packagePath = path.join(this.appDir, 'package.json');
    if (!fs.existsSync(packagePath)) {
      console.warn(chalk.yellow("package.json not found. Initializing with npm init..."));
      execSync('npm init -y', { cwd: this.appDir });
    }

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    pkg.scripts = pkg.scripts || {};
    pkg.scripts["vite:dev"] = "vite";
    pkg.scripts["vite:build"] = "vite build";

    pkg.devDependencies = pkg.devDependencies || {};

    pkg.devDependencies["vite"] = "^7.3.1";
    pkg.devDependencies["@vitejs/plugin-react"] = "^4.3.4";

    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies["react"] = "^19.2.4";
    pkg.dependencies["react-dom"] = "^19.2.4";
    pkg.dependencies["react-router-dom"] = "^7.2.0";


    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log(chalk.gray("Updated package.json dependencies and scripts."));
  }

  /**
   * Creates the vite.config.js file with appropriate root and outDir settings.
   */
  createViteConfig() {
    const file = path.join(this.appDir, 'vite.config.js');
    if (fs.existsSync(file)) {
      console.warn(chalk.yellow("vite.config.js already exists. Skipping."));
      return;
    }

    // We use props.static.path to determine where the build goes
    const outDir = path.join(props.static.path, 'build');

    const content = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'frontend/resources/js'), 
  base: '/build/',
  build: {
    outDir: path.resolve(__dirname, '${outDir.replace(/\\/g, '/')}'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'frontend/resources/js/Main.jsx'),
    },
  },
  server: {
    origin: 'http://localhost:5173',
    strictPort: true,
    cors: true,
  },
});`;
    fs.writeFileSync(file, content);
    console.log(chalk.gray("Created vite.config.js"));
  }

  createPagesJs() {
    const file = path.join(this.appDir, 'frontend/resources/js/pages/Home.jsx');
    if (fs.existsSync(file)) {
      console.warn(chalk.yellow("Home.jsx already exists. Skipping."));
      return;
    }

    const content = `import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../blue-bird/components/Card';

export default function Home() {
  useEffect(() => {
    // Example API call to the backend
    fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "example@example.com",
        password: "myPassword123"
      }),
    })
      .then((response) => response.json())
      .then((data) => console.log('Backend response:', data))
      .catch((error) => console.error('Error fetching from backend:', error));
  }, []);

  return (
    <div
      className="bg-white text-gray-900"
    >
      <nav
        className='bg-white text-gray-900 border border-gray-200 px-4 py-4 flex justify-between items-center gap-4 sticky top-0 z-10'
      >
        <div className='font-bold text-xl text-blue-600'>
          Blue Bird
        </div>
        <div className='flex justify-between items-center gap-4'>
          <Link to="/" className='text-gray-500 hover:text-gray-900'>Home</Link>
          <Link to="/about" className='text-gray-500 hover:text-gray-900'>About</Link>
        </div>
      </nav>
      <main className='max-w-7xl mx-auto'>
        <div className='text-center p-4'>
          <header className='mb-4'>
            <h1 className='text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent mb-4'>
              Welcome to Blue Bird
            </h1>
            <p className='text-gray-500 max-w-600px mx-auto'>
              The elegant, fast, and weightless framework for modern web development.
            </p>
          </header>

          <Card title={" Documentation (Eng)"}  className='mt-8 border-none shadow-none'>
            <div className='flex gap-4 justify-center mb-8'>
              <a
                href="https://seip25.github.io/Blue-bird/en.html"
                target="_blank"
                rel="noopener noreferrer"
                className='bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-blue-400'
              >
                  Documentation(Eng)
              </a>
              <a
                href="https://seip25.github.io/Blue-bird/"
                target="_blank"
                rel="noopener noreferrer"
                className='bg-blue-50 text-blue-500 px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-blue-100  '
              >
                Documentación (Esp)

              </a>
            </div>
          </Card>

          <Card  className='mt-8 border-none shadow-none'>
            <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-1000px mx-auto'>
              <div className='p-4 rounded-lg bg-gray-50 shadow-sm'>
                <h3 className='text-blue-500 font-semibold text-xl mb-4'>Lightweight</h3>
                <p>Built with performance and simplicity in mind.</p>
              </div>
              <div className='p-4 rounded-lg bg-gray-50 shadow-sm'>
                <h3 className='text-blue-500 font-semibold text-xl mb-4'>React Powered</h3>
                <p>Full React + Vite integration .</p>
              </div>
              <div className='p-4 rounded-lg bg-gray-50 shadow-sm'>
                <h3 className='text-blue-500 font-semibold text-xl mb-4'>Express Backend</h3>
                <p>Robust and scalable backend architecture.</p>
              </div>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}


 `;
    fs.writeFileSync(file, content);
    console.log(chalk.gray("Created frontend/resources/js/pages/Home.jsx"));

    const file2 = path.join(this.appDir, 'frontend/resources/js/pages/About.jsx');
    if (fs.existsSync(file2)) {
      console.warn(chalk.yellow("About.jsx already exists. Skipping."));
      return;
    }

    const content2 = `import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div
      className="bg-white text-gray-900"
    >
      <nav
        className='bg-white text-gray-900 border border-gray-200 px-4 py-4 flex justify-between items-center gap-4 sticky top-0 z-10'
      >
        <div className='font-bold text-xl text-blue-600'>
          Blue Bird
        </div>
        <div className='flex justify-between items-center gap-4'>
          <Link to="/" className='text-gray-500 hover:text-gray-900'>Home</Link>
          <Link to="/about" className='text-gray-500 hover:text-gray-900'>About</Link>
        </div>
      </nav>
      <main className='max-w-7xl mx-auto'>
        <div className='p-4'>
          <h1 className='text-xl font-bold text-gray-900 mb-4'>About Blue Bird</h1>
          <p className='text-gray-500 leading-1.6'>
            Blue Bird is a modern framework designed to bridge the gap between backend routing and frontend interactivity.
            It provides a seamless developer experience for building fast, reactive web applications.
          </p>
          <p className='text-red-500 text-xl mt-8  '>
            Check your console JS
          </p>
        </div>
      </main>
    </div>
  );
}`;
    fs.writeFileSync(file2, content2);
    console.log(chalk.gray("Created frontend/resources/js/pages/About.jsx"));
  }

  /**
   * Creates the main entry point for React (main.jsx) which handles island hydration.
   */
  createAppjs() {
    const file = path.join(this.appDir, 'frontend/resources/js/App.jsx');
    if (fs.existsSync(file)) {
      console.warn(chalk.yellow("App.jsx already exists. Skipping."));
      return;
    }

    const content = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';

export default function App(_props) {
  const {
    component,
    props
  } = _props;

  console.log('Check props and component ')
  console.log('Component:'+component)
  console.log(props)

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

`;
    fs.writeFileSync(file, content);
    console.log(chalk.gray("Created frontend/resources/js/App.jsx"));
  }
  createMainJs() {
    const file = path.join(this.appDir, 'frontend/resources/js/Main.jsx');
    if (fs.existsSync(file)) {
      console.warn(chalk.yellow("Main.jsx already exists. Skipping."));
      return;
    }

    const content = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';


document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-react-component]').forEach(el => {
      const component = {
        component:el.dataset.reactComponent
      };
      const props = JSON.parse(el.dataset.props || '{}'); 
      const allProps={
        ...props,
        ...component
      }
        createRoot(el).render(<App {...allProps} />); 
    });   
});`;
    fs.writeFileSync(file, content);
    console.log(chalk.gray("Created frontend/resources/js/Main.jsx"));
  }



  /**
   * Ensures node_modules and other build artifacts are ignored by Git.
   */
  updateGitIgnore() {
    const file = path.join(this.appDir, '.gitignore');
    const entry = "\nnode_modules\ndist\nfrontend/public/build\n";

    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('node_modules')) {
        fs.appendFileSync(file, entry);
        console.log(chalk.gray("Updated .gitignore"));
      }
    } else {
      fs.writeFileSync(file, entry);
      console.log(chalk.gray("Created .gitignore"));
    }
  }
  npmInstall() {
    try {
      execSync('npm install', { cwd: this.appDir });
      console.log(chalk.gray("Installed dependencies"));
    } catch (error) {
      console.error(chalk.red("Error installing dependencies:"), error.message);
    }
  }
}


const scaffold = new ReactScaffold();
scaffold.install();
