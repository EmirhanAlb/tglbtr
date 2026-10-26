import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  build: {
    // Büyük tek dosya yerine kütüphaneleri ayrı küçük parçalara böl.
    // Hosting'in büyük dosya yükleme sorununu önler.
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('d3')) return 'vendor-d3';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react')) return 'vendor-react';
            return 'vendor';
          }
          // Büyük uygulama dosyalarını ayrı küçük parçalara böl
          if (id.includes('/components/Admin')) return 'mod-a';
          if (id.includes('/components/Panel')) return 'mod-b';
          // Pages ana koda gömülür (ayrı chunk olarak çıkarılmaz)
          if (id.includes('/components/LegalPages')) return 'mod-d';
          if (id.includes('/i18n')) return 'mod-e';
        },
      },
    },
  },
});
