import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Avviso oltre 800KB (il default è 500KB).
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Splitta le librerie pesanti in chunk separati: caricati on-demand,
        // riduce il bundle iniziale da ~1.5MB a ~600KB.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf': ['jspdf'],
          'vendor-docx': ['docx'],
          'vendor-charts': ['recharts'],
          'vendor-date': ['date-fns', 'date-fns-tz'],
          'vendor-icons': ['lucide-react'],
          'vendor-signature': ['react-signature-canvas'],
        },
      },
    },
  },
})
