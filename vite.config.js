import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'admin',
  base: '/admin/',
  build: {
    outDir: '../admin-dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3010',
      '/uploads/cms': 'http://localhost:3010'
    }
  }
});
