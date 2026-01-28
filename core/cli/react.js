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
    pkg.devDependencies["vite"] = "^5.0.0";
    pkg.devDependencies["@vitejs/plugin-react"] = "^4.2.0";

    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies["react"] = "^18.2.0";
    pkg.dependencies["react-dom"] = "^18.2.0";
    pkg.dependencies["react-router-dom"] = "^6.21.0";

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
      input: path.resolve(__dirname, 'frontend/resources/js/main.jsx'),
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

export default function Home() {
  useEffect(() => {
    // Example API call to the backend
    fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
      .then((response) => response.json())
      .then((data) => console.log('Backend response:', data))
      .catch((error) => console.error('Error fetching from backend:', error));
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontWeight: '800', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          Welcome to Blue Bird
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
          The elegant, fast, and weightless framework for modern web development.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
        <a 
          href="https://seip25.github.io/Blue-bird/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          Documentation
        </a>
        <a 
          href="https://seip25.github.io/Blue-bird/en.html" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            backgroundColor: 'white',
            color: '#374151',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '600',
            border: '1px solid #d1d5db',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
        >
          English Docs
        </a>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '2rem',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <div style={cardStyle}>
          <h3>Lightweight</h3>
          <p>Built with performance and simplicity in mind.</p>
        </div>
        <div style={cardStyle}>
          <h3>React Powered</h3>
          <p>Full React + Vite integration with island hydration.</p>
        </div>
        <div style={cardStyle}>
          <h3>Express Backend</h3>
          <p>Robust and scalable backend architecture.</p>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  padding: '1.5rem',
  borderRadius: '0.75rem',
  border: '1px solid #e5e7eb',
  textAlign: 'left',
  backgroundColor: 'white',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
};`;
    fs.writeFileSync(file, content);
    console.log(chalk.gray("Created frontend/resources/js/pages/Home.jsx"));

    const file2 = path.join(this.appDir, 'frontend/resources/js/pages/About.jsx');
    if (fs.existsSync(file2)) {
      console.warn(chalk.yellow("About.jsx already exists. Skipping."));
      return;
    }

    const content2 = `import React from 'react'; 

export default function About() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#111827', marginBottom: '1rem' }}>About Blue Bird</h1>
      <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
        Blue Bird is a modern framework designed to bridge the gap between backend routing and frontend interactivity.
        It provides a seamless developer experience for building fast, reactive web applications.
      </p>
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
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';

export default function App(props) {
  return (
    <Router>
      <div style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        color: '#111827'
      }}>
        <nav style={{ 
          background: 'white', 
          padding: '1rem 2rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#2563eb' }}>
            Blue Bird
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link to="/" style={navLinkStyle}>Home</Link>
            <Link to="/about" style={navLinkStyle}>About</Link>
          </div>
        </nav>
        
        <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Uncomment to debug props if needed */}
          {/* <div style={{ padding: '0.5rem', background: '#ececec', fontSize: '0.75rem' }}>Props: {JSON.stringify(props)}</div> */}
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const navLinkStyle = { 
  color: '#4b5563', 
  textDecoration: 'none', 
  fontWeight: '500',
  fontSize: '0.95rem',
  transition: 'color 0.2s'
};`;
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
      const name = el.dataset.reactComponent;
      const props = JSON.parse(el.dataset.props || '{}');
        createRoot(el).render(<App {...props} />); 
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