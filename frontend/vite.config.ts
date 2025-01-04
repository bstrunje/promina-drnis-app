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
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2015',
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true
      }
    }
  }
});