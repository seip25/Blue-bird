import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import { ThemeProvider } from './blue-bird/contexts/ThemeContext.jsx';

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
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

