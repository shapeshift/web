import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/v1': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
})
