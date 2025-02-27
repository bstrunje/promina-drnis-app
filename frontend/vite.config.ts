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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        sourcemapExcludeSources: true,
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-toast',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-avatar',
            '@radix-ui/react-label'
          ],
          'vendor-utils': ['date-fns', 'axios', 'zustand'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
          'vendor-charts': ['recharts'],
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
          
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          } else if (/woff|woff2|ttf|otf/i.test(extType)) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    }
  }
});