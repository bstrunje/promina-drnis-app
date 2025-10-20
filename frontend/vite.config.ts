import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Uklonjen splitVendorChunkPlugin jer koristimo ručni manualChunks (inače prikazuje warning)
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared/types'),
      '@components': path.resolve(__dirname, './components')
    },
    // Pojačano dedupe za sve React-related pakete da se izbjegnu duplikati
    dedupe: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-toast', 
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-avatar',
      '@radix-ui/react-label'
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    port: 5173,
    host: true
  },
  optimizeDeps: {
    // Forsiranje pre-bundling za sve React-related pakete
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-toast',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-avatar',
      '@radix-ui/react-label'
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2015',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // Osiguraj da se React moduli tretiraju kao external dependencies
      external: () => {
        // Ne tretiramo ništa kao external - sve bundlamo
        return false;
      },
      output: {
        sourcemapExcludeSources: true,
        // Funkcijski manualChunks: zadržavamo samo stabilan "react-core" split.
        // Ostale biblioteke (i18n, @radix-ui, date-fns) prepuštamo Vite/Rollup heuristici
        // kako bismo izbjegli potencijalne probleme s redoslijedom/hoistingom u produkciji.
        manualChunks(id: string) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'react-core';
          }

          // Ostavi ostalo Vite/Rollup heuristici
          return undefined;
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