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
      this.createHeaderJs();
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
      'frontend/resources/js/pages',
      'frontend/resources/js/components'
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
    pkg.dependencies["@tailwindcss/vite"] = "^4.2.2";
    pkg.dependencies["tailwindcss"] = "^4.2.2";


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
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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

    const content = ` import React, { useEffect } from 'react';
    import Card from '../blue-bird/components/Card';
    import Header from '../components/Header';
    import { useLanguage } from '../blue-bird/contexts/LanguageContext';
    import Typography from '../blue-bird/components/Typography';
    
    export default function Home() {
      const { t } = useLanguage();
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
          className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 min-h-screen"
        >
          <Header />
          <main className='max-w-7xl mx-auto'>
            <div className='text-center p-4'>
              <header className='mb-8 mt-8'>
                <Typography variant='h1' className='text-4xl font-extrabold tracking-tight lg:text-5xl text-slate-900 dark:text-slate-100 mb-4'>
                  {t("home_page.title")}
                </Typography>
                <Typography className='text-xl text-slate-500 dark:text-slate-400 max-w-[600px] mx-auto'>
                  {t("home_page.description")}
                </Typography>
              </header>
    
              <div className='flex gap-4 justify-center mb-12'>
                <a
                  href="https://seip25.github.io/Blue-bird/en.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className='inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 dark:bg-slate-100 text-slate-50 dark:text-slate-900 hover:bg-slate-900/90 dark:hover:bg-slate-100/90 h-10 px-4 py-2'
                >
                  Documentation (Eng)
                </a>
                <a
                  href="https://seip25.github.io/Blue-bird/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className='inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-4 py-2'
                >
                  Documentación (Esp)
                </a>
              </div>
    
              <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1000px] mx-auto text-left'>
                <Card title={t("home_page.lightweight")}>
                  <Typography className="text-sm text-slate-500 dark:text-slate-400">
                    {t("home_page.lightweightDescription")}
                  </Typography>
                </Card>
                <Card title={t("home_page.reactPowered")}>
                  <Typography className="text-sm text-slate-500 dark:text-slate-400">
                    {t("home_page.reactPoweredDescription")}
                  </Typography>
                </Card>
                <Card title={t("home_page.expressBackend")}>
                  <Typography className="text-sm text-slate-500 dark:text-slate-400">
                    {t("home_page.expressBackendDescription")}
                  </Typography>
                </Card>
              </div>
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
    import Header from '../components/Header';
    import { useLanguage } from '../blue-bird/contexts/LanguageContext';
    
    import Card from '../blue-bird/components/Card';
    import Typography from '../blue-bird/components/Typography'
    
    export default function About() {
      const { t } = useLanguage();
      return (
        <div
          className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 min-h-screen"
        >
          <Header />
          <main className='max-w-3xl mx-auto mt-8 p-4'>
            <Card>
              <Typography variant='h1' className='text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4'>
                {t("about_page.title")}
              </Typography>
              <Typography className='text-slate-500 dark:text-slate-400 leading-7'>
                {t("about_page.description")}
              </Typography>
              <div className='mt-8 pt-4 border-t border-slate-200 dark:border-slate-800'>
                <Typography className='text-sm text-red-500 font-medium'>
                  {t("about_page.check_your_console")}
                </Typography>
              </div>
            </Card>
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

    const content = `import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './blue-bird/contexts/ThemeContext.jsx';
import Skeleton from './blue-bird/components/Skeleton.jsx';
import { LanguageProvider } from './blue-bird/contexts/LanguageContext.jsx';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

export default function App(_props) {
  const {
    component,
    props
  } = _props;

  console.log('Check props and component ')
  console.log('Component:'+component)
  console.log(props)

  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <Suspense fallback={<Skeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Suspense>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}`;
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

  createHeaderJs() {
    const file = path.join(this.appDir, 'frontend/resources/js/components/Header.jsx');
    if (fs.existsSync(file)) {
      console.warn(chalk.yellow("Header.jsx already exists. Skipping."));
      return;
    }

    const content = `import { Link } from "react-router-dom";
import { useState } from "react";
import Button from "../blue-bird/components/Button";
import { useLanguage } from "../blue-bird/contexts/LanguageContext";
import { useTheme } from "../blue-bird/contexts/ThemeContext";

export default function Header() {
    const { t, setLang } = useLanguage();
    const { changeTheme } = useTheme();
    const [emojiTheme, setEmojiTheme] = useState("🌞");

    const changeThemeEmoji = () => {
        if (emojiTheme === "🌞") {
            setEmojiTheme("🌙");
            changeTheme("dark");
        } else {
            setEmojiTheme("🌞");
            changeTheme("light");
        }
    }

    return (
        <header>
            <nav className='bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-slate-800 px-4 py-4 flex justify-between items-center gap-4 sticky top-0 z-10'>
                <div className='font-bold text-xl text-slate-900 dark:text-slate-100'>Blue Bird</div>
                <div className='flex justify-between items-center gap-4'>
                    <div className="flex justify-between items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => setLang("es")}>ES</Button>
                        <Button variant="outline" size="sm" onClick={() => setLang("en")}>EN</Button>
                        <Button variant="ghost" size="icon" onClick={changeThemeEmoji}>{emojiTheme}</Button>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                        <Link to="/" className='text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors'>{t("home")}</Link>
                        <Link to="/about" className='text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors'>{t("about")}</Link>
                    </div>
                </div>
            </nav>
        </header>
    );
}`;
    fs.writeFileSync(file, content);
    console.log(chalk.gray("Created frontend/resources/js/components/Header.jsx"));
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
