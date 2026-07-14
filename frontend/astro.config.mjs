import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = loadEnv(
  process.env.NODE_ENV ?? 'development',
  resolve(__dirname, '..'),
  '',
);

const apiPort = env.PORT || '3000';
const apiHost = (env.HOST || 'localhost').replace(/^["']|["']$/g, '');
const apiTarget = `http://${apiHost}:${apiPort}`;

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'middleware',
  }),
  vite: {
    envDir: resolve(__dirname, '..'),
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  },
});
