import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to Flask backend
      '/songs': 'http://localhost:5000',
      '/practices': 'http://localhost:5000',
    }
  }
})
