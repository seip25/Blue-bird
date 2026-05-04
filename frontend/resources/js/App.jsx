import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './blue-bird/contexts/ThemeContext.jsx';
import Skeleton from './blue-bird/components/Skeleton.jsx';
import { LanguageProvider } from './blue-bird/contexts/LanguageContext.jsx';
import { SPAProvider } from './blue-bird/contexts/SPAContext.jsx';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

/**
 * Supported languages and default language.
 * Leave LANGUAGES empty for monolingual applications.
 */
const LANGUAGES = ["en", "es"];
const DEFAULT_LANGUAGE = "en";

/**
 * Route definitions.
 */
const ROUTES = [
  { path: "/", element: <Home /> },
  { path: "/about", element: <About /> },
];

/**
 * Generates routes for all language prefixes if LANGUAGES is defined.
 */
function generateRoutes(routes, languages = []) {
  const allRoutes = [];

  routes.forEach(({ path: routePath, element }) => {
    // Base path
    allRoutes.push(
      <Route key={routePath} path={routePath} element={element} />
    );

    // Language-prefixed paths (only if multiple languages are used)
    if (languages && languages.length > 0) {
      languages.forEach((lang) => {
        const langPath = `/${lang}${routePath === "/" ? "" : routePath}`;
        allRoutes.push(
          <Route key={langPath} path={langPath} element={element} />
        );
      });
    }
  });

  return allRoutes;
}

export default function App(_props) {
  const { lang } = _props.props;

  return (
    <ThemeProvider>
      <LanguageProvider initialLang={lang}>
        <Router>
          <SPAProvider languages={LANGUAGES} defaultLanguage={DEFAULT_LANGUAGE}>
            <Suspense fallback={<Skeleton />}>
              <Routes>
                {generateRoutes(ROUTES, LANGUAGES)}
              </Routes>
            </Suspense>
          </SPAProvider>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}
