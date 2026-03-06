import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';

export default function App(_props) {
  const {
    component,
    props
  } = _props;

  console.log(`Check props and component `)
  console.log(`Component: ${component}`)
  console.log(props)

  return (
    <Router>
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

