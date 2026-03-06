import React from 'react'; 
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';

export default function App(_props) {
  const {
    component,
    props
  } = _props;
  
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
};