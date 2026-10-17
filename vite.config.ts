import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// В разработке Vite (5173) проксирует API и загрузки на сервер (3000).
export default defineConfig({
  plugins: [react()],
  // Не встраивать шрифты в CSS как data: — их блокирует политика безопасности (CSP).
  build: { assetsInlineLimit: 0 },
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/uploads': 'http://127.0.0.1:3000',
    },
  },
});
