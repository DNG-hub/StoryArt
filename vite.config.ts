import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Keep backward compatibility but prefer VITE_ prefix in .env
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        global: 'globalThis'
      },
      optimizeDeps: {
        exclude: ['redis', 'pg', '@types/pg']
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // Stub out Node.js-only modules for browser compatibility
          'pg': path.resolve(__dirname, 'vite-stub-pg.js'),
          'dotenv': path.resolve(__dirname, 'vite-stub-dotenv.js'),
          'child_process': path.resolve(__dirname, 'vite-stub-child_process.js')
        }
      },
      build: {
        rollupOptions: {
          external: ['pg', '@types/pg', 'dotenv']
        }
      }
    };
});
