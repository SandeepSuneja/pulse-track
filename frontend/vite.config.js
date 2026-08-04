import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin proxy for Firebase Auth helper (needed if redirect sign-in is used).
    proxy: {
      '/__/auth': {
        target: 'https://pulse-track-3d1b5.firebaseapp.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
