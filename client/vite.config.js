import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: { environment: 'jsdom', globals: true },
  server: {
    port: 5173,
    // El navegador habla solo con Vite; Vite reenvía /api al servidor Express.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
