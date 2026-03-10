import React from 'react';
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
}