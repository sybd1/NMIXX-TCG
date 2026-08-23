import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'framer-motion'],
          'vendor-three': ['three'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  },
  server: {
    port: 3000,
    open: false,
    watch: {
      ignored: ['**/card-pack-image/**', '**/public/card-pack-image/**']
    }
  }
});
