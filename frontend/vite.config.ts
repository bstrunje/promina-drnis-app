import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@components': path.resolve(__dirname, './components')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2015',
    // Add this to fix source map warnings
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // Add this to suppress source map warnings
  optimizeDeps: {
    exclude: ['@promina-drnis-app/shared']
  }
});