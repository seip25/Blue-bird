import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './blue-bird/contexts/ThemeContext.jsx';
import Skeleton from './blue-bird/components/Skeleton.jsx';
import { LanguageProvider } from './blue-bird/contexts/LanguageContext.jsx'

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

export default function App(_props) {
  const {
    component,
    props
  } = _props;

  console.log(`Check props and component `)
  console.log(`Component: ${component}`)
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
}

