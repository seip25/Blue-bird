import React, { useEffect } from 'react'; 

export default function Home() {
  useEffect(() => {
    // Example API call to the backend
    fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email:"example@example.com",
        password: "myPassword123"
      }),
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
};