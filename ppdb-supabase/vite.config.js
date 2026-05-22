import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
  build: {
    chunkSizeWarningLimit: 1000, // naikkan limit warning ke 1000kb
    rollupOptions: {
      output: {
        manualChunks: {
          // Pisah library besar ke chunk terpisah
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
})
