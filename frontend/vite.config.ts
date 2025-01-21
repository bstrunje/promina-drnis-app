import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@components': path.resolve(__dirname, './components')
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false,
      },
    },
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2015',
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true
      },
      external: ['@remix-run/router'],
    }
  }
});