import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, 'frontend/resources/js'),
  base: '/build/',
  build: {
    outDir: path.resolve(__dirname, 'frontend/public/build'),
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
});