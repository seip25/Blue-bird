import React from 'react';
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
});