import React, { useEffect } from 'react';
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

          <Card title={" Documentation (Eng)"} className='mt-8 border-none shadow-none'>
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

          <Card className='mt-4 border-none shadow-none'>
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
