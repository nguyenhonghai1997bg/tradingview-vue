import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  optimizeDeps: {
    include: ['axios', 'lightweight-charts'], // Explicitly include dependencies
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://iboard-api.ssi.com.vn', // Thay bằng URL API thực tế (config.dnse_api_url)
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Loại bỏ tiền tố /api
      },
    },
  },
})
