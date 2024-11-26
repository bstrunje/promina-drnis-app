import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@types': path.resolve(__dirname, './src/types'),
        '@shared': path.resolve(__dirname, '../shared'),
        '@components/ui': path.resolve(__dirname, './components/ui')
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    css: {
      postcss: './postcss.config.js',
    },
    define: {
      __MODE__: JSON.stringify(mode),
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  }
})