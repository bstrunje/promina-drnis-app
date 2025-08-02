import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared/types'),
      '@components': path.resolve(__dirname, './components')
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3001',
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
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // Drži React, React-DOM i sve React-related biblioteke zajedno
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || 
                id.includes('@radix-ui') || id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'vendor-react';
            }
            if (id.includes('date-fns') || id.includes('axios') || id.includes('zustand')) {
              return 'vendor-utils';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            // Ostali vendor paketi
            return 'vendor-misc';
          }
          
          // Aplikacijski chunks
          if (id.includes('/src/')) {
            if (id.includes('/pages/') || id.includes('/components/pages/')) {
              return 'app-pages';
            }
            if (id.includes('/components/')) {
              return 'app-components';
            }
            if (id.includes('/services/') || id.includes('/api/')) {
              return 'app-services';
            }
            if (id.includes('/stores/') || id.includes('/hooks/')) {
              return 'app-state';
            }
            if (id.includes('/utils/') || id.includes('/helpers/')) {
              return 'app-utils';
            }
          }
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